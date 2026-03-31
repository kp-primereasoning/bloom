"""
Bloom Infrastructure Stack — all AWS resources in one CDK stack.

Resources created:
  - VPC (2 AZs, public + private subnets, 1 NAT gateway)
  - RDS PostgreSQL 15 (db.t3.micro, private subnet)
  - Secrets Manager (DB credentials, JWT secret)
  - ECR repository (bloom-api Docker images)
  - App Runner service (API, pulls from ECR, VPC connector to RDS)
  - Cognito User Pool + App Client
  - S3 bucket (delivery photos)
  - Lambda + CloudWatch Events rule (daily delivery generation)
"""

import aws_cdk as cdk
from aws_cdk import (
    Stack,
    Duration,
    RemovalPolicy,
    CfnOutput,
    aws_ec2 as ec2,
    aws_rds as rds,
    aws_secretsmanager as secretsmanager,
    aws_ecr as ecr,
    aws_iam as iam,
    aws_cognito as cognito,
    aws_s3 as s3,
    aws_lambda as _lambda,
    aws_events as events,
    aws_events_targets as targets,
    aws_logs as logs,
    aws_apprunner as apprunner,
    aws_cloudwatch as cloudwatch,
    aws_cloudwatch_actions as cw_actions,
    aws_sns as sns,
)
from constructs import Construct


class BloomStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # =====================================================================
        # VPC — 2 AZs, public + private subnets, 1 NAT gateway
        # =====================================================================
        vpc = ec2.Vpc(
            self,
            "BloomVpc",
            max_azs=2,
            nat_gateways=1,
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24,
                ),
                ec2.SubnetConfiguration(
                    name="Private",
                    subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidr_mask=24,
                ),
            ],
        )

        # =====================================================================
        # Security Groups
        # =====================================================================
        db_sg = ec2.SecurityGroup(self, "DbSg", vpc=vpc, description="RDS PostgreSQL")
        api_sg = ec2.SecurityGroup(self, "ApiSg", vpc=vpc, description="App Runner VPC connector")
        lambda_sg = ec2.SecurityGroup(self, "LambdaSg", vpc=vpc, description="Lambda delivery gen")

        db_sg.add_ingress_rule(api_sg, ec2.Port.tcp(5432), "App Runner -> RDS")
        db_sg.add_ingress_rule(lambda_sg, ec2.Port.tcp(5432), "Lambda -> RDS")

        # =====================================================================
        # Secrets Manager — DB credentials + JWT secret
        # =====================================================================
        db_secret = secretsmanager.Secret(
            self,
            "DbSecret",
            secret_name="bloom/prod/database",
            generate_secret_string=secretsmanager.SecretStringGenerator(
                secret_string_template='{"username":"bloom_admin"}',
                generate_string_key="password",
                exclude_punctuation=True,
                password_length=32,
            ),
        )

        jwt_secret = secretsmanager.Secret(
            self,
            "JwtSecret",
            secret_name="bloom/prod/jwt-secret",
            generate_secret_string=secretsmanager.SecretStringGenerator(
                exclude_punctuation=True,
                password_length=64,
            ),
        )

        # =====================================================================
        # RDS PostgreSQL 15 — db.t3.micro, private subnet
        # =====================================================================
        db_instance = rds.DatabaseInstance(
            self,
            "BloomDb",
            engine=rds.DatabaseInstanceEngine.postgres(
                version=rds.PostgresEngineVersion.VER_15,
            ),
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.T3, ec2.InstanceSize.MICRO
            ),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
            ),
            security_groups=[db_sg],
            credentials=rds.Credentials.from_secret(db_secret),
            database_name="bloom",
            allocated_storage=20,
            max_allocated_storage=50,
            backup_retention=Duration.days(7),
            deletion_protection=True,
            removal_policy=RemovalPolicy.RETAIN,
            publicly_accessible=False,
            storage_encrypted=True,
        )

        # =====================================================================
        # ECR Repository
        # =====================================================================
        ecr_repo = ecr.Repository(
            self,
            "BloomApiRepo",
            repository_name="bloom-api",
            removal_policy=RemovalPolicy.RETAIN,
            lifecycle_rules=[
                ecr.LifecycleRule(max_image_count=10, description="Keep last 10 images")
            ],
        )

        # =====================================================================
        # Cognito User Pool
        # =====================================================================
        user_pool = cognito.UserPool(
            self,
            "BloomUserPool",
            user_pool_name="bloom-users",
            self_sign_up_enabled=True,
            sign_in_aliases=cognito.SignInAliases(email=True),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
                require_symbols=False,
            ),
            account_recovery=cognito.AccountRecovery.EMAIL_ONLY,
            removal_policy=RemovalPolicy.RETAIN,
        )

        user_pool_client = user_pool.add_client(
            "BloomWebClient",
            user_pool_client_name="bloom-web",
            auth_flows=cognito.AuthFlow(user_password=True, user_srp=True),
            id_token_validity=Duration.hours(8),
            access_token_validity=Duration.hours(8),
            refresh_token_validity=Duration.days(30),
            o_auth=cognito.OAuthSettings(
                flows=cognito.OAuthFlows(authorization_code_grant=True, implicit_code_grant=True),
                scopes=[
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.PROFILE,
                    cognito.OAuthScope.PHONE,
                    cognito.OAuthScope.COGNITO_ADMIN,
                ],
                callback_urls=[
                    "https://app.blooms.now/auth/callback",
                    "http://localhost:5173/auth/callback",
                ],
                logout_urls=[
                    "https://app.blooms.now",
                    "http://localhost:5173",
                ],
            ),
            supported_identity_providers=[
                cognito.UserPoolClientIdentityProvider.COGNITO,
                cognito.UserPoolClientIdentityProvider.GOOGLE,
            ],
        )

        # =====================================================================
        # S3 Bucket — delivery photos
        # =====================================================================
        photos_bucket = s3.Bucket(
            self,
            "DeliveryPhotos",
            bucket_name=f"bloom-delivery-photos-{self.account}",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.GET, s3.HttpMethods.PUT],
                    allowed_origins=[
                        "https://app.blooms.now",
                        "https://blooms.now",
                        "http://localhost:5173",
                    ],
                    allowed_headers=["*"],
                    max_age=3600,
                )
            ],
        )

        # =====================================================================
        # App Runner — FastAPI backend (L1 CfnService, no alpha dependency)
        # =====================================================================

        # IAM role for App Runner to pull from ECR
        apprunner_access_role = iam.Role(
            self,
            "AppRunnerAccessRole",
            assumed_by=iam.ServicePrincipal("build.apprunner.amazonaws.com"),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSAppRunnerServicePolicyForECRAccess"
                )
            ],
        )

        # IAM role for the running App Runner instance
        apprunner_instance_role = iam.Role(
            self,
            "AppRunnerInstanceRole",
            assumed_by=iam.ServicePrincipal("tasks.apprunner.amazonaws.com"),
        )
        db_secret.grant_read(apprunner_instance_role)
        jwt_secret.grant_read(apprunner_instance_role)
        photos_bucket.grant_read_write(apprunner_instance_role)
        apprunner_instance_role.add_to_policy(
            iam.PolicyStatement(
                actions=["ses:SendEmail", "ses:SendRawEmail"],
                resources=["*"],
            )
        )
        apprunner_instance_role.add_to_policy(
            iam.PolicyStatement(
                actions=["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
                resources=["*"],
            )
        )

        # VPC Connector so App Runner can reach RDS in private subnet
        private_subnets = vpc.select_subnets(subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS)
        vpc_connector = apprunner.CfnVpcConnector(
            self,
            "ApiVpcConnector",
            subnets=private_subnets.subnet_ids,
            security_groups=[api_sg.security_group_id],
            vpc_connector_name="bloom-api-vpc",
        )

        # App Runner service
        # NOTE: First deploy requires an image in ECR. Push one first (see DEPLOY.md).
        api_service = apprunner.CfnService(
            self,
            "BloomApi",
            service_name="bloom-api",
            source_configuration=apprunner.CfnService.SourceConfigurationProperty(
                authentication_configuration=apprunner.CfnService.AuthenticationConfigurationProperty(
                    access_role_arn=apprunner_access_role.role_arn,
                ),
                auto_deployments_enabled=True,
                image_repository=apprunner.CfnService.ImageRepositoryProperty(
                    image_identifier=f"{ecr_repo.repository_uri}:latest",
                    image_repository_type="ECR",
                    image_configuration=apprunner.CfnService.ImageConfigurationProperty(
                        port="8080",
                        runtime_environment_variables=[
                            apprunner.CfnService.KeyValuePairProperty(name="ENVIRONMENT", value="production"),
                            apprunner.CfnService.KeyValuePairProperty(name="AWS_REGION", value="us-east-1"),
                            apprunner.CfnService.KeyValuePairProperty(name="USE_COGNITO", value="true"),
                            apprunner.CfnService.KeyValuePairProperty(name="USE_AWS_SECRETS", value="true"),
                            apprunner.CfnService.KeyValuePairProperty(name="USE_CLOUDWATCH", value="true"),
                            apprunner.CfnService.KeyValuePairProperty(name="COGNITO_USER_POOL_ID", value=user_pool.user_pool_id),
                            apprunner.CfnService.KeyValuePairProperty(name="COGNITO_CLIENT_ID", value=user_pool_client.user_pool_client_id),
                            apprunner.CfnService.KeyValuePairProperty(name="COGNITO_REGION", value="us-east-1"),
                            apprunner.CfnService.KeyValuePairProperty(name="S3_BUCKET_NAME", value=photos_bucket.bucket_name),
                            apprunner.CfnService.KeyValuePairProperty(name="S3_REGION", value="us-east-1"),
                            apprunner.CfnService.KeyValuePairProperty(name="SES_FROM_EMAIL", value="noreply@bloom.com"),
                            apprunner.CfnService.KeyValuePairProperty(name="SES_REGION", value="us-east-1"),
                            apprunner.CfnService.KeyValuePairProperty(name="DB_SECRET_NAME", value="bloom/prod/database"),
                            apprunner.CfnService.KeyValuePairProperty(name="JWT_SECRET_NAME", value="bloom/prod/jwt-secret"),
                            apprunner.CfnService.KeyValuePairProperty(name="CLOUDWATCH_LOG_GROUP", value="/bloom/prod/api"),
                            apprunner.CfnService.KeyValuePairProperty(name="DB_HOST", value=db_instance.db_instance_endpoint_address),
                            apprunner.CfnService.KeyValuePairProperty(name="DB_PORT", value=db_instance.db_instance_endpoint_port),
                            apprunner.CfnService.KeyValuePairProperty(name="DB_NAME", value="bloom"),
                            apprunner.CfnService.KeyValuePairProperty(name="DB_USER", value="bloom_admin"),
                            apprunner.CfnService.KeyValuePairProperty(name="SENTRY_DSN", value=""),  # Set via console or Secrets Manager
                        ],
                    ),
                ),
            ),
            instance_configuration=apprunner.CfnService.InstanceConfigurationProperty(
                cpu="1024",   # 1 vCPU
                memory="2048",  # 2 GB
                instance_role_arn=apprunner_instance_role.role_arn,
            ),
            health_check_configuration=apprunner.CfnService.HealthCheckConfigurationProperty(
                protocol="HTTP",
                path="/health",
                interval=10,
                timeout=5,
                healthy_threshold=1,
                unhealthy_threshold=5,
            ),
            network_configuration=apprunner.CfnService.NetworkConfigurationProperty(
                egress_configuration=apprunner.CfnService.EgressConfigurationProperty(
                    egress_type="VPC",
                    vpc_connector_arn=vpc_connector.attr_vpc_connector_arn,
                ),
            ),
        )

        # =====================================================================
        # Lambda — Daily delivery generation (Docker-based)
        # =====================================================================
        delivery_lambda = _lambda.DockerImageFunction(
            self,
            "DeliveryGenerationLambda",
            function_name="bloom-delivery-generation",
            code=_lambda.DockerImageCode.from_image_asset(
                directory="../apps/api",
                file="Dockerfile.lambda",
            ),
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS
            ),
            security_groups=[lambda_sg],
            timeout=Duration.minutes(5),
            memory_size=512,
            environment={
                "ENVIRONMENT": "production",
                "USE_AWS_SECRETS": "true",
                "DB_SECRET_NAME": "bloom/prod/database",
                "DB_HOST": db_instance.db_instance_endpoint_address,
                "DB_PORT": db_instance.db_instance_endpoint_port,
                "DB_NAME": "bloom",
                "DB_USER": "bloom_admin",
            },
            log_group=logs.LogGroup(
                self,
                "DeliveryLambdaLogs",
                log_group_name="/aws/lambda/bloom-delivery-generation",
                retention=logs.RetentionDays.TWO_WEEKS,
                removal_policy=RemovalPolicy.DESTROY,
            ),
        )

        db_secret.grant_read(delivery_lambda)

        # CloudWatch Events rule — daily at 6 AM UTC
        events.Rule(
            self,
            "DailyDeliveryRule",
            rule_name="bloom-daily-delivery-generation",
            schedule=events.Schedule.cron(
                minute="0", hour="6", month="*", week_day="*", year="*",
            ),
            targets=[targets.LambdaFunction(delivery_lambda)],
        )

        # =====================================================================
        # CloudWatch Alarm — 5xx error rate on App Runner
        # =====================================================================
        alarm_topic = sns.Topic(
            self, "BloomAlarmTopic",
            topic_name="bloom-api-alarms",
            display_name="Bloom API Alarms",
        )

        cloudwatch.Alarm(
            self,
            "Api5xxAlarm",
            alarm_name="bloom-api-5xx-errors",
            alarm_description="Fires when App Runner returns 5+ server errors in 5 minutes",
            metric=cloudwatch.Metric(
                namespace="AWS/AppRunner",
                metric_name="5xxStatusResponses",
                dimensions_map={"ServiceName": "bloom-api"},
                statistic="Sum",
                period=Duration.minutes(5),
            ),
            threshold=5,
            evaluation_periods=1,
            comparison_operator=cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treat_missing_data=cloudwatch.TreatMissingData.NOT_BREACHING,
        ).add_alarm_action(cw_actions.SnsAction(alarm_topic))

        # =====================================================================
        # Outputs
        # =====================================================================
        CfnOutput(self, "ApiUrl",
                  value=cdk.Fn.get_att(api_service.logical_id, "ServiceUrl").to_string(),
                  description="App Runner API URL")
        CfnOutput(self, "DbEndpoint",
                  value=db_instance.db_instance_endpoint_address,
                  description="RDS endpoint")
        CfnOutput(self, "DbSecretArn",
                  value=db_secret.secret_arn,
                  description="DB credentials secret ARN")
        CfnOutput(self, "JwtSecretArn",
                  value=jwt_secret.secret_arn,
                  description="JWT secret ARN")
        CfnOutput(self, "EcrRepoUri",
                  value=ecr_repo.repository_uri,
                  description="ECR repo URI — use for docker push")
        CfnOutput(self, "CognitoUserPoolId",
                  value=user_pool.user_pool_id,
                  description="Cognito User Pool ID")
        CfnOutput(self, "CognitoClientId",
                  value=user_pool_client.user_pool_client_id,
                  description="Cognito App Client ID")
        CfnOutput(self, "S3BucketName",
                  value=photos_bucket.bucket_name,
                  description="Delivery photos S3 bucket")
        CfnOutput(self, "LambdaName",
                  value=delivery_lambda.function_name,
                  description="Delivery generation Lambda")
        CfnOutput(self, "VpcId",
                  value=vpc.vpc_id,
                  description="VPC ID")
        CfnOutput(self, "AlarmTopicArn",
                  value=alarm_topic.topic_arn,
                  description="SNS topic for API alarms — subscribe your email")

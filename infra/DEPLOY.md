# Bloom Deployment Guide

## Prerequisites

1. AWS CLI configured (`aws configure` or AWS SSO)
2. Python 3.11+ with pip
3. Docker Desktop running
4. Node.js 18+ (for CDK CLI)
5. GitHub repo with the code pushed

## One-Time Setup

### Install CDK CLI
```bash
npm install -g aws-cdk
```

### Install Python dependencies
```bash
cd infra
pip install -r requirements.txt
```

### Bootstrap CDK (first time per AWS account/region)
```bash
cd infra
cdk bootstrap
```

## Deploy Everything

### Step 1: Deploy the CDK stack
This creates all AWS resources (VPC, RDS, ECR, App Runner, Cognito, S3, Lambda).
```bash
cd infra
cdk deploy
```
Save the outputs — you'll need the ECR repo URI and other values.

### Step 2: Push the API Docker image to ECR
App Runner needs an image in ECR before it can start.
```bash
# Login to ECR (replace ACCOUNT_ID with your AWS account ID)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com

# Build and push
docker build -t bloom-api apps/api
docker tag bloom-api:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/bloom-api:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/bloom-api:latest
```
App Runner will automatically pick up the image and start the service.
The API runs Alembic migrations on startup, so the database schema is created automatically.

### Step 3: Set CORS origins on App Runner
Once you know your Amplify URL, update the App Runner env var:
```bash
# Add your Amplify URL to CORS_ORIGINS in the App Runner console
# or redeploy CDK with the URL added to environment_variables
```

### Step 4: Deploy the web frontend via Amplify
Connect your GitHub repo to AWS Amplify in the console:
1. Go to AWS Amplify console
2. "Host web app" → GitHub → select your repo
3. Set build settings for the monorepo:
   - App root: `apps/web`
   - Build command: `pnpm install && pnpm build`
   - Output directory: `dist`
4. Add environment variable: `VITE_API_BASE_URL` = your App Runner URL
5. Deploy

After this, every push to `main` auto-deploys the frontend.

### Step 5: Set up GitHub Actions for API auto-deploy
1. Create an IAM OIDC provider for GitHub Actions in your AWS account
2. Create an IAM role with ECR push permissions
3. Add `AWS_DEPLOY_ROLE_ARN` as a GitHub Actions secret
4. Pushes to `main` that touch `apps/api/` will auto-build and push to ECR

## Day-to-Day Workflow

- Push code to GitHub → frontend and API auto-deploy
- Run `cdk deploy` only when changing AWS resources (rare)
- Lambda runs daily at 6 AM UTC automatically
- Trigger delivery generation manually: `POST /admin/generate-deliveries`

## Useful Commands

```bash
# Check stack status
cdk diff

# View App Runner logs
aws logs tail /bloom/prod/api --follow

# Invoke Lambda manually
aws lambda invoke --function-name bloom-delivery-generation output.json

# Check RDS connectivity (from App Runner logs)
# The API hits /health/db on startup

# Tear everything down
cd infra
cdk destroy
```

## Cost Estimate (MLP)

- RDS db.t3.micro: ~$15/month
- App Runner (1 vCPU, 2GB): ~$30/month (scales to zero when idle)
- NAT Gateway: ~$32/month
- Lambda: ~$0 (daily invocation, well within free tier)
- Cognito: Free tier (50k MAU)
- S3: ~$0 (minimal storage)
- ECR: ~$0 (10 images)
- **Total: ~$77/month**

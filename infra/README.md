# Bloom Infrastructure (CDK)

Single-stack AWS CDK deployment for the Bloom platform.

## What's Created

| Resource | Service | Purpose |
|----------|---------|---------|
| VPC | EC2 | Network isolation (2 AZs, public + private subnets) |
| Database | RDS PostgreSQL 15 | Primary data store (db.t3.micro) |
| API | App Runner | FastAPI backend (Docker from ECR) |
| Auth | Cognito | User authentication (email sign-in) |
| Storage | S3 | Delivery photo uploads |
| Background | Lambda + EventBridge | Daily delivery generation (6 AM UTC) |
| Secrets | Secrets Manager | DB credentials, JWT secret |
| Container Registry | ECR | Docker images for API |

## Quick Start

```bash
cd infra
pip install -r requirements.txt
cdk bootstrap   # first time only
cdk deploy
```

See [DEPLOY.md](./DEPLOY.md) for the full step-by-step guide.

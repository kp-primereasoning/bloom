#!/bin/bash
# Bloom API Deployment Script
# Builds and pushes Docker image to ECR, then updates App Runner

set -e

# Configuration
AWS_REGION="us-east-1"
AWS_ACCOUNT_ID="282939815209"
ECR_REPO="bloom-api"
IMAGE_TAG="${1:-latest}"

ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPO}"

echo "=== Bloom API Deployment ==="
echo "Region: ${AWS_REGION}"
echo "ECR Repo: ${ECR_URI}"
echo "Image Tag: ${IMAGE_TAG}"
echo ""

# Step 1: Authenticate with ECR
echo "1. Authenticating with ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# Step 2: Build Docker image
echo "2. Building Docker image..."
docker build -t ${ECR_REPO}:${IMAGE_TAG} .

# Step 3: Tag for ECR
echo "3. Tagging image for ECR..."
docker tag ${ECR_REPO}:${IMAGE_TAG} ${ECR_URI}:${IMAGE_TAG}

# Step 4: Push to ECR
echo "4. Pushing to ECR..."
docker push ${ECR_URI}:${IMAGE_TAG}

echo ""
echo "=== Deployment Complete ==="
echo "Image URI: ${ECR_URI}:${IMAGE_TAG}"
echo ""
echo "Next steps:"
echo "1. If App Runner service doesn't exist, create it via AWS Console or CLI"
echo "2. If service exists, it will auto-deploy from ECR"

---
inclusion: always
---

# Technical Architecture Guidelines

## Core Principles
- **MLP Focus**: Optimize for speed and clarity over cost or scale
- **Managed Services**: Use AWS-managed services to minimize operational overhead
- **Simplicity First**: Avoid complex infrastructure patterns for the initial launch
- **AWS as Implementation**: Infrastructure choices should not drive product decisions

## Architecture Stack

### Frontend
- **Primary**: AWS Amplify for hosting and CI/CD
- **Alternative**: S3 + CloudFront for static hosting
- **Framework**: React/Next.js (preferred for SSR capabilities)

### Backend API
- **Service**: AWS App Runner (containerized REST API)
- **Language**: Node.js/TypeScript or Python (FastAPI)
- **Architecture**: RESTful API with clear resource endpoints
- **Authentication**: JWT tokens via AWS Cognito

### Background Processing
- **Service**: AWS Lambda for scheduled and event-driven tasks
- **Use Cases**: Email notifications, data sync, cleanup jobs
- **Triggers**: CloudWatch Events, SQS, or direct API invocation

### Database
- **Primary**: Amazon RDS (PostgreSQL preferred for JSON support)
- **Migrations**: Handle via application startup or CI pipeline
- **Constraints**: No DynamoDB for MLP to maintain simplicity
- **Backup**: Automated RDS backups with point-in-time recovery

### Authentication & Authorization
- **Service**: AWS Cognito User Pools
- **Roles**: Resident, Property Manager, Florist, Admin
- **Enforcement**: Server-side role validation on all protected endpoints
- **Sessions**: JWT tokens with appropriate expiration

### External Integrations
- **Shopify**: OAuth 2.0 integration for florist catalog access
- **Secrets**: AWS Secrets Manager for API keys and credentials
- **Webhooks**: Process via API endpoints + Lambda (future phase)

### Monitoring & Logging
- **Logs**: CloudWatch Logs for all services
- **Metrics**: Basic CloudWatch metrics (errors, latency, throughput)
- **Alerting**: Simple CloudWatch alarms for critical failures
- **Scope**: Error tracking and basic performance monitoring only

## Development Guidelines

### Environments
- **Development**: `dev` environment for testing
- **Production**: `prod` environment for live traffic
- **Staging**: Not required for MLP unless complexity demands it

### Deployment
- **Frontend**: Amplify automatic deployments from Git
- **Backend**: App Runner automatic deployments from container registry
- **Database**: Manual migrations during deployment windows

### Code Organization
- **API Structure**: RESTful endpoints organized by resource type
- **Error Handling**: Consistent error responses with proper HTTP status codes
- **Validation**: Input validation at API boundaries
- **Documentation**: OpenAPI/Swagger specs for all endpoints

## Constraints & Restrictions
- **No Kubernetes**: Avoid container orchestration complexity
- **No CloudFormation**: Manual AWS resource setup for MLP
- **No Microservices**: Monolithic API structure for simplicity
- **No Real-time Features**: Polling-based updates acceptable for MLP

## Decision Framework
When making technical choices, prioritize:
1. **Speed to market** over perfect architecture
2. **Operational simplicity** over feature richness  
3. **AWS-managed services** over custom solutions
4. **Clear debugging** over performance optimization
# AWS Cognito Authentication Patterns Research

## Research Date: December 30, 2025

## Overview

This document captures research findings on AWS Cognito authentication patterns for role-based access control in the Bloom platform.

---

## AWS Cognito Overview

Amazon Cognito provides:
- **User Pools**: User directory with sign-up/sign-in
- **Identity Pools**: AWS credentials for accessing services
- **OAuth 2.0/OIDC**: Standard authentication protocols

---

## User Roles in Bloom

| Role | Description | Access Level |
|------|-------------|--------------|
| CUSTOMER | Residents subscribing to flowers | Customer portal |
| PROPERTY_MANAGER | Building managers | PM dashboard |
| FLORIST | Flower shop owners | Florist portal |
| ADMIN | Bloom staff | Full admin access |

---

## Role Implementation Options

### Option 1: Custom Attributes
Store role as custom attribute on user

```
User Attributes:
├── email (standard)
├── name (standard)
├── custom:role = "CUSTOMER" | "PM" | "FLORIST" | "ADMIN"
└── custom:property_id = "uuid" (for customers/PMs)
```

**Pros**: Simple, role in JWT token
**Cons**: Limited to string values, harder to manage multiple roles

### Option 2: Cognito Groups
Assign users to groups representing roles

```
Groups:
├── Customers
├── PropertyManagers
├── Florists
└── Admins
```

**Pros**: Native Cognito feature, can link to IAM roles
**Cons**: Requires group management, not in standard claims

### Option 3: Database-Managed Roles (Recommended)
Store role in application database, validate server-side

```
User (Cognito):
├── sub (unique ID)
├── email
└── name

User (Database):
├── cognito_sub
├── role
├── property_id
└── additional_attributes
```

**Pros**: Flexible, full control, complex role logic
**Cons**: Extra database lookup on each request

---

## Recommended Approach for Bloom

### Hybrid: Custom Attribute + Database

1. **Custom attribute** for basic role (fast JWT check)
2. **Database** for detailed permissions and relationships
3. **Server-side validation** for all protected endpoints

### Implementation
```python
# JWT contains basic role
token_role = jwt_payload.get("custom:role")

# Database has full user details
user = db.get_user_by_cognito_sub(jwt_payload["sub"])

# Validate both match
if user.role != token_role:
    raise AuthorizationError("Role mismatch")
```

---

## Custom Attributes Setup

### Defining Custom Attributes
```json
{
  "SchemaAttributes": [
    {
      "Name": "custom:role",
      "AttributeDataType": "String",
      "Mutable": true,
      "Required": false,
      "StringAttributeConstraints": {
        "MinLength": "1",
        "MaxLength": "50"
      }
    },
    {
      "Name": "custom:property_id",
      "AttributeDataType": "String",
      "Mutable": true,
      "Required": false
    }
  ]
}
```

### Important Notes
- Custom attributes prefixed with `custom:`
- Cannot be required at sign-up (set after)
- Mutable allows updates
- Max 50 custom attributes per pool

---

## Token Structure

### ID Token Claims
```json
{
  "sub": "uuid",
  "email": "user@example.com",
  "email_verified": true,
  "custom:role": "CUSTOMER",
  "custom:property_id": "property-uuid",
  "cognito:groups": ["Customers"],
  "iat": 1234567890,
  "exp": 1234571490
}
```

### Access Token
- Used for API authorization
- Contains scopes, not custom attributes
- Shorter-lived than ID token

---

## Authentication Flows

### Standard Flow (Recommended)
1. User signs in with email/password
2. Cognito returns tokens (ID, Access, Refresh)
3. Frontend stores tokens securely
4. API requests include Access token in header
5. Backend validates token and extracts claims

### Token Refresh
```
Access Token: 1 hour (default)
ID Token: 1 hour (default)
Refresh Token: 30 days (configurable)
```

### Refresh Flow
1. Access token expires
2. Frontend uses refresh token to get new tokens
3. No user interaction required

---

## Role-Based Access Control (RBAC)

### Middleware Pattern
```python
def require_role(*allowed_roles):
    def decorator(func):
        async def wrapper(request):
            user = get_current_user(request)
            if user.role not in allowed_roles:
                raise HTTPException(403, "Forbidden")
            return await func(request)
        return wrapper
    return decorator

# Usage
@app.get("/admin/users")
@require_role("ADMIN")
async def list_users():
    ...

@app.get("/pm/dashboard")
@require_role("PROPERTY_MANAGER", "ADMIN")
async def pm_dashboard():
    ...
```

### Route Protection Matrix
| Route Pattern | Allowed Roles |
|---------------|---------------|
| `/customer/*` | CUSTOMER |
| `/pm/*` | PROPERTY_MANAGER, ADMIN |
| `/florist/*` | FLORIST, ADMIN |
| `/admin/*` | ADMIN |
| `/auth/*` | Public |

---

## Multi-Factor Authentication (MFA)

### Options
- **SMS**: Code sent via text
- **TOTP**: Authenticator app (Google Auth, Authy)
- **Email**: Code sent via email (custom)

### Recommendation for Bloom MLP
- **Optional MFA** for all users
- **Required MFA** for ADMIN role
- Start with TOTP (most secure, no SMS costs)

---

## Security Best Practices

### Token Handling
1. Store tokens in httpOnly cookies (not localStorage)
2. Use short-lived access tokens
3. Implement token refresh logic
4. Clear tokens on logout

### Password Policy
```
Minimum length: 8 characters
Require uppercase: Yes
Require lowercase: Yes
Require numbers: Yes
Require symbols: No (optional)
```

### Account Security
- Email verification required
- Password reset via email
- Account lockout after failed attempts
- Suspicious activity detection (Cognito Advanced)

---

## Implementation Recommendations for Bloom

### Phase 1: MLP (Current)
1. Cognito User Pool with email sign-in
2. Custom attribute for role
3. Database for full user details
4. Server-side role validation
5. JWT middleware for protected routes

### Phase 2: Enhanced
1. Cognito Groups for role management
2. Optional MFA for users
3. Required MFA for admins
4. Password policy enforcement

### Phase 3: Advanced
1. Social login (Google, Apple)
2. SSO for enterprise properties
3. Advanced security features
4. Audit logging

---

## API Integration

### Current Bloom Pattern
```python
# auth/service.py
async def get_current_user(token: str) -> User:
    # Validate JWT with Cognito
    payload = verify_cognito_token(token)
    
    # Get user from database
    user = await db.get_user_by_cognito_sub(payload["sub"])
    
    # Validate role matches
    if user.role != payload.get("custom:role"):
        raise AuthError("Role mismatch")
    
    return user
```

### Protected Route Example
```python
@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return user

@router.get("/admin/users")
async def list_users(user: User = Depends(require_admin)):
    return await db.list_users()
```

---

## Sources

- [AWS Cognito User Attributes](https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html)
- [AWS Cognito Role-Based Access Control](https://docs.aws.amazon.com/cognito/latest/developerguide/role-based-access-control.html)
- [AWS Cognito Custom Attributes](https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/send-custom-attributes-cognito.html)
- [AWS Cognito Multi-Tenancy](https://docs.aws.amazon.com/cognito/latest/developerguide/custom-attribute-based-multi-tenancy.html)
- [Reintech - Structuring Cognito User Pools](https://reintech.io/blog/structuring-aws-cognito-user-pools)

*Content was rephrased for compliance with licensing restrictions*

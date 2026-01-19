# Bloom Low Level Design

## API Specifications

### API Design Principles

1. **RESTful Conventions:** Standard HTTP methods (GET, POST, PATCH, DELETE)
2. **Error Envelope:** Consistent error response format across all endpoints
3. **Request ID Correlation:** Every response includes `x-request-id` header for tracing
4. **Idempotency:** POST/PATCH operations use idempotency keys where applicable
5. **Pagination:** List endpoints support `offset` and `limit` query parameters
6. **Versioning:** Future-proof with `/v1/` prefix (currently implicit v1)

---

### Standard Response Formats

#### Success Response (2xx)

```json
// Single resource
{
  "id": "uuid",
  "name": "Resource Name",
  "created_at": "2024-01-15T10:30:00Z"
}

// Collection
{
  "items": [...],
  "total": 42,
  "offset": 0,
  "limit": 20
}
```

#### Error Response (4xx, 5xx)

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "email",
      "reason": "Invalid format"
    },
    "request_id": "uuid-for-correlation"
  }
}
```

**Error Codes:**
```python
# Authentication & Authorization
INVALID_TOKEN = "INVALID_TOKEN"
EXPIRED_TOKEN = "EXPIRED_TOKEN"
INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"

# Validation
VALIDATION_ERROR = "VALIDATION_ERROR"
INVALID_INPUT = "INVALID_INPUT"
MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"

# Business Logic
RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS"
INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION"

# External Services
SHOPIFY_API_ERROR = "SHOPIFY_API_ERROR"
STRIPE_API_ERROR = "STRIPE_API_ERROR"
EMAIL_DELIVERY_FAILED = "EMAIL_DELIVERY_FAILED"

# System
INTERNAL_ERROR = "INTERNAL_ERROR"
DATABASE_ERROR = "DATABASE_ERROR"
```

---

## Detailed API Endpoints

### Authentication Endpoints

#### POST /auth/register

**Description:** Register new customer account

**Request:**
```json
{
  "email": "customer@example.com",
  "password": "SecurePass123!",
  "name": "John Doe",
  "phone": "+1-555-123-4567"
}
```

**Validation Rules:**
- `email`: Valid email format, unique
- `password`: Min 12 chars, uppercase, lowercase, number, symbol
- `name`: 2-100 characters
- `phone`: E.164 format (optional)

**Response (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "customer@example.com",
    "role": "CUSTOMER",
    "status": "ACTIVE",
    "email_verified": false
  },
  "tokens": {
    "id_token": "jwt-id-token",
    "access_token": "jwt-access-token",
    "refresh_token": "jwt-refresh-token",
    "expires_in": 3600
  }
}
```

**Implementation:**
```python
@router.post("/auth/register", status_code=201)
async def register(
    data: RegisterRequest,
    neo4j_session: Session = Depends(get_neo4j_session)
):
    # 1. Create Cognito user
    cognito_response = cognito_auth.create_user(
        email=data.email,
        password=data.password,
        role="CUSTOMER"
    )

    # 2. Create Neo4j user node
    result = neo4j_session.run("""
        CREATE (u:User {
            id: randomUUID(),
            cognito_sub: $cognito_sub,
            email: $email,
            role: 'CUSTOMER',
            status: 'ACTIVE',
            name: $name,
            phone: $phone,
            subscription_status: 'CREATED',
            created_at: datetime(),
            updated_at: datetime()
        })
        RETURN u
    """,
        cognito_sub=cognito_response['UserSub'],
        email=data.email,
        name=data.name,
        phone=data.phone
    )

    user = result.single()['u']

    # 3. Send verification email (Cognito handles this)

    # 4. Return tokens
    tokens = cognito_auth.authenticate(data.email, data.password)

    return {
        "user": UserResponse(**user),
        "tokens": tokens
    }
```

---

#### POST /auth/login

**Description:** Authenticate user and return tokens

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "CUSTOMER",
    "subscription_status": "ACTIVE"
  },
  "tokens": {
    "id_token": "jwt-id-token",
    "access_token": "jwt-access-token",
    "refresh_token": "jwt-refresh-token",
    "expires_in": 3600
  }
}
```

**Implementation:**
```python
@router.post("/auth/login")
async def login(
    data: LoginRequest,
    neo4j_session: Session = Depends(get_neo4j_session)
):
    # 1. Authenticate with Cognito
    tokens = cognito_auth.authenticate(data.email, data.password)

    # 2. Get user from Neo4j
    result = neo4j_session.run("""
        MATCH (u:User {email: $email})
        RETURN u
    """, email=data.email)

    user = result.single()
    if not user:
        raise HTTPException(404, detail="User not found")

    return {
        "user": UserResponse(**user['u']),
        "tokens": tokens
    }
```

---

#### GET /auth/me

**Description:** Get current authenticated user with enriched data

**Headers:**
```
Authorization: Bearer {id_token}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "customer@example.com",
  "role": "CUSTOMER",
  "name": "John Doe",
  "phone": "+1-555-123-4567",
  "property_id": "uuid",
  "property_name": "Brooklyn Heights Towers",
  "property_address": "123 Main St, Brooklyn, NY 11201",
  "unit": "5B",
  "subscription_status": "ACTIVE",
  "subscription_plan": "SIGNATURE",
  "created_at": "2024-01-15T10:30:00Z"
}
```

**Implementation:**
```python
@router.get("/auth/me")
async def get_me(
    current_user: dict = Depends(get_current_user),
    neo4j_session: Session = Depends(get_neo4j_session)
):
    # Get user with property details (single query)
    result = neo4j_session.run("""
        MATCH (u:User {id: $user_id})
        OPTIONAL MATCH (u)-[:RESIDES_AT]->(p:Property)
        RETURN u, p
    """, user_id=current_user["id"])

    record = result.single()
    user = record['u']
    property = record['p']

    return {
        **user,
        "property_name": property['name'] if property else None,
        "property_address": property['address'] if property else None
    }
```

---

### Customer Endpoints

#### PATCH /me/property

**Description:** Assign property to current customer during onboarding

**Request:**
```json
{
  "property_id": "uuid",
  "unit": "5B"
}
```

**Validation:**
- `property_id`: Must exist and not be ARCHIVED
- `unit`: 1-50 characters

**Response (200):**
```json
{
  "id": "uuid",
  "property_id": "uuid",
  "unit": "5B",
  "subscription_status": "CREATED"
}
```

**Implementation:**
```python
@router.patch("/me/property")
async def update_property(
    data: MePropertyUpdate,
    current_user: dict = Depends(require_role(["CUSTOMER"])),
    neo4j_session: Session = Depends(get_neo4j_session)
):
    # 1. Validate property exists and is active
    prop_result = neo4j_session.run("""
        MATCH (p:Property {id: $property_id})
        RETURN p
    """, property_id=str(data.property_id))

    if not prop_result.single():
        raise HTTPException(400, detail="Property not found")

    # 2. Create RESIDES_AT relationship
    neo4j_session.run("""
        MATCH (u:User {id: $user_id})
        MATCH (p:Property {id: $property_id})
        MERGE (u)-[r:RESIDES_AT]->(p)
        SET u.unit = $unit,
            u.updated_at = datetime(),
            r.joined_at = datetime()
    """,
        user_id=current_user["id"],
        property_id=str(data.property_id),
        unit=data.unit
    )

    # 3. Return updated user
    return get_me(current_user, neo4j_session)
```

---

#### PATCH /me/subscription

**Description:** Activate or pause subscription

**Request:**
```json
{
  "subscription_status": "ACTIVE"  // or "PAUSED"
}
```

**Business Rules:**
- Can only set ACTIVE or PAUSED (not CREATED)
- Requires property_id to be set
- ACTIVE → PAUSED: Cancel future deliveries
- PAUSED → ACTIVE: Generate new deliveries

**Response (200):**
```json
{
  "id": "uuid",
  "subscription_status": "ACTIVE",
  "subscription_plan": "SIGNATURE"
}
```

**Implementation:**
```python
@router.patch("/me/subscription")
async def update_subscription(
    data: MeSubscriptionUpdate,
    current_user: dict = Depends(require_role(["CUSTOMER"])),
    neo4j_session: Session = Depends(get_neo4j_session),
    db: Session = Depends(get_db)
):
    # 1. Update Neo4j user status
    neo4j_session.run("""
        MATCH (u:User {id: $user_id})
        SET u.subscription_status = $status,
            u.updated_at = datetime()
    """, user_id=current_user["id"], status=data.subscription_status)

    # 2. If pausing, cancel future deliveries
    if data.subscription_status == "PAUSED":
        db.query(Delivery).filter(
            Delivery.user_id == current_user["id"],
            Delivery.status == DeliveryStatus.SCHEDULED,
            Delivery.scheduled_for > datetime.now(timezone.utc)
        ).update({"status": DeliveryStatus.CANCELLED})
        db.commit()

    # 3. If activating, generate deliveries
    if data.subscription_status == "ACTIVE":
        delivery_service.generate_deliveries_for_user(
            user_id=current_user["id"],
            neo4j_session=neo4j_session,
            db=db
        )

    return get_me(current_user, neo4j_session)
```

---

#### GET /me/deliveries

**Description:** Get customer's delivery history and next delivery

**Response (200):**
```json
{
  "next_delivery": {
    "id": "uuid",
    "scheduled_for": "2024-01-22T10:00:00Z",
    "status": "SCHEDULED",
    "subscription_plan": "SIGNATURE",
    "product_title": "Weekly Signature Arrangement",
    "florist_name": "Brooklyn Blooms"
  },
  "history": [
    {
      "id": "uuid",
      "scheduled_for": "2024-01-15T10:00:00Z",
      "delivered_at": "2024-01-15T11:30:00Z",
      "status": "DELIVERED",
      "product_title": "Weekly Signature Arrangement",
      "delivery_photo_url": "https://s3.../photo.jpg"
    }
  ],
  "total_deliveries": 8
}
```

**Implementation:**
```python
@router.get("/me/deliveries")
async def get_deliveries(
    current_user: dict = Depends(require_role(["CUSTOMER"])),
    db: Session = Depends(get_db),
    neo4j_session: Session = Depends(get_neo4j_session)
):
    now = datetime.now(timezone.utc)
    user_id = UUID(current_user["id"])

    # Get next scheduled delivery
    next_delivery = db.query(Delivery).filter(
        Delivery.user_id == user_id,
        Delivery.scheduled_for > now,
        Delivery.status == DeliveryStatus.SCHEDULED
    ).order_by(Delivery.scheduled_for.asc()).first()

    # Get history (last 20 delivered)
    history = db.query(Delivery).filter(
        Delivery.user_id == user_id,
        Delivery.status.in_([DeliveryStatus.DELIVERED, DeliveryStatus.MISSED])
    ).order_by(Delivery.scheduled_for.desc()).limit(20).all()

    # Enrich with florist names from Neo4j
    florist_ids = set(
        [d.florist_id for d in ([next_delivery] if next_delivery else []) + history]
    )

    florist_names = {}
    if florist_ids:
        result = neo4j_session.run("""
            MATCH (f:Florist)
            WHERE f.id IN $florist_ids
            RETURN f.id as id, f.name as name
        """, florist_ids=list(florist_ids))
        florist_names = {r['id']: r['name'] for r in result}

    return {
        "next_delivery": {
            **next_delivery.__dict__,
            "florist_name": florist_names.get(next_delivery.florist_id)
        } if next_delivery else None,
        "history": [
            {**d.__dict__, "florist_name": florist_names.get(d.florist_id)}
            for d in history
        ],
        "total_deliveries": len(history)
    }
```

---

### Admin Endpoints

#### GET /admin/properties

**Description:** List all properties with enriched data (florist, PM, resident counts)

**Query Parameters:**
- `offset` (default: 0)
- `limit` (default: 50, max: 100)
- `status` (optional filter: CREATED, PENDING_FLORIST, PENDING_PM, ACTIVE)

**Response (200):**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Brooklyn Heights Towers",
      "address": "123 Main St",
      "city": "Brooklyn",
      "state": "NY",
      "zip_code": "11201",
      "delivery_cadence": "WEEKLY_MONDAY",
      "status": "ACTIVE",
      "florist_id": "uuid",
      "florist_name": "Brooklyn Blooms",
      "property_manager_id": "uuid",
      "property_manager_email": "pm@example.com",
      "total_residents": 24,
      "active_residents": 18,
      "created_at": "2024-01-10T12:00:00Z"
    }
  ],
  "total": 42,
  "offset": 0,
  "limit": 50
}
```

**Implementation:**
```python
@router.get("/admin/properties")
async def get_properties(
    offset: int = 0,
    limit: int = 50,
    status: Optional[str] = None,
    current_user: dict = Depends(require_role(["ADMIN"])),
    neo4j_session: Session = Depends(get_neo4j_session)
):
    # Single Cypher query with enriched data (no N+1!)
    query = """
        MATCH (p:Property)
        WHERE ($status IS NULL OR p.status = $status)
        OPTIONAL MATCH (p)-[:ASSIGNED_TO {active: true}]->(f:Florist)
        OPTIONAL MATCH (p)-[:MANAGED_BY]->(pm:User {role: 'PROPERTY_MANAGER'})
        OPTIONAL MATCH (p)<-[:RESIDES_AT]-(resident:User {status: 'ACTIVE'})

        WITH p, f, pm,
             count(DISTINCT resident) as total_residents,
             count(DISTINCT CASE WHEN resident.subscription_status = 'ACTIVE'
                                 THEN resident END) as active_residents

        RETURN p.id as id,
               p.name as name,
               p.address as address,
               p.city as city,
               p.state as state,
               p.zip_code as zip_code,
               p.delivery_cadence as delivery_cadence,
               f.id as florist_id,
               f.name as florist_name,
               pm.id as property_manager_id,
               pm.email as property_manager_email,
               total_residents,
               active_residents,
               p.created_at as created_at,

               CASE
                 WHEN f IS NOT NULL AND pm IS NOT NULL THEN 'ACTIVE'
                 WHEN f IS NOT NULL THEN 'PENDING_PM'
                 WHEN pm IS NOT NULL THEN 'PENDING_FLORIST'
                 ELSE 'CREATED'
               END as status

        ORDER BY p.created_at DESC
        SKIP $offset
        LIMIT $limit
    """

    result = neo4j_session.run(query, offset=offset, limit=limit, status=status)
    items = [dict(record) for record in result]

    # Get total count
    count_result = neo4j_session.run("""
        MATCH (p:Property)
        WHERE ($status IS NULL OR p.status = $status)
        RETURN count(p) as total
    """, status=status)
    total = count_result.single()['total']

    return {
        "items": items,
        "total": total,
        "offset": offset,
        "limit": limit
    }
```

---

#### POST /admin/properties

**Description:** Create new property

**Request:**
```json
{
  "name": "Downtown Lofts",
  "address": "456 Park Ave",
  "city": "New York",
  "state": "NY",
  "zip_code": "10001",
  "delivery_cadence": "BIWEEKLY_FRIDAY",
  "delivery_instructions": "Use service entrance on 46th St"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Downtown Lofts",
  "status": "CREATED",
  "created_at": "2024-01-20T14:00:00Z"
}
```

**Implementation:**
```python
@router.post("/admin/properties", status_code=201)
async def create_property(
    data: PropertyCreate,
    current_user: dict = Depends(require_role(["ADMIN"])),
    neo4j_session: Session = Depends(get_neo4j_session)
):
    # Create property node in Neo4j
    result = neo4j_session.run("""
        CREATE (p:Property {
            id: randomUUID(),
            name: $name,
            address: $address,
            city: $city,
            state: $state,
            zip_code: $zip_code,
            delivery_cadence: $delivery_cadence,
            delivery_instructions: $delivery_instructions,
            created_at: datetime(),
            updated_at: datetime()
        })
        RETURN p
    """, **data.dict())

    property = result.single()['p']

    # Log admin action
    audit_service.log_action(
        user_id=current_user["id"],
        action="create_property",
        entity_type="Property",
        entity_id=property['id'],
        new_values=data.dict()
    )

    return PropertyResponse(**property)
```

---

#### POST /admin/property-assignments

**Description:** Assign florist to property

**Request:**
```json
{
  "property_id": "uuid",
  "florist_id": "uuid"
}
```

**Business Rules:**
- Deactivates any existing active assignment for this property
- Florist must have status = READY
- Property must exist and not be ARCHIVED
- Recomputes property status after assignment

**Response (201):**
```json
{
  "id": "uuid",
  "property_id": "uuid",
  "florist_id": "uuid",
  "active": true,
  "created_at": "2024-01-20T15:00:00Z"
}
```

**Implementation:**
```python
@router.post("/admin/property-assignments", status_code=201)
async def create_assignment(
    data: PropertyAssignmentCreate,
    current_user: dict = Depends(require_role(["ADMIN"])),
    neo4j_session: Session = Depends(get_neo4j_session)
):
    # 1. Validate property and florist exist
    validation = neo4j_session.run("""
        MATCH (p:Property {id: $property_id})
        MATCH (f:Florist {id: $florist_id, status: 'READY'})
        RETURN p, f
    """, property_id=str(data.property_id), florist_id=str(data.florist_id))

    if not validation.single():
        raise HTTPException(400, detail="Property or florist not found/ready")

    # 2. Deactivate existing assignments
    neo4j_session.run("""
        MATCH (p:Property {id: $property_id})-[r:ASSIGNED_TO]->(f:Florist)
        SET r.active = false,
            r.deactivated_at = datetime()
    """, property_id=str(data.property_id))

    # 3. Create new assignment
    result = neo4j_session.run("""
        MATCH (p:Property {id: $property_id})
        MATCH (f:Florist {id: $florist_id})
        CREATE (p)-[r:ASSIGNED_TO {
            id: randomUUID(),
            active: true,
            created_at: datetime()
        }]->(f)
        RETURN r.id as id, r.created_at as created_at
    """, property_id=str(data.property_id), florist_id=str(data.florist_id))

    assignment = result.single()

    # 4. Log admin action
    audit_service.log_action(
        user_id=current_user["id"],
        action="assign_florist",
        entity_type="PropertyAssignment",
        entity_id=assignment['id'],
        new_values=data.dict()
    )

    return {
        "id": assignment['id'],
        "property_id": data.property_id,
        "florist_id": data.florist_id,
        "active": True,
        "created_at": assignment['created_at']
    }
```

---

### Florist Endpoints

#### POST /florist/shopify/connect

**Description:** Initiate Shopify OAuth flow

**Response (200):**
```json
{
  "authorization_url": "https://brooklyn-blooms.myshopify.com/admin/oauth/authorize?client_id=...&redirect_uri=...&scope=read_products,write_draft_orders"
}
```

**Implementation:**
```python
@router.post("/florist/shopify/connect")
async def connect_shopify(
    current_user: dict = Depends(require_role(["FLORIST"])),
    neo4j_session: Session = Depends(get_neo4j_session)
):
    # Get florist's business info
    result = neo4j_session.run("""
        MATCH (u:User {id: $user_id})-[:WORKS_FOR]->(f:Florist)
        RETURN f
    """, user_id=current_user["id"])

    florist = result.single()['f']

    # Generate Shopify OAuth URL
    shopify_client_id = os.getenv("SHOPIFY_CLIENT_ID")
    redirect_uri = f"{os.getenv('WEB_DOMAIN')}/florist/shopify/callback"
    scope = "read_products,write_draft_orders,write_inventory"

    # Store state for CSRF protection
    state = secrets.token_urlsafe(32)
    cache.set(f"shopify_oauth_state:{state}", florist['id'], ex=600)  # 10min expiry

    authorization_url = (
        f"https://{florist['shopify_store_url']}/admin/oauth/authorize"
        f"?client_id={shopify_client_id}"
        f"&scope={scope}"
        f"&redirect_uri={redirect_uri}"
        f"&state={state}"
    )

    return {"authorization_url": authorization_url}
```

---

#### POST /florist/shopify/callback

**Description:** OAuth callback handler (receives authorization code)

**Query Parameters:**
- `code`: Authorization code from Shopify
- `state`: CSRF token

**Response (200):**
```json
{
  "success": true,
  "products_synced": 24
}
```

**Implementation:**
```python
@router.post("/florist/shopify/callback")
async def shopify_callback(
    code: str,
    state: str,
    neo4j_session: Session = Depends(get_neo4j_session)
):
    # 1. Validate state token
    florist_id = cache.get(f"shopify_oauth_state:{state}")
    if not florist_id:
        raise HTTPException(400, detail="Invalid state token")

    # 2. Exchange code for access token
    shopify_client_id = os.getenv("SHOPIFY_CLIENT_ID")
    shopify_client_secret = os.getenv("SHOPIFY_CLIENT_SECRET")

    result = neo4j_session.run("""
        MATCH (f:Florist {id: $florist_id})
        RETURN f.shopify_store_url as store_url
    """, florist_id=florist_id)

    store_url = result.single()['store_url']

    # Exchange code for token
    response = requests.post(
        f"https://{store_url}/admin/oauth/access_token",
        json={
            "client_id": shopify_client_id,
            "client_secret": shopify_client_secret,
            "code": code
        }
    )
    access_token = response.json()['access_token']

    # 3. Store token in Secrets Manager
    secret_name = f"bloom/florist/{florist_id}/shopify-token"
    secrets_client.create_secret(
        Name=secret_name,
        SecretString=json.dumps({"access_token": access_token})
    )

    # 4. Update florist with secret ARN
    secret_arn = f"arn:aws:secretsmanager:us-east-1:123456:secret:{secret_name}"
    neo4j_session.run("""
        MATCH (f:Florist {id: $florist_id})
        SET f.shopify_secret_arn = $secret_arn,
            f.updated_at = datetime()
    """, florist_id=florist_id, secret_arn=secret_arn)

    # 5. Trigger initial product sync
    product_count = shopify_service.sync_florist_products(
        florist_id=florist_id,
        neo4j_session=neo4j_session
    )

    return {
        "success": True,
        "products_synced": product_count
    }
```

---

#### PUT /florist/shopify/product-mappings

**Description:** Map products to subscription tiers

**Request:**
```json
{
  "mappings": [
    {
      "tier": "ESSENTIAL",
      "product_id": "uuid"
    },
    {
      "tier": "SIGNATURE",
      "product_id": "uuid"
    },
    {
      "tier": "STATEMENT",
      "product_id": "uuid"
    }
  ]
}
```

**Business Rules:**
- One product per tier
- Product must belong to this florist
- Deactivates previous mappings for each tier

**Response (200):**
```json
{
  "success": true,
  "mappings": [...]
}
```

**Implementation:**
```python
@router.put("/florist/shopify/product-mappings")
async def update_product_mappings(
    data: ProductMappingsUpdate,
    current_user: dict = Depends(require_role(["FLORIST"])),
    neo4j_session: Session = Depends(get_neo4j_session)
):
    # Get florist ID
    result = neo4j_session.run("""
        MATCH (u:User {id: $user_id})-[:WORKS_FOR]->(f:Florist)
        RETURN f.id as florist_id
    """, user_id=current_user["id"])

    florist_id = result.single()['florist_id']

    # For each mapping, deactivate old and create new
    for mapping in data.mappings:
        # Deactivate existing mapping for this tier
        neo4j_session.run("""
            MATCH (f:Florist {id: $florist_id})-[r:MAPS_TO_TIER {tier: $tier}]->(p:Product)
            SET r.active = false,
                r.unmapped_at = datetime()
        """, florist_id=florist_id, tier=mapping.tier)

        # Create new mapping
        neo4j_session.run("""
            MATCH (f:Florist {id: $florist_id})
            MATCH (p:Product {id: $product_id})
            WHERE (f)-[:OFFERS]->(p)  // Ensure product belongs to florist
            CREATE (f)-[r:MAPS_TO_TIER {
                tier: $tier,
                active: true,
                mapped_at: datetime()
            }]->(p)
        """, florist_id=florist_id, product_id=str(mapping.product_id), tier=mapping.tier)

    return {"success": True, "mappings": data.mappings}
```

---

### Webhook Endpoints

#### POST /webhooks/shopify/orders/fulfilled

**Description:** Shopify webhook - order fulfilled notification

**Headers:**
```
X-Shopify-Hmac-SHA256: base64-encoded-signature
X-Shopify-Shop-Domain: brooklyn-blooms.myshopify.com
```

**Request Body:** (Shopify order JSON payload)

**Response (200):**
```json
{
  "received": true
}
```

**Implementation:**
```python
@router.post("/webhooks/shopify/orders/fulfilled")
async def shopify_order_fulfilled(
    request: Request,
    x_shopify_hmac_sha256: str = Header(None),
    x_shopify_shop_domain: str = Header(None),
    db: Session = Depends(get_db)
):
    # 1. Verify webhook signature
    body = await request.body()
    secret = os.getenv("SHOPIFY_WEBHOOK_SECRET")

    computed_hmac = base64.b64encode(
        hmac.new(secret.encode(), body, hashlib.sha256).digest()
    ).decode()

    if not hmac.compare_digest(computed_hmac, x_shopify_hmac_sha256):
        raise HTTPException(401, detail="Invalid signature")

    # 2. Parse payload
    payload = await request.json()
    shopify_order_id = str(payload['id'])

    # 3. Log webhook event
    event = ShopifyWebhookEvent(
        id=uuid4(),
        florist_id=...,  # Extract from shop domain lookup
        event_type='orders/fulfilled',
        shopify_order_id=shopify_order_id,
        payload=payload,
        received_at=datetime.now(timezone.utc)
    )
    db.add(event)

    # 4. Find related delivery (via note field: "Bloom Delivery ID: {uuid}")
    note = payload.get('note', '')
    delivery_id_match = re.search(r'Bloom Delivery ID: ([a-f0-9-]+)', note)

    if delivery_id_match:
        delivery_id = UUID(delivery_id_match.group(1))

        # Update delivery status
        delivery = db.query(Delivery).filter_by(id=delivery_id).first()
        if delivery:
            delivery.status = DeliveryStatus.DELIVERED
            delivery.delivered_at = datetime.now(timezone.utc)

            # Create delivery line item (financial record)
            line_item = DeliveryLineItem(
                id=uuid4(),
                delivery_id=delivery_id,
                florist_id=delivery.florist_id,
                customer_paid=...,  # From billing record
                florist_payout=...,  # Calculate
                bloom_commission=...,  # Calculate
                commission_rate=...,  # From florist
                shopify_order_id=shopify_order_id
            )
            db.add(line_item)

            event.processed = True

    db.commit()

    return {"received": True}
```

---

## Database Schemas

### Neo4j Cypher Schemas

#### Constraints & Indexes

```cypher
// User constraints
CREATE CONSTRAINT user_email_unique FOR (u:User) REQUIRE u.email IS UNIQUE;
CREATE CONSTRAINT user_cognito_sub_unique FOR (u:User) REQUIRE u.cognito_sub IS UNIQUE;

// Indexes for fast lookups
CREATE INDEX user_role_index FOR (u:User) ON (u.role);
CREATE INDEX user_status_index FOR (u:User) ON (u.status);
CREATE INDEX user_subscription_status_index FOR (u:User) ON (u.subscription_status);

// Property constraints
CREATE CONSTRAINT property_id_unique FOR (p:Property) REQUIRE p.id IS UNIQUE;
CREATE INDEX property_status_index FOR (p:Property) ON (p.status);

// Florist constraints
CREATE CONSTRAINT florist_id_unique FOR (f:Florist) REQUIRE f.id IS UNIQUE;
CREATE INDEX florist_status_index FOR (f:Florist) ON (f.status);

// Product constraints
CREATE CONSTRAINT product_variant_unique FOR (p:Product) REQUIRE p.shopify_variant_id IS UNIQUE;
CREATE INDEX product_florist_index FOR ()-[r:OFFERS]-() ON (r.florist_id);
```

---

### RDS Alembic Migrations

#### Initial Migration: Create Deliveries Table

```python
# alembic/versions/001_create_deliveries.py

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    op.create_table(
        'deliveries',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('property_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('florist_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('subscription_plan', sa.VARCHAR(20), nullable=False),
        sa.Column('status', sa.VARCHAR(20), nullable=False),
        sa.Column('scheduled_for', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('delivered_at', sa.TIMESTAMP(timezone=True)),
        sa.Column('shopify_product_id', sa.VARCHAR(255)),
        sa.Column('product_title', sa.VARCHAR(500)),
        sa.Column('product_price', sa.NUMERIC(10, 2)),
        sa.Column('delivery_instructions', sa.TEXT),
        sa.Column('delivery_photo_url', sa.VARCHAR(1024)),
        sa.Column('delivery_notes', sa.TEXT),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column('archived_at', sa.TIMESTAMP(timezone=True)),
        sa.Column('cancelled_at', sa.TIMESTAMP(timezone=True)),

        sa.CheckConstraint("status IN ('SCHEDULED', 'DELIVERED', 'SKIPPED', 'MISSED', 'CANCELLED')", name='valid_status'),
        sa.CheckConstraint("subscription_plan IN ('ESSENTIAL', 'SIGNATURE', 'STATEMENT')", name='valid_plan')
    )

    # Create indexes
    op.create_index('idx_deliveries_user_id', 'deliveries', ['user_id'])
    op.create_index('idx_deliveries_property_id', 'deliveries', ['property_id'])
    op.create_index('idx_deliveries_florist_id', 'deliveries', ['florist_id'])
    op.create_index('idx_deliveries_scheduled_for', 'deliveries', ['scheduled_for'])
    op.create_index('idx_deliveries_status', 'deliveries', ['status'])

def downgrade():
    op.drop_table('deliveries')
```

---

## Service Layer Implementation

### PropertyService

```python
# apps/api/services/property_service.py

from typing import List, Optional
from uuid import UUID
from neo4j import Session

class PropertyService:
    """Business logic for property management"""

    @staticmethod
    def get_enriched_properties(
        neo4j_session: Session,
        status: Optional[str] = None,
        offset: int = 0,
        limit: int = 50
    ) -> List[dict]:
        """Get all properties with enriched data (single query, no N+1)"""

        query = """
            MATCH (p:Property)
            WHERE ($status IS NULL OR p.status = $status)
            OPTIONAL MATCH (p)-[:ASSIGNED_TO {active: true}]->(f:Florist)
            OPTIONAL MATCH (p)-[:MANAGED_BY]->(pm:User {role: 'PROPERTY_MANAGER'})
            OPTIONAL MATCH (p)<-[:RESIDES_AT]-(resident:User {status: 'ACTIVE'})

            WITH p, f, pm,
                 count(DISTINCT resident) as total_residents,
                 count(DISTINCT CASE WHEN resident.subscription_status = 'ACTIVE'
                                     THEN resident END) as active_residents

            RETURN p, f, pm, total_residents, active_residents,
                   CASE
                     WHEN f IS NOT NULL AND pm IS NOT NULL THEN 'ACTIVE'
                     WHEN f IS NOT NULL THEN 'PENDING_PM'
                     WHEN pm IS NOT NULL THEN 'PENDING_FLORIST'
                     ELSE 'CREATED'
                   END as status

            ORDER BY p.created_at DESC
            SKIP $offset
            LIMIT $limit
        """

        result = neo4j_session.run(query, status=status, offset=offset, limit=limit)

        properties = []
        for record in result:
            prop = dict(record['p'])
            prop['status'] = record['status']
            prop['florist_id'] = record['f']['id'] if record['f'] else None
            prop['florist_name'] = record['f']['name'] if record['f'] else None
            prop['property_manager_id'] = record['pm']['id'] if record['pm'] else None
            prop['property_manager_email'] = record['pm']['email'] if record['pm'] else None
            prop['total_residents'] = record['total_residents']
            prop['active_residents'] = record['active_residents']
            properties.append(prop)

        return properties

    @staticmethod
    def create_property(neo4j_session: Session, data: dict) -> dict:
        """Create new property"""

        result = neo4j_session.run("""
            CREATE (p:Property {
                id: randomUUID(),
                name: $name,
                address: $address,
                city: $city,
                state: $state,
                zip_code: $zip_code,
                delivery_cadence: $delivery_cadence,
                delivery_instructions: $delivery_instructions,
                created_at: datetime(),
                updated_at: datetime()
            })
            RETURN p
        """, **data)

        return dict(result.single()['p'])

    @staticmethod
    def assign_florist(
        neo4j_session: Session,
        property_id: UUID,
        florist_id: UUID
    ) -> None:
        """Assign florist to property (deactivates previous assignments)"""

        # Deactivate existing assignments
        neo4j_session.run("""
            MATCH (p:Property {id: $property_id})-[r:ASSIGNED_TO]->(f:Florist)
            SET r.active = false,
                r.deactivated_at = datetime()
        """, property_id=str(property_id))

        # Create new assignment
        neo4j_session.run("""
            MATCH (p:Property {id: $property_id})
            MATCH (f:Florist {id: $florist_id})
            CREATE (p)-[:ASSIGNED_TO {
                active: true,
                created_at: datetime()
            }]->(f)
        """, property_id=str(property_id), florist_id=str(florist_id))
```

---

### DeliveryService

```python
# apps/api/services/delivery_service.py

from datetime import datetime, timezone, timedelta
from uuid import UUID, uuid4
from sqlalchemy.orm import Session as DBSession
from neo4j import Session as Neo4jSession

class DeliveryService:
    """Business logic for delivery scheduling and management"""

    @staticmethod
    def generate_deliveries_for_user(
        user_id: UUID,
        neo4j_session: Neo4jSession,
        db: DBSession
    ) -> int:
        """Generate deliveries for next 4 weeks based on property cadence"""

        # Get user details from Neo4j
        result = neo4j_session.run("""
            MATCH (u:User {id: $user_id})-[:RESIDES_AT]->(p:Property)
            MATCH (p)-[:ASSIGNED_TO {active: true}]->(f:Florist)
            MATCH (f)-[:MAPS_TO_TIER {tier: $plan, active: true}]->(product:Product)
            RETURN u, p, f, product
        """, user_id=str(user_id), plan=...)  # Get from user.subscription_plan

        data = result.single()
        if not data:
            raise ValueError("User, property, or florist not found")

        user = data['u']
        property = data['p']
        florist = data['f']
        product = data['product']

        # Parse delivery cadence (e.g., "WEEKLY_MONDAY")
        cadence, day = property['delivery_cadence'].split('_')

        # Calculate delivery dates for next 4 weeks
        delivery_dates = self._calculate_delivery_dates(
            cadence=cadence,
            day_of_week=day,
            weeks=4
        )

        # Create delivery records
        deliveries_created = 0
        for delivery_date in delivery_dates:
            delivery = Delivery(
                id=uuid4(),
                user_id=user_id,
                property_id=UUID(property['id']),
                florist_id=UUID(florist['id']),
                subscription_plan=user['subscription_plan'],
                status=DeliveryStatus.SCHEDULED,
                scheduled_for=delivery_date,
                shopify_product_id=product['shopify_product_id'],
                product_title=product['title'],
                product_price=product['price']
            )
            db.add(delivery)
            deliveries_created += 1

        db.commit()
        return deliveries_created

    @staticmethod
    def _calculate_delivery_dates(
        cadence: str,
        day_of_week: str,
        weeks: int
    ) -> List[datetime]:
        """Calculate delivery dates based on cadence"""

        day_map = {
            'MONDAY': 0, 'TUESDAY': 1, 'WEDNESDAY': 2,
            'THURSDAY': 3, 'FRIDAY': 4, 'SATURDAY': 5, 'SUNDAY': 6
        }
        target_day = day_map[day_of_week]

        dates = []
        current_date = datetime.now(timezone.utc).date()

        # Find next occurrence of target day
        days_ahead = target_day - current_date.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        next_delivery = current_date + timedelta(days=days_ahead)

        # Generate dates
        if cadence == 'WEEKLY':
            for i in range(weeks):
                delivery_datetime = datetime.combine(
                    next_delivery + timedelta(weeks=i),
                    datetime.min.time()
                ).replace(hour=10, minute=0, tzinfo=timezone.utc)
                dates.append(delivery_datetime)

        elif cadence == 'BIWEEKLY':
            for i in range(weeks // 2):
                delivery_datetime = datetime.combine(
                    next_delivery + timedelta(weeks=i*2),
                    datetime.min.time()
                ).replace(hour=10, minute=0, tzinfo=timezone.utc)
                dates.append(delivery_datetime)

        return dates
```

---

## Error Handling Patterns

### Global Exception Handler

```python
# apps/api/middleware/exceptions.py

from fastapi import Request, status
from fastapi.responses import JSONResponse
from uuid import uuid4
import logging

logger = logging.getLogger(__name__)

async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTPException with standard error envelope"""

    request_id = str(uuid4())

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.detail.get("code", "HTTP_ERROR") if isinstance(exc.detail, dict) else "HTTP_ERROR",
                "message": exc.detail.get("message", str(exc.detail)) if isinstance(exc.detail, dict) else str(exc.detail),
                "request_id": request_id
            }
        },
        headers={"X-Request-ID": request_id}
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors with field-level details"""

    request_id = str(uuid4())

    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": errors,
                "request_id": request_id
            }
        },
        headers={"X-Request-ID": request_id}
    )

async def generic_exception_handler(request: Request, exc: Exception):
    """Catch-all handler for unexpected errors"""

    request_id = str(uuid4())

    # Log the exception
    logger.error(
        f"Unhandled exception: {exc}",
        exc_info=True,
        extra={"request_id": request_id, "path": request.url.path}
    )

    # Send to Sentry
    if sentry_sdk:
        sentry_sdk.capture_exception(exc)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred",
                "request_id": request_id
            }
        },
        headers={"X-Request-ID": request_id}
    )
```

---

## Testing Strategy

### Unit Tests

```python
# apps/api/tests/test_property_service.py

import pytest
from uuid import uuid4
from services.property_service import PropertyService

def test_create_property(neo4j_session):
    """Test property creation"""

    data = {
        "name": "Test Property",
        "address": "123 Test St",
        "city": "New York",
        "state": "NY",
        "zip_code": "10001"
    }

    property = PropertyService.create_property(neo4j_session, data)

    assert property['name'] == "Test Property"
    assert property['id'] is not None
    assert property['created_at'] is not None

def test_get_enriched_properties_no_n_plus_one(neo4j_session, query_counter):
    """Test that get_enriched_properties uses single query"""

    query_counter.reset()

    properties = PropertyService.get_enriched_properties(neo4j_session)

    # Should be exactly 1 query (no N+1 problem)
    assert query_counter.count == 1
```

---

### Integration Tests

```python
# apps/api/tests/test_customer_onboarding.py

import pytest
from fastapi.testclient import TestClient

def test_customer_onboarding_flow(client: TestClient, neo4j_session, db_session):
    """Test complete customer onboarding flow"""

    # 1. Register
    response = client.post("/auth/register", json={
        "email": "newcustomer@example.com",
        "password": "SecurePass123!",
        "name": "New Customer"
    })
    assert response.status_code == 201
    tokens = response.json()['tokens']

    # 2. Select property
    property = create_test_property(neo4j_session)

    response = client.patch(
        "/me/property",
        json={"property_id": str(property['id']), "unit": "5B"},
        headers={"Authorization": f"Bearer {tokens['id_token']}"}
    )
    assert response.status_code == 200

    # 3. Select plan
    response = client.patch(
        "/me/plan",
        json={"plan": "SIGNATURE"},
        headers={"Authorization": f"Bearer {tokens['id_token']}"}
    )
    assert response.status_code == 200

    # 4. Activate subscription
    response = client.patch(
        "/me/subscription",
        json={"subscription_status": "ACTIVE"},
        headers={"Authorization": f"Bearer {tokens['id_token']}"}
    )
    assert response.status_code == 200

    # 5. Verify deliveries were generated
    deliveries = db_session.query(Delivery).filter_by(
        user_id=UUID(response.json()['id'])
    ).all()
    assert len(deliveries) > 0
```

---

## References

- [Domain Model](./domain-model.md)
- [High Level Design](./high-level-design.md)
- [System Design](./system-design.md)
- [Shopify Integration](./shopify-integration.md)

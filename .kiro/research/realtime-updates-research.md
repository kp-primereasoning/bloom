# Real-time Updates Architecture Research

## Research Date: December 30, 2025

## Overview

This document captures research findings on real-time update patterns for web applications, informing Bloom's approach to live data updates.

---

## Update Patterns Comparison

### 1. Polling
**Description**: Client periodically requests updates from server

```
Client                    Server
  |                         |
  |------- GET /data ------>|
  |<------ Response --------|
  |                         |
  |  (wait 30 seconds)      |
  |                         |
  |------- GET /data ------>|
  |<------ Response --------|
```

| Pros | Cons |
|------|------|
| Simple to implement | Inefficient (many requests) |
| Works everywhere | Latency (up to poll interval) |
| Stateless | Server load |
| Easy to debug | Battery drain (mobile) |

### 2. Long Polling
**Description**: Server holds request until data available

```
Client                    Server
  |                         |
  |------- GET /data ------>|
  |        (waiting...)     |
  |        (waiting...)     |
  |<------ Response --------|
  |                         |
  |------- GET /data ------>|
```

| Pros | Cons |
|------|------|
| Lower latency than polling | Connection management |
| Works through proxies | Server resources |
| Simpler than WebSockets | Timeout handling |

### 3. WebSockets
**Description**: Persistent bidirectional connection

```
Client                    Server
  |                         |
  |==== WebSocket Open ====>|
  |<==== Connection OK =====|
  |                         |
  |<---- Push Update -------|
  |<---- Push Update -------|
  |----- Send Message ----->|
  |<---- Push Update -------|
```

| Pros | Cons |
|------|------|
| Real-time (instant) | Complex infrastructure |
| Efficient (one connection) | Connection management |
| Bidirectional | Scaling challenges |
| Low latency | Proxy/firewall issues |

### 4. Server-Sent Events (SSE)
**Description**: Server pushes updates over HTTP

```
Client                    Server
  |                         |
  |------- GET /events ---->|
  |<---- Event Stream ------|
  |<---- data: update1 -----|
  |<---- data: update2 -----|
  |<---- data: update3 -----|
```

| Pros | Cons |
|------|------|
| Simple (HTTP-based) | One-way only |
| Auto-reconnect | Limited browser connections |
| Works with HTTP/2 | No binary data |
| Easy to implement | Less flexible than WS |

---

## Bloom's Real-time Needs

### Use Cases
| Feature | Update Frequency | Latency Tolerance |
|---------|------------------|-------------------|
| Order status | Minutes | High (5+ min OK) |
| Delivery tracking | Minutes | Medium (1-5 min) |
| Dashboard metrics | Hours | Very high |
| Notifications | Immediate | Low (< 30 sec) |

### Analysis
- Most Bloom data is NOT time-critical
- Order status changes are infrequent
- Dashboard data can be stale by minutes
- Only notifications benefit from real-time

---

## Recommendation for Bloom

### MLP: Polling
**Rationale**: Simplicity over real-time

```
Polling Strategy:
├── Dashboard: Poll every 60 seconds
├── Order list: Poll every 30 seconds
├── Delivery status: Poll every 60 seconds
└── User profile: No polling (fetch on load)
```

### Implementation
```javascript
// React Query example
const { data } = useQuery({
  queryKey: ['orders'],
  queryFn: fetchOrders,
  refetchInterval: 30000, // 30 seconds
  staleTime: 15000, // Consider stale after 15s
});
```

### Benefits for MLP
1. **Simple**: No WebSocket infrastructure
2. **Reliable**: Works everywhere
3. **Debuggable**: Standard HTTP requests
4. **Scalable**: Stateless servers

---

## Future: WebSockets (Phase 2+)

### When to Add WebSockets
- Real-time chat feature
- Live delivery tracking
- Instant notifications
- Collaborative features

### AWS Options
1. **API Gateway WebSocket**: Managed WebSocket API
2. **AWS AppSync**: GraphQL subscriptions
3. **Self-hosted**: Socket.io on App Runner

### API Gateway WebSocket
```
Benefits:
├── Fully managed
├── Auto-scaling
├── Pay per message
└── Lambda integration

Considerations:
├── 2-hour connection limit
├── 128KB message limit
└── Additional complexity
```

---

## Notification Patterns

### In-App Notifications
```
Options:
├── Polling: Check /notifications every 30s
├── SSE: Stream notifications
└── WebSocket: Push notifications
```

### Recommended: Polling + Toast
```javascript
// Poll for new notifications
const { data: notifications } = useQuery({
  queryKey: ['notifications'],
  queryFn: fetchNotifications,
  refetchInterval: 30000,
});

// Show toast for new items
useEffect(() => {
  if (notifications?.unread > prevUnread) {
    toast("You have new notifications");
  }
}, [notifications]);
```

---

## Optimizing Polling

### Strategies
1. **Conditional requests**: Use ETags/Last-Modified
2. **Delta updates**: Only fetch changes
3. **Adaptive polling**: Increase interval when inactive
4. **Background sync**: Use Service Workers

### Conditional Requests
```javascript
// Server returns 304 if unchanged
fetch('/api/orders', {
  headers: {
    'If-None-Match': lastETag
  }
});
```

### Adaptive Polling
```javascript
// Slow down when tab not visible
const interval = document.hidden ? 120000 : 30000;
```

---

## Data Freshness Indicators

### UI Patterns
```
┌─────────────────────────────────────────┐
│  Orders                    Updated 30s ago │
│  ─────────────────────────────────────  │
│  [Refresh] button if stale              │
└─────────────────────────────────────────┘
```

### Implementation
```javascript
const { data, dataUpdatedAt } = useQuery({...});

const staleness = Date.now() - dataUpdatedAt;
const isStale = staleness > 60000; // 1 minute
```

---

## Implementation Recommendations for Bloom

### Phase 1: MLP
1. Simple polling with React Query
2. 30-60 second intervals
3. Manual refresh buttons
4. No WebSocket infrastructure

### Phase 2: Enhanced
1. Conditional requests (ETags)
2. Adaptive polling
3. Background tab handling
4. Freshness indicators

### Phase 3: Real-time
1. WebSocket for notifications
2. Live delivery tracking
3. Real-time dashboard updates
4. Push notifications (mobile)

---

## API Design for Polling

### Efficient Endpoints
```
GET /api/orders?since=2025-01-01T00:00:00Z
  → Returns only orders updated since timestamp

GET /api/dashboard/summary
  → Returns aggregated metrics (single request)

GET /api/notifications?unread=true
  → Returns only unread notifications
```

### Response Headers
```
ETag: "abc123"
Last-Modified: Mon, 30 Dec 2025 10:00:00 GMT
Cache-Control: max-age=30
```

---

## Sources

- Web real-time communication patterns
- AWS WebSocket API documentation
- React Query documentation
- Performance optimization best practices

*Content was rephrased for compliance with licensing restrictions*

# Smart Emergency Response System - System Architecture

## Executive Summary

A real-time emergency response coordination platform designed to ingest incident events, intelligently assign resources based on multi-factor optimization, manage automated escalations, and provide live notifications to responders and operational stakeholders.

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                                 │
│                   Mobile Application (React Native)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Dashboard   │  │  Incidents   │  │  Resources   │              │
│  │  Monitoring  │  │  Management  │  │  Tracking    │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                              ▲ ▼
                    WebSocket (Socket.io) + REST API
                              ▲ ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                                 │
│                    Backend Services (Node.js + Fastify)              │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │              REAL-TIME EVENT PROCESSOR                      │    │
│  │  - Incident Ingestion    - Event Validation                │    │
│  │  - Priority Calculation  - Real-time Broadcasting          │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              ▲ ▼                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   INCIDENT   │  │   RESOURCE   │  │  ASSIGNMENT  │             │
│  │   SERVICE    │  │   SERVICE    │  │   ENGINE     │             │
│  │              │  │              │  │              │             │
│  │ - Create     │  │ - Track      │  │ - Smart      │             │
│  │ - Categorize │  │ - Update     │  │   Matching   │             │
│  │ - Escalate   │  │ - Capacity   │  │ - Optimize   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                              ▲ ▼                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  ESCALATION  │  │ NOTIFICATION │  │   ANALYTICS  │             │
│  │    ENGINE    │  │   SERVICE    │  │   SERVICE    │             │
│  │              │  │              │  │              │             │
│  │ - Rules      │  │ - Push       │  │ - Metrics    │             │
│  │ - Timers     │  │ - SMS/Email  │  │ - Reports    │             │
│  │ - Auto-raise │  │ - Multi-ch   │  │ - Insights   │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────────────┘
                              ▲ ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                       │
│                     Database (MongoDB)                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │  Incidents   │  │  Resources   │  │ Assignments  │             │
│  │  Collection  │  │  Collection  │  │  Collection  │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│  ┌──────────────┐  ┌──────────────┐                                │
│  │ Escalations  │  │Notifications │                                │
│  │  Collection  │  │  Collection  │                                │
│  └──────────────┘  └──────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Incident Management Service

**Responsibilities:**
- Real-time incident ingestion via REST API
- Automatic categorization by type (fire, medical, security, water, power)
- Dynamic priority calculation based on severity, type, and escalation level
- Status lifecycle management (open → assigned → in-progress → resolved → closed)
- Geospatial querying for location-based operations

**Key Features:**
- Priority scoring algorithm for intelligent triage
- Status transition validation and auditing
- Geospatial indexing for proximity-based queries
- Real-time statistics and metrics aggregation

### 2. Resource Management Service

**Responsibilities:**
- Unit tracking (ambulances, fire trucks, security personnel, maintenance crews)
- Real-time status management (available, dispatched, busy, offline)
- Capacity utilization monitoring
- GPS location tracking and updates
- Skills and equipment inventory management

**Key Features:**
- Geospatial queries for nearest available resources
- Type-based resource filtering
- Capacity-aware availability checks
- Historical utilization analytics

### 3. Smart Assignment Engine

**Multi-Factor Optimization Algorithm:**

The assignment engine evaluates potential resource assignments using a weighted scoring system:

```
Assignment Score = (Distance Factor × 0.35) + 
                   (Availability Factor × 0.25) + 
                   (Type Match Factor × 0.20) + 
                   (Workload Factor × 0.15) + 
                   (Priority Factor × 0.05)
```

**Factor Breakdown:**

- **Distance (35%)**: Haversine formula calculation, normalized against 50km maximum
- **Availability (25%)**: Current capacity utilization (lower is better)
- **Type Match (20%)**: Perfect match (1.0) vs acceptable match (0.3)
- **Workload (15%)**: Historical assignment count in last 24 hours
- **Priority (5%)**: Incident priority score bonus for critical cases

**Advanced Features:**
- Dynamic re-routing for critical incidents
- Assignment history tracking
- ETA calculation based on distance and average emergency speed
- Rejection and reassignment handling

### 4. Escalation Engine

**Rule-Based Automation:**

| Escalation Type | Trigger Condition | Threshold | Action |
|----------------|-------------------|-----------|---------|
| Time-Based | Incident unassigned | 5 minutes | Notify supervisors |
| Time-Based | No progress after assignment | 15 minutes | Escalate to manager |
| Severity-Based | Critical incident created | Immediate | Alert all supervisors |
| Capacity-Based | All resources busy | Real-time | Request external resources |

**Features:**
- Automatic escalation monitoring
- Manual escalation with reason tracking
- Acknowledgment workflow
- Escalation resolution tracking
- Historical escalation analytics

### 5. Notification Service

**Multi-Channel Delivery:**
- In-app notifications (WebSocket push)
- SMS notifications (Twilio integration ready)
- Email notifications (SendGrid integration ready)
- Push notifications (FCM integration ready)

**Notification Types:**
- Incident lifecycle events (created, assigned, escalated, resolved)
- Resource assignment alerts
- System-wide alerts
- Status change notifications

**Features:**
- Priority-based delivery
- Retry mechanism for failed deliveries
- Read status tracking
- Notification history with TTL
- Delivery statistics and failure rate monitoring

---

## Data Flow

### Incident Creation Flow

```
1. POST /api/incidents → Incident Event
2. Validate request payload
3. Calculate priority score
4. Save to MongoDB
5. Broadcast via WebSocket to all operators
6. Trigger Assignment Engine
7. Execute smart matching algorithm
8. Create assignment record
9. Update resource status
10. Send notification to assigned resource
11. Update all connected dashboards in real-time
```

### Resource Location Update Flow

```
1. POST /api/resources/:id/location → Location Event
2. Validate coordinates
3. Update resource document
4. Broadcast location update via WebSocket
5. Check for pending reassignments
6. Recalculate ETAs for active assignments
7. Update dashboards
```

### Escalation Flow

```
1. Background monitor checks active incidents
2. Evaluate escalation rules
3. Detect rule violations
4. Create escalation record
5. Increment incident escalation level
6. Recalculate priority score
7. Send notifications to supervisors
8. Re-trigger assignment engine if needed
9. Log escalation event
```

---

## Data Models

### Incident Schema

```typescript
{
  incident_id: string (unique, indexed)
  type: enum [medical, fire, security, water, power]
  severity: enum [low, medium, high, critical]
  location: {
    lat: number
    lng: number
    address?: string
  } (geospatial 2dsphere index)
  description: string
  reporter: {
    name: string
    contact: string
    email?: string
  }
  status: enum [open, assigned, in-progress, resolved, closed]
  priority_score: number (calculated, indexed)
  assigned_resource?: ObjectId (ref: Resource)
  escalation_level: number (default: 0)
  created_at: Date (indexed)
  updated_at: Date
  resolved_at?: Date
  closed_at?: Date
  metadata?: Object
}
```

**Indexes:**
- Single: incident_id, type, severity, status, priority_score, created_at
- Compound: (status, priority_score), (status, created_at), (type, status)
- Geospatial: location (2dsphere)

### Resource Schema

```typescript
{
  unit_id: string (unique, indexed)
  type: enum [ambulance, fire_truck, security, maintenance, police]
  status: enum [available, dispatched, busy, offline]
  location: {
    lat: number
    lng: number
  } (geospatial 2dsphere index)
  capacity: {
    current: number
    max: number
  }
  assigned_to?: ObjectId (ref: Incident)
  skills: string[]
  crew_size?: number
  equipment?: string[]
  contact?: string
  last_updated: Date
  metadata?: Object
}
```

**Indexes:**
- Single: unit_id, type, status
- Compound: (type, status), (status, location)
- Geospatial: location (2dsphere)

### Assignment Schema

```typescript
{
  incident_id: ObjectId (ref: Incident, indexed)
  resource_id: ObjectId (ref: Resource, indexed)
  assigned_at: Date (indexed)
  accepted_at?: Date
  started_at?: Date
  completed_at?: Date
  cancelled_at?: Date
  status: enum [pending, accepted, in-progress, completed, cancelled, rejected]
  distance: number (km)
  eta: number (minutes)
  actual_response_time?: number (minutes)
  score: number (assignment optimization score)
  notes?: string
  metadata?: Object
}
```

**Indexes:**
- Compound: (incident_id, status), (resource_id, status), (status, assigned_at)

---

## Technology Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Backend Framework** | Fastify | 3x faster than Express, built-in schema validation, plugin architecture |
| **Real-time Communication** | Socket.io | Bi-directional WebSocket with fallbacks, room-based broadcasting, auto-reconnection |
| **Database** | MongoDB | Geospatial queries, flexible schema, horizontal scaling, change streams |
| **Language** | TypeScript | Type safety, improved developer experience, maintainability |
| **Mobile** | React Native | Cross-platform, single codebase, native performance |

---

## Key Engineering Decisions

### Why Fastify over Express?

- **Performance**: 3x faster request handling, optimized for high throughput
- **Schema Validation**: Built-in JSON Schema validation reduces boilerplate
- **Plugin System**: Modular architecture for better code organization
- **Async/Await**: First-class async support, no callback hell

### Why MongoDB?

- **Geospatial Queries**: Native support for 2dsphere indexes and $near operators
- **Flexible Schema**: Different incident types can have varied metadata without migrations
- **Change Streams**: Real-time data synchronization capabilities
- **Horizontal Scaling**: Sharding for city-level scale (10,000+ incidents/day)

### Why Socket.io over Native WebSocket?

- **Abstraction**: Handles connection lifecycle, reconnection, heartbeats
- **Rooms**: Efficient broadcasting to user groups (operators, responders)
- **Fallback**: Auto-degrades to long-polling if WebSocket unavailable
- **Acknowledgment**: Built-in event acknowledgment system

### Smart Assignment Algorithm Design

The weighting system prioritizes factors based on emergency response research:

- **Distance (35%)**: Primary factor - faster arrival saves lives
- **Availability (25%)**: Prevents resource overload and burnout
- **Type Matching (20%)**: Ensures appropriate expertise
- **Workload Distribution (15%)**: Fairness and prevents single-point bottlenecks
- **Priority Boost (5%)**: Minor adjustment for critical incidents without dominating decision

---

## Scalability Strategy

### Horizontal Scaling Approach

**Application Layer:**
- Stateless backend services enable unlimited pod replication
- Load balancer distributes API requests across instances
- Socket.io with Redis adapter for cross-server messaging (future)

**Database Layer:**
- MongoDB replica set for read scaling
- Sharding by geographic region for write scaling
- Separate read replicas for analytics queries

**Caching Strategy:**
- Redis for hot data (active incidents, available resources)
- In-memory caching for frequently accessed configurations
- Edge caching for static mobile app assets

### Performance Optimizations

**Database:**
- Compound indexes for common query patterns
- Geospatial indexes for O(log n) location queries
- Connection pooling to reduce overhead
- Query result caching for dashboard statistics

**Real-time Communication:**
- Room-based Socket.io broadcasting (O(n) per room vs O(n^2) for all)
- Event debouncing for high-frequency updates (location: max 1/5sec)
- Payload compression for mobile clients

**API:**
- Pagination for list endpoints
- Field filtering to reduce payload size
- Response caching for immutable resources
- Rate limiting to prevent abuse

### City-Level Scale Targets

- **Throughput**: 10,000+ incidents/day, 500+ concurrent resources
- **Latency**: <100ms assignment decision time, <1s notification delivery
- **Availability**: 99.9% uptime with automatic failover
- **Concurrency**: 1,000+ simultaneous WebSocket connections

---

## Security Considerations

**Authentication & Authorization:**
- JWT-based authentication for API and WebSocket connections
- Role-based access control (admin, operator, responder, public)
- Token refresh mechanism for mobile apps

**Data Protection:**
- TLS 1.3 for all transport encryption
- MongoDB encryption at rest
- Sensitive data (contact info) field-level encryption
- PII data retention policies and auto-purging

**API Security:**
- JSON Schema validation on all endpoints
- Rate limiting per IP/user (100 req/min default)
- CORS configuration for allowed origins
- Input sanitization to prevent injection attacks

**Monitoring & Auditing:**
- Structured logging with correlation IDs
- Security event logging (failed auth, suspicious activity)
- Audit trail for critical operations (escalations, manual assignments)

---

## Design Trade-offs

| Decision | Alternative | Rationale |
|----------|-------------|-----------|
| MongoDB | PostgreSQL + PostGIS | Native geospatial support, faster prototyping, schema flexibility |
| Fastify | Express.js | Performance-critical for real-time, smaller memory footprint |
| Socket.io | Native WebSocket | Abstracts complexity, production-tested, room support |
| Monolith | Microservices | Simpler deployment, lower latency, easier debugging for POC |
| React Native | Flutter | JavaScript ecosystem consistency, larger community |
| In-memory Assignment | Queue-based | Real-time requirement (<1s), simplifies architecture |

---


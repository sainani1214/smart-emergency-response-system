# Smart Emergency Response System - Architecture

## Overview
A real-time emergency response coordination platform with mobile-first design, intelligent resource assignment, and automated escalations.

**Key Features:**
- 🚨 Real-time incident tracking with WebSocket integration
- 🎯 Smart resource assignment using proximity-based algorithms  
- 📱 Mobile dashboard with live map visualization
- 🔔 Real-time notification system
- ⚠️ Automated escalation engine

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Frontend (React Native)                     │
│  Dashboard │ Map View │ Resources │ Notifications │ Report  │
└─────────────────────────────────────────────────────────────┘
                              ▲ ▼
                    WebSocket + REST API
                              ▲ ▼
┌─────────────────────────────────────────────────────────────┐
│                Backend (Node.js + Fastify)                  │
│  Incident │ Assignment │ Resource │ Notification │ Socket   │
│  Service  │  Service   │ Service  │   Service    │ Service  │
└─────────────────────────────────────────────────────────────┘
                              ▲ ▼
┌─────────────────────────────────────────────────────────────┐
│                    MongoDB Atlas                            │
│  Incidents │ Resources │ Assignments │ Notifications       │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### Frontend (React Native + Expo)
- **Dashboard**: Real-time stats and active incidents
- **Map View**: Live resource tracking and incident locations
- **Incident Reporting**: Form-based incident creation
- **Notifications**: Real-time alerts and updates
- **Resource Management**: Resource status and assignments

### Backend Services (Node.js + Fastify)
- **Incident Service**: CRUD operations, status management
- **Assignment Service**: Smart resource matching algorithm
- **Resource Service**: Location tracking, availability management  
- **Notification Service**: Multi-channel notifications
- **Socket Service**: Real-time WebSocket events
- **Simulation Service**: Automated incident generation for testing

### Database (MongoDB Atlas)
```javascript
// Core Data Models
Incident: {
  incident_id, type, severity, location, status,
  assigned_resource, priority_score, timestamps
}

Resource: {
  unit_id, type, status, location, capabilities,
  current_assignment, availability
}

Assignment: {
  incident_id, resource_id, distance, eta,
  score, status, timestamps
}

Notification: {
  type, recipient, title, message, channel,
  priority, status, related_incident
}
```

## API Endpoints

### Incidents
- `POST /incidents` - Create incident with auto-assignment
- `GET /incidents` - List incidents with filters
- `GET /incidents/:id` - Get incident details
- `PATCH /incidents/:id/status` - Update incident status

### Resources  
- `GET /resources` - List resources with availability
- `PATCH /resources/:id/status` - Update resource status
- `PATCH /resources/:id/location` - Update resource location

### Assignments
- `POST /assignments/smart` - Trigger smart assignment
- `GET /assignments` - List assignments

### Notifications
- `GET /notifications` - Get user notifications
- `PATCH /notifications/:id/read` - Mark as read

## Smart Assignment Algorithm

```javascript
// Assignment scoring formula
score = (proximityWeight * proximityScore) + 
        (availabilityWeight * availabilityScore) + 
        (capabilityWeight * capabilityScore)

// Factors considered:
- Distance to incident (primary factor)
- Resource availability and current load
- Resource type compatibility with incident
- Resource capability match
- Current assignments and capacity
```

## Real-time Features

### WebSocket Events
- `incident:created` - New incident broadcast
- `incident:updated` - Status changes
- `incident:assigned` - Resource assignment
- `resource:updated` - Resource status changes
- `notification:new` - Real-time notifications

### Live Updates
- Dashboard statistics refresh automatically
- Map markers update in real-time
- Notification badges update instantly
- Resource status reflects immediately

## Technology Stack

**Frontend:**
- React Native + Expo
- TypeScript
- Socket.io Client
- React Navigation
- Expo Location/Maps

**Backend:**
- Node.js + Fastify
- TypeScript  
- Socket.io Server
- MongoDB + Mongoose
- JWT Authentication

**Infrastructure:**
- MongoDB Atlas (Database)
- Local development environment
- WebSocket for real-time communication

## Key Features

### 1. Incident Management
- Multi-type incident support (medical, fire, security, etc.)
- Severity-based prioritization
- Automated status transitions
- Location-based incident mapping

### 2. Resource Assignment
- Proximity-based smart matching
- Real-time availability checking
- Multi-factor scoring algorithm
- Automatic assignment on incident creation

### 3. Real-time Notifications
- In-app notification center
- WebSocket-based instant updates
- Priority-based notification routing
- Read/unread status tracking

### 4. Live Dashboard
- Real-time incident statistics
- Active incident monitoring
- Resource utilization metrics
- Apple-inspired modern UI design

### 5. Simulation & Testing
- Automated incident generation
- Resource seeding for development
- Configurable simulation parameters
- Real-time testing capabilities

## Development Setup

1. **Backend**: `cd backend && npm install && npm run dev`
2. **Frontend**: `cd frontend && npm install && npm start`
3. **Database**: MongoDB Atlas connection configured
4. **Environment**: Local development with hot reloading

## Future Enhancements

- Push notifications for mobile devices
- GPS tracking for resource vehicles
- Advanced analytics and reporting
- Multi-tenant organization support
- Integration with external emergency systems
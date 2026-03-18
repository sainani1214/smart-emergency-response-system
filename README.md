# Smart Emergency Response System

Real-time emergency coordination platform for communities, campuses, and industrial facilities. Intelligently assigns resources, manages escalations, and delivers live notifications to responders.

## Key Features

- Real-time incident ingestion and tracking
- Smart resource assignment using multi-factor optimization
- Automated rule-based escalation
- Live WebSocket notifications
- Geospatial proximity matching
- Mobile-first dashboard for monitoring and action

## Quick Links

- **[Architecture Documentation](./architecture/ARCHITECTURE.md)** - System design, algorithms, and technical decisions
- **[API Reference](#api-endpoints)** - REST API documentation
- **[WebSocket Events](#websocket-events)** - Real-time event specifications

## Technology Stack

**Backend:** Node.js • Fastify • TypeScript • MongoDB • Socket.io  
**Frontend:** React Native • Expo • TypeScript

## Project Structure

```
smart-emergency-response-system/
├── architecture/
│   └── ARCHITECTURE.md          # System architecture documentation
├── backend/
│   ├── src/
│   │   ├── models/              # MongoDB schemas (Incident, Resource, Assignment, etc.)
│   │   ├── modules/
│   │   │   ├── incident/        # Incident management service & routes
│   │   │   ├── resource/        # Resource management service & routes
│   │   │   ├── assignment/      # Smart assignment engine & routes
│   │   │   ├── escalation/      # Escalation engine
│   │   │   └── notification/    # Notification service
│   │   ├── services/
│   │   │   └── socket.service.ts # WebSocket event handling
│   │   ├── config/              # Configuration and database connection
│   │   ├── utils/               # Helper functions (distance calculation, etc.)
│   │   ├── app.ts               # Fastify application setup
│   │   └── server.ts            # Server entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
└── frontend/                    # React Native mobile app
    ├── src/
    │   ├── components/          # Reusable UI components (IncidentCard, ResourceCard)
    │   ├── screens/             # Main screens (Dashboard, Resources)
    │   ├── services/            # API and WebSocket services
    │   ├── types/               # TypeScript interfaces
    │   └── constants/           # Theme and configuration
    ├── App.tsx
    └── package.json
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+
- npm or yarn
- Expo CLI (for mobile app)

### Backend Setup

**1. Install dependencies**
```bash
cd backend
npm install
```

**2. Configure environment**
```bash
cp .env.example .env
# Edit .env with your MongoDB URI
```

**3. Start MongoDB**
```bash
# macOS
brew services start mongodb-community

# Docker
docker run -d -p 27017:27017 mongo:latest
```

**4. Run the server**
```bash
# Development (hot reload)
npm run dev

# Production
npm run build && npm start
```

Server runs on `http://localhost:3000`

### Frontend Setup

**1. Install dependencies**
```bash
cd frontend
npm install
```

**2. Configure API endpoint**

For testing on physical device, update `src/constants/theme.ts`:
```typescript
export const API_BASE_URL = 'http://YOUR_IP:3000/api';
export const WEBSOCKET_URL = 'http://YOUR_IP:3000';
```

**3. Start the app**
```bash
# Start Expo dev server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

### Full System Test

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm start`
3. Create incident via mobile app or API
4. Watch real-time updates in mobile dashboard

---

## API Endpoints

**Base URL:** `http://localhost:3000/api`

### Incidents

#### Create Incident

```http
POST /api/incidents
Content-Type: application/json

{
  "type": "medical",
  "severity": "high",
  "location": {
    "lat": 18.521,
    "lng": 73.857,
    "address": "Building A, Floor 3"
  },
  "description": "Patient experiencing chest pain",
  "reporter": {
    "name": "John Doe",
    "contact": "+1234567890",
    "email": "john@example.com"
  }
}
```

#### Get All Incidents

```http
GET /api/incidents?status=open&type=medical&limit=50&skip=0
```

#### Get Incident by ID

```http
GET /api/incidents/:incident_id
```

#### Update Incident Status

```http
PATCH /api/incidents/:incident_id/status
Content-Type: application/json

{
  "status": "resolved"
}
```

**Get Statistics**
```http
GET /api/incidents/stats/summary
```

### Resources

**Create Resource**

```http
POST /api/resources
Content-Type: application/json

{
  "type": "ambulance",
  "location": {
    "lat": 18.530,
    "lng": 73.860
  },
  "capacity": {
    "max": 2
  },
  "skills": ["emergency_medical", "patient_transport"],
  "crew_size": 3,
  "contact": "+1234567891"
}
```

**Get All Resources**
```http
GET /api/resources?status=available&type=ambulance
```

**Update Status**

```http
PATCH /api/resources/:unit_id/status
Content-Type: application/json

{
  "status": "available"
}
```

**Update Location**

```http
PATCH /api/resources/:unit_id/location
Content-Type: application/json

{
  "lat": 18.532,
  "lng": 73.862
}
```

### Assignments

**Trigger Smart Assignment**

```http
POST /api/assignments/match
Content-Type: application/json

{
  "incidentId": "INC1024"
}
```

**Get All Assignments**
```http
GET /api/assignments
```

**Update Status**

```http
PATCH /api/assignments/:id/status
Content-Type: application/json

{
  "status": "accepted"
}
```

---

## WebSocket Events

Connect to WebSocket server at `ws://localhost:3000`

### Client → Server

```javascript
// Subscribe to room
socket.emit('subscribe', 'operators');

// Unsubscribe from room
socket.emit('unsubscribe', 'operators');
```

### Server → Client

```javascript
// Incident events
socket.on('incident:created', (incident) => { });
socket.on('incident:updated', (incident) => { });
socket.on('incident:assigned', ({ incident, resource, assignment }) => { });
socket.on('incident:escalated', ({ incident, escalation }) => { });

// Resource events
socket.on('resource:created', (resource) => { });
socket.on('resource:status_changed', (resource) => { });
socket.on('resource:location_updated', (resource) => { });

// Assignment events
socket.on('assignment:created', (assignment) => { });

// Notifications
socket.on('notification', (notification) => { });
```

---

## Quick Test

**Create Incident**

```bash
curl -X POST http://localhost:3000/api/incidents \
  -H "Content-Type: application/json" \
  -d '{
    "type": "medical",
    "severity": "critical",
    "location": {"lat": 18.521, "lng": 73.857},
    "description": "Cardiac arrest reported",
    "reporter": {"name": "Security Desk", "contact": "+1234567890"}
  }'
```

**Create Resource**

```bash
curl -X POST http://localhost:3000/api/resources \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ambulance",
    "location": {"lat": 18.530, "lng": 73.860},
    "capacity": {"max": 2},
    "skills": ["emergency_medical"]
  }'
```

**Trigger Assignment**

```bash
curl -X POST http://localhost:3000/api/assignments/match \
  -H "Content-Type: application/json" \
  -d '{"incidentId": "INC..."}'
```

---

## Mobile App Features

- **Real-time Dashboard**: Live incident tracking with WebSocket updates
- **Resource Management**: View and track all emergency response resources
- **Smart Notifications**: Instant alerts for new incidents and escalations
- **Statistics Overview**: Real-time system metrics
- **Pull to Refresh**: Manual data synchronization
- **Connection Status**: Visual indicator for WebSocket connection
- **Auto-reconnect**: Resilient WebSocket connection handling

## Development

**Backend Structure:**
- `models/` - Mongoose schemas with indexes
- `modules/` - Feature modules (service + routes)
- `services/` - Shared services (WebSocket)
- `config/` - Configuration and database
- `utils/` - Helper functions (distance, scoring)

**Frontend Structure:**
- `components/` - Reusable UI components
- `screens/` - Main application screens
- `services/` - API client and WebSocket service
- `types/` - TypeScript type definitions
- `constants/` - Theme and configuration

**Adding Features:**
1. Backend: Create model → Implement service → Add routes → Register in `app.ts`
2. Frontend: Create component → Add screen → Connect API → Update navigation
3. Update ARCHITECTURE.md with design decisions

See [ARCHITECTURE.md](./architecture/ARCHITECTURE.md) for design patterns, optimization strategies, and technical decisions.

---

## Contributing

```bash
git checkout -b feat/your-feature
git commit -m "feat: add your feature"
git push origin feat/your-feature
```

**Commit conventions:** `feat:` `fix:` `docs:` `refactor:` `perf:` `test:`

---

**Built with** Node.js • Fastify • MongoDB • Socket.io • React Native • TypeScript

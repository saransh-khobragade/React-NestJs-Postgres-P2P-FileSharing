# React + NestJS + Postgres (CRUD + P2P File Sharing)

Full‑stack P2P File Sharing app with React (frontend), NestJS (backend), and Postgres, plus WebRTC-based peer-to-peer file sharing.

## 🚀 Quick start (Docker)

```bash
# Build and start selected services (or use "all")
./scripts/build.sh all

# Or only app core
./scripts/build.sh frontend backend postgres pgadmin

## Services

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Swagger: http://localhost:8080/api
- P2P File Sharing: http://localhost:3000/p2p
- pgAdmin: http://localhost:5050 (admin@admin.com / admin)
```

To start everything:

```bash
./scripts/build.sh all
```

## ♻️ Rebuild workflow

Use a single script with two modes:

```bash
# For config/env updates → SOFT (no image build)
./scripts/rebuild.sh <service|all> soft

# For code/Dockerfile changes → HARD (rebuild image)
./scripts/rebuild.sh <service|all> hard
```

Examples:

```bash
# After backend code edits
./scripts/rebuild.sh backend hard

# Recreate frontend to pick up env/static content changes
./scripts/rebuild.sh frontend soft
```

Supported services: `frontend backend postgres pgadmin`. Use `all` for everything.

## Database access

pgAdmin is included for DB administration at http://localhost:5050 (default: admin@admin.com / admin). Default Postgres connection inside Docker uses host `postgres`, port `5432`.

## 🧑‍💻 Local frontend dev

```bash
cd frontend
yarn install
yarn dev   # http://localhost:3000
```

## 🧑‍💻 Local frontend dev

```bash
cd backend
yarn install
yarn start   # http://localhost:8080
```

## 🏗️ Architecture Overview

### System Architecture
```
┌─────────────────┐    HTTP/WS    ┌─────────────────┐    SQL    ┌─────────────────┐
│   Frontend      │◄─────────────►│   Backend       │◄─────────►│   PostgreSQL    │
│   (React)       │               │   (NestJS)      │           │   Database      │
│                 │               │                 │           │                 │
│ • Auth Pages    │               │ • Auth Module   │           │ • users         │
│ • Chat UI       │               │ • Users Module  │           │ • conversations │
│ • P2P File UI   │               │ • Chat Module   │           │ • messages      │
│ • WebRTC Client │               │ • Signal Module │           │ • blogs         │
└─────────────────┘               └─────────────────┘           └─────────────────┘
         │                                  │
         │ WebRTC P2P                       │
         ▼                                  ▼
┌─────────────────┐               ┌─────────────────┐
│   Peer Client   │               │   Socket.IO     │
│   (Browser)     │               │   Gateway       │
│                 │               │                 │
│ • DataChannel   │               │ • Chat Events   │
│ • File Transfer │               │ • P2P Signaling │
└─────────────────┘               └─────────────────┘
```

### Stack Components
- **Frontend**: React + TypeScript + Vite + Shadcn UI
- **Backend**: NestJS + TypeORM (Postgres) + JWT Auth
- **Database**: PostgreSQL (Docker)
- **Real-time**: Socket.IO (chat) + WebRTC (P2P file sharing)
- **Auth**: JWT tokens stored in localStorage

### Key Modules
- **Auth Module**: Login/signup with JWT strategy and guards
- **Users Module**: CRUD operations and user search
- **Chat Module**: Conversation/Message entities with Socket.IO gateway
- **Signal Module**: WebRTC signaling server for P2P file sharing
- **Blogs Module**: Sample CRUD functionality

### Database Schema
```
┌─────────────┐    ┌─────────────────────┐    ┌─────────────┐
│    users    │    │conversation_participants│    │conversations│
│             │    │                     │    │             │
│ • id (PK)   │◄───┤ • conversation_id   │───►│ • id (PK)   │
│ • name      │    │ • user_id           │    │ • created_at│
│ • email     │    │ • PRIMARY KEY       │    └─────────────┘
│ • password  │    └─────────────────────┘            │
│ • created_at│                                      │
└─────────────┘                                      │
       │                                              │
       │                                              │
┌─────────────┐    ┌─────────────┐                   │
│   messages  │    │    blogs    │                   │
│             │    │             │                   │
│ • id (PK)   │    │ • id (PK)   │                   │
│ • conversation_id│◄───┤ • title     │                   │
│ • sender_id │    │ • content   │                   │
│ • content   │    │ • author_id │                   │
│ • created_at│    │ • created_at│                   │
└─────────────┘    └─────────────┘                   │
       │                                              │
       └──────────────────────────────────────────────┘
```

## 📁 P2P File Sharing

The app includes a minimal peer-to-peer file sharing feature using WebRTC:

### How to use:
1. **Create/Join Room**: Visit http://localhost:3000/p2p
   - Enter your name
   - Create a new room or join existing one with room ID
2. **Share Files**: On the room page
   - See connected peers in the same room
   - Click "Connect" next to a peer to establish WebRTC connection
   - Select a file to send (transferred via DataChannel)
   - Receiver gets a download link when transfer completes

### Technical Details:
- **Backend**: NestJS signaling server only (no file storage)
  - REST: `POST /api/rooms` (create), `GET /api/rooms/:id` (info)
  - WebSocket: `/signal` namespace for SDP/ICE exchange
- **Frontend**: React + WebRTC DataChannel
  - Chunked file transfer
  - In-memory rooms (no persistence)
  - Minimal UI inspired by Snapdrop

### P2P Architecture Flow
```
┌─────────────┐                    ┌─────────────┐                    ┌─────────────┐
│   Client A  │                    │   Server    │                    │   Client B  │
│  (Initiator)│                    │ (Signaling) │                    │  (Receiver) │
└─────────────┘                    └─────────────┘                    └─────────────┘
       │                                   │                                   │
       │ 1. POST /api/rooms                │                                   │
       │──────────────────────────────────►│                                   │
       │◄──────────────────────────────────│ {roomId: "abc123"}                │
       │                                   │                                   │
       │ 2. join-room {roomId, userId, name}│                                   │
       │──────────────────────────────────►│                                   │
       │◄──────────────────────────────────│ {peers: []}                       │
       │                                   │                                   │
       │                                   │ 3. join-room {roomId, userId, name}│
       │                                   │◄──────────────────────────────────│
       │                                   │──────────────────────────────────►│
       │                                   │ {peers: [{id: "A", name: "Alice"}]}│
       │                                   │                                   │
       │ 4. peer-joined {id: "B", name: "Bob"}│                                   │
       │◄──────────────────────────────────│                                   │
       │                                   │                                   │
       │ 5. Create RTCPeerConnection       │                                   │
       │    + DataChannel                  │                                   │
       │                                   │                                   │
       │ 6. signal {targetId: "B", payload: offer}│                                   │
       │──────────────────────────────────►│                                   │
       │                                   │ 7. signal {from: "A", payload: offer}│
       │                                   │──────────────────────────────────►│
       │                                   │                                   │
       │                                   │ 8. Create RTCPeerConnection       │
       │                                   │    + ondatachannel                │
       │                                   │                                   │
       │                                   │ 9. signal {targetId: "A", payload: answer}│
       │                                   │──────────────────────────────────►│
       │ 10. signal {from: "B", payload: answer}│                                   │
       │◄──────────────────────────────────│                                   │
       │                                   │                                   │
       │ 11. ICE candidates exchange       │                                   │
       │    (via signal events)            │                                   │
       │                                   │                                   │
       │ 12. DataChannel opens             │                                   │
       │                                   │                                   │
       │ 13. Send file chunks              │                                   │
       │    via DataChannel                │                                   │
       │                                   │                                   │
       │ 14. File received & download link │                                   │
       │    generated                      │                                   │
       │                                   │                                   │
```

**Flow Steps:**
1. **Room Creation**: Client calls `POST /api/rooms` → returns room ID
2. **Peer Discovery**: Client joins WebSocket room → receives peer list
3. **Connection Setup**: 
   - Initiator creates RTCPeerConnection + DataChannel
   - Sends SDP offer via WebSocket to target peer
   - Target responds with SDP answer
   - ICE candidates exchanged for NAT traversal
4. **File Transfer**: 
   - Files chunked and sent via DataChannel
   - Receiver reassembles chunks into downloadable blob
   - No server storage - direct P2P transfer

## 🔧 Useful commands

```bash
# Tail service logs
docker compose logs -f backend

# Run simple API smoke tests
./scripts/test-api.sh.sh

# Health-check API
curl -s http://localhost:8080/api | jq .

# Test P2P signaling
curl -X POST http://localhost:8080/api/rooms

# Test chat API (requires auth)
curl -X POST http://localhost:8080/api/auth/signup \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"test@example.com","password":"pass"}'
```

## 📚 API Endpoints

### Request Flow Diagram
```
┌─────────────┐    REST API    ┌─────────────┐    WebSocket    ┌─────────────┐
│   Frontend  │◄─────────────►│   Backend   │◄───────────────►│   Clients   │
│   (React)   │               │  (NestJS)   │                 │  (Browser)  │
└─────────────┘               └─────────────┘                 └─────────────┘
       │                              │                              │
       │ Auth Endpoints               │                              │
       │ • POST /auth/signup          │                              │
       │ • POST /auth/login           │                              │
       │                              │                              │
       │ CRUD Endpoints               │                              │
       │ • GET /users                 │                              │
       │ • GET /conversations         │                              │
       │ • GET /conversations/:id/msgs│                              │
       │                              │                              │
       │ P2P Endpoints                │                              │
       │ • POST /rooms                │                              │
       │ • GET /rooms/:id             │                              │
       │                              │                              │
       │                              │ Chat Events                   │
       │                              │ • conversation.join           │
       │                              │ • message.send               │
       │                              │ • message.receive            │
       │                              │                              │
       │                              │ P2P Events                    │
       │                              │ • join-room                   │
       │                              │ • signal                      │
       │                              │ • peer-joined                 │
       │                              │ • peer-left                   │
```

### Auth (Public)
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login with JWT

### Users (JWT Required)
- `GET /api/users` - List users
- `GET /api/users?query=<search>` - Search users

### Chat (JWT Required)
- `GET /api/conversations` - List user's conversations
- `GET /api/conversations/:id/messages` - Get messages
- `POST /api/conversations/direct/:userId` - Create direct chat

### P2P Signaling (Public)
- `POST /api/rooms` - Create room
- `GET /api/rooms/:id` - Get room info
- WebSocket `/signal` - SDP/ICE exchange

### WebSocket Events
- **Chat**: `conversation.join`, `message.send`, `message.receive`
- **P2P**: `join-room`, `signal`, `peer-joined`, `peer-left`
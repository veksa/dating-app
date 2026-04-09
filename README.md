# Real-time Chat Application

A real-time chat application built with NestJS, SvelteKit, MongoDB, and WebSockets.

## Stack

- **Backend**: NestJS + TypeScript + WebSocket gateway
- **Frontend**: SvelteKit + TypeScript + Svelte 5
- **Database**: MongoDB via Mongoose
- **Cache**: Redis (sessions & auth tokens)
- **Protocol**: Custom binary-compatible WebSocket protocol

## Features

- Register / Login with JWT-style token auth
- Real-time messaging via WebSocket (no page reload)
- 1-on-1 conversations
- User search
- Message history
- **Stories**: Record, view, and auto-delete video stories (24h expiry)

## Running Locally

### Prerequisites

- Node.js 18+
- MongoDB 7 (or Docker)
- Redis 7 (or Docker)

### With Docker Compose (recommended)

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend WS: ws://localhost:3000/ws

### Local Development (with MongoDB & Redis via Docker Compose)

**1. Start MongoDB & Redis**

```bash
docker compose -f docker-compose.dev.yml up -d
```

**2. Backend**

```bash
cd backend
yarn install
yarn start
```

**3. Frontend**

```bash
cd frontend
yarn install
yarn dev
```

Open http://localhost:5173

To stop the services:

```bash
docker compose -f docker-compose.dev.yml down
```

## Clearing the Database

If you encounter issues after schema changes or need to reset the database:

```bash
# Using Docker Compose
docker compose -f docker-compose.dev.yml exec mongodb mongosh -u root -p 123123 --authenticationDatabase admin chatapp --eval "db.dropDatabase()"
```

Or stop the containers, delete the MongoDB volume, and restart:

```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

## Environment Variables

### Backend

| Variable | Default | Description |
|---|---|---|
| `MONGO_HOST` | `127.0.0.1` | MongoDB host |
| `MONGO_PORT` | `27017` | MongoDB port |
| `MONGO_USER` | `root` | MongoDB username |
| `MONGO_PASSWORD` | `123123` | MongoDB password |
| `MONGO_DB` | `chatapp` | Database name |

### Frontend

| Variable | Default | Description |
|---|---|---|
| `VITE_WS_URL` | `ws://localhost:3000/ws` | Backend WebSocket URL |

## Project Structure

```
dating-app/
├── backend/             # NestJS backend
│   └── src/
│       ├── auth/        # Authentication (register, login, token)
│       ├── chat/        # Chat service (conversations, messages, users)
│       ├── story/       # Stories service (video upload, feed)
│       ├── database/    # Mongoose models & database service
│       ├── cache/       # Redis cache service
│       ├── event/       # Real-time event bus (Redis pub/sub)
│       ├── jwt/         # JWT token service
│       ├── config/      # Configuration service
│       └── _guards/     # JWT guard for protected routes
├── frontend/            # SvelteKit frontend
│   └── src/
│       ├── lib/
│       │   ├── api.ts        # REST API client
│       │   ├── ws.ts         # WebSocket client
│       │   ├── stores/       # Svelte stores (auth, chat)
│       │   └── components/   # Reusable components
│       └── routes/           # Pages (login, register, chat, stories)
└── docker-compose.yml
```

## Development Trade-offs

The following trade-offs were made to accelerate development while maintaining core functionality:

### WebSocket Implementation
- **Choice**: Native WebSocket with inline connection logic
- **Reason**: Smaller bundle size, full control over protocol, no external dependency overhead
- **Trade-off**: Manual reconnection logic, no built-in fallback to polling, custom event handling
- **Improvement**: Extract connection logic into a shared library that provides TypeScript types for client/server communication protocol

### Database Type Safety
- **Choice**: Minimal type coverage for database interactions
- **Reason**: Faster development, Mongoose provides basic typing out of the box
- **Trade-off**: Less compile-time safety for queries, potential runtime errors
- **Improvement**: Add comprehensive TypeScript interfaces for all database models and query results

### Authentication
- **Choice**: MD5 for password hashing instead of bcrypt/argon2
- **Reason**: Simple implementation, sufficient for demo/prototype
- **Trade-off**: Not cryptographically secure for production (should use bcrypt with salt)

### Video Storage
- **Choice**: Local filesystem storage instead of cloud storage (S3, etc.)
- **Reason**: No external dependencies, simple implementation
- **Trade-off**: Not scalable across multiple instances, no CDN, data loss on container restart

### Video Processing
- **Choice**: No video processing or optimization, storing raw WebM recordings
- **Reason**: Video processing requires optimization for different systems and resolutions, complex to implement cross-platform
- **Trade-off**: WebM format has limited iOS support, larger file sizes, no adaptive bitrate, no format conversion for different clients
- **Improvement**: Add video processing pipeline with FFmpeg to convert to MP4/H.264 for broader compatibility, implement adaptive streaming, add per-device optimization

### Event Handling
- **Choice**: Custom event handling with hardcoded message identifiers (payload types)
- **Reason**: Simple implementation, no external dependencies
- **Trade-off**: Hardcoded identifiers (310, 311, 312, 100) are fragile, error-prone, difficult to maintain and extend
- **Improvement**: Create a shared library with type generator to avoid hardcoding message identifiers, provide compile-time type safety for event payloads

### Error Handling
- **Choice**: Basic error codes instead of structured error types
- **Reason**: Faster implementation, simpler client-side handling
- **Trade-off**: Less detailed error information, harder to debug complex issues

### Frontend State Management
- **Choice**: Custom Svelte stores instead of a state management library
- **Reason**: Svelte 5 runes provide sufficient reactivity, no additional dependencies
- **Trade-off**: Manual deduplication logic, potential for state inconsistencies

### Styling
- **Choice**: Plain CSS instead of typed CSS-in-JS (Fela)
- **Reason**: Simpler setup, no additional dependencies, better performance
- **Trade-off**: Less type safety for styles, potential for inconsistent design tokens
- **Improvement**: Add Fela support for typed styles and design token consistency

## Potential Improvements

### Security
1. **Password Hashing**: Replace MD5 with bcrypt or argon2 with proper salt rounds
2. **JWT Secret**: Move to environment variables with strong random values
3. **Rate Limiting**: Add rate limiting to auth endpoints to prevent brute force
4. **Input Sanitization**: Add HTML sanitization for message text to prevent XSS
5. **CORS**: Configure CORS properly for production domains

### Scalability
1. **Video Storage**: Move to cloud storage (AWS S3, Google Cloud Storage) with CDN
2. **Horizontal Scaling**: Add session affinity for WebSocket connections
3. **Message Pagination**: Implement cursor-based pagination for large conversation history
4. **Database Indexing**: Add compound indexes for common query patterns
5. **Redis Cluster**: Upgrade to Redis Cluster for high availability

### User Experience
1. **Message Status**: Add read/delivered receipts
2. **Typing Indicators**: Show when other user is typing
3. **Message Timestamps**: Display relative time (e.g., "2 min ago")
4. **Push Notifications**: Add browser push notifications for new messages
5. **Offline Support**: Add service worker for offline message queuing

### Code Quality
1. **Type Safety**: Add stricter TypeScript configuration, enable noImplicitAny
2. **Error Boundaries**: Add error boundaries in frontend for graceful degradation
3. **Logging**: Implement structured logging (Winston, Pino) for better debugging
4. **API Documentation**: Add OpenAPI/Swagger documentation
5. **E2E Tests**: Add Playwright or Cypress tests for critical user flows

### Performance
1. **Message Compression**: Enable WebSocket compression (permessage-deflate)
2. **Image Optimization**: Add image compression for avatars (if added)
3. **Code Splitting**: Implement route-based code splitting in SvelteKit
4. **Caching**: Add HTTP caching headers for static assets
5. **Database Connection Pooling**: Optimize Mongoose connection pool settings

### Testing
1. **Integration Tests**: Add integration tests for API endpoints
2. **WebSocket Tests**: Add tests for WebSocket gateway and event handling
3. **Frontend Tests**: Add component tests for Svelte components
4. **Load Testing**: Add load tests for WebSocket connections and message throughput
5. **Contract Testing**: Add contract tests between frontend and backend APIs

### Monitoring & Observability
1. **Health Checks**: Add health check endpoints for all services
2. **Metrics**: Add Prometheus metrics for request latency, error rates
3. **Tracing**: Add distributed tracing (OpenTelemetry) for request flows
4. **Alerting**: Set up alerts for high error rates or service downtime
5. **Log Aggregation**: Centralize logs (ELK stack, CloudWatch, etc.)

### Features
1. **Message Editing**: Allow users to edit sent messages
2. **Message Deletion**: Allow users to delete their messages
3. **File Sharing**: Add support for images and file uploads
4. **User Profiles**: Add profile pictures and status messages
5. **Online Status**: Show online/offline status for users
6. **Search Messages**: Add full-text search within conversations
7. **Message Reactions**: Add emoji reactions to messages

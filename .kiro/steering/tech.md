# Technology Stack & Build System

## Backend Stack
- **Runtime**: Node.js (v18+) with Express.js framework
- **Database**: MongoDB with geospatial indexing for location queries
- **Cache/Sessions**: Redis for caching and session management
- **Real-time**: Socket.io for messaging and live updates
- **Authentication**: JWT tokens with bcryptjs for password hashing
- **Testing**: Jest with supertest for API testing
- **Process Management**: Nodemon for development

## Frontend Stack
- **Framework**: React 18 with JavaScript (not TypeScript)
- **Build Tool**: Vite for fast development and building
- **UI Library**: Ant Design (antd) for consistent components
- **State Management**: React Query (@tanstack/react-query) for server state
- **Routing**: React Router DOM v6
- **Maps**: React Leaflet for location services
- **PWA**: Vite PWA plugin for mobile app capabilities
- **Testing**: Vitest with React Testing Library

## External Services
- **Maps**: Google Maps API for geocoding and location services
- **AI**: Google Gemini AI for emergency assistance
- **Email**: Brevo API for email notifications
- **SMS/WhatsApp**: WhatsApp Business API and Twilio
- **Push Notifications**: Firebase Cloud Messaging
- **Image Processing**: Sharp for server-side image optimization

## Development Tools
- **Concurrency**: Concurrently for running multiple dev servers
- **Validation**: Express-validator and Joi for input validation
- **Security**: Helmet, CORS, express-rate-limit
- **Logging**: Winston for structured logging
- **File Upload**: Multer for handling multipart forms

## Common Commands

### Setup & Installation
```bash
# Install all dependencies (root, server, client)
npm run install:all

# Quick setup with Docker databases
npm run setup

# Start MongoDB and Redis with Docker
npm run docker:dev

# Stop Docker services
npm run docker:down
```

### Development
```bash
# Start both frontend and backend in development
npm run dev

# Start only backend server (port 3000)
npm run server:dev

# Start only frontend dev server (port 5173)
npm run client:dev
```

### Testing
```bash
# Run all tests (server + client)
npm test

# Run only server tests
npm run test:server

# Run only client tests
npm run test:client
```

### Production Build
```bash
# Build frontend for production
npm run client:build

# Start production server
npm run server:start
```

### Maintenance
```bash
# Clean all node_modules and build artifacts
npm run clean

# Reinstall everything after clean
npm run install:all
```

## Environment Configuration
- Copy `server/.env.example` to `server/.env`
- Required variables: PORT, MONGODB_URI, REDIS_URL, JWT_SECRET
- Optional external service keys for full functionality
- Client URL defaults to http://localhost:5173 for development

## Code Style Conventions
- Use CommonJS (require/module.exports) in server code
- Use ES modules (import/export) in client code
- JSDoc comments for functions and file headers
- Express middleware follows standard patterns
- MongoDB models use Mongoose with proper indexing
- React components use functional components with hooks
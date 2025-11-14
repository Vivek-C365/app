# Animal Rescue Platform

A mobile-first application built with React Native (Expo) and Node.js/Express to connect people who discover injured or distressed animals with local volunteers and NGOs for immediate assistance.

## Project Structure

```
animal-rescue-platform/
├── App.js                  # React Native mobile app entry point
├── server/                 # Node.js/Express backend
│   ├── config/            # Database and service configurations
│   ├── models/            # MongoDB Mongoose models
│   ├── routes/            # API route definitions
│   ├── services/          # Business logic services
│   ├── middleware/        # Express middleware
│   ├── utils/             # Utility functions
│   └── test/              # Test files
├── docker-compose.dev.yml # Docker services for development
└── package.json           # Root package.json with workspace scripts
```

## Technology Stack

### Mobile App
- React Native 0.81.5 with Expo SDK 54
- React 19.1.0
- Expo Camera, Location, Notifications, AsyncStorage
- React Navigation for screen navigation
- React Native Maps for location services
- Socket.io client for real-time messaging

### Backend
- Node.js with Express.js
- MongoDB with geospatial indexing
- Redis for caching and session management
- Socket.io for real-time communication
- JWT authentication
- Winston for logging

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for MongoDB and Redis)
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Studio (for mobile testing)

## Quick Start

### 1. Install Dependencies

```bash
# Install all dependencies (mobile app + backend)
npm run install:all
```

### 2. Start Database Services

```bash
# Start MongoDB and Redis with Docker
npm run docker:dev

# Check if services are running
npm run docker:logs
```

### 3. Configure Backend

```bash
# Copy environment variables template
cp server/.env.example server/.env

# Edit server/.env with your configuration
# Default values work for local development
```

### 4. Start Development Servers

**Option A: Start both mobile app and backend**
```bash
# Terminal 1: Start backend server
npm run server:dev

# Terminal 2: Start Expo mobile app
npm start
```

**Option B: Start individually**
```bash
# Backend only (runs on port 3000)
npm run server:dev

# Mobile app only (Expo DevTools)
npm start
```

### 5. Run Mobile App

After starting Expo:
- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app on physical device

## Available Scripts

### Mobile App
- `npm start` - Start Expo development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator
- `npm run web` - Run in web browser

### Backend
- `npm run server:dev` - Start backend with nodemon (auto-reload)
- `npm run server:start` - Start backend in production mode

### Docker
- `npm run docker:dev` - Start MongoDB and Redis containers
- `npm run docker:down` - Stop and remove containers
- `npm run docker:logs` - View container logs

### Installation
- `npm run install:all` - Install dependencies for both mobile and backend

## Development Workflow

1. **Database Setup**: Ensure MongoDB and Redis are running via Docker
2. **Backend Development**: Make changes in `server/` directory
3. **Mobile Development**: Make changes in root directory (App.js, etc.)
4. **Testing**: Backend tests with Jest, mobile testing on simulators/devices

## Environment Variables

### Backend (.env)
```
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/animal-rescue
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
CLIENT_URL=http://localhost:8081
```

## API Endpoints

Base URL: `http://localhost:3000/api`

- `GET /health` - Health check endpoint
- `GET /api` - API information

Additional endpoints will be added as features are implemented.

## Features (Planned)

- ✅ Mobile app foundation with Expo
- ✅ Backend server with Express
- ✅ MongoDB with geospatial indexing
- ✅ Redis caching
- ⏳ User authentication and verification
- ⏳ Animal case reporting with photos
- ⏳ Location-based matching
- ⏳ Real-time messaging
- ⏳ Multi-channel notifications
- ⏳ AI emergency assistance

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
docker ps | grep mongodb

# Restart MongoDB
npm run docker:down
npm run docker:dev
```

### Redis Connection Issues
```bash
# Check if Redis is running
docker ps | grep redis

# Test Redis connection
docker exec -it animal-rescue-redis redis-cli ping
```

### Expo Issues
```bash
# Clear Expo cache
expo start -c

# Reset Metro bundler
rm -rf node_modules/.cache
```

## License

ISC

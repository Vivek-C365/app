# Project Structure & Organization

## Root Level Structure
```
animal-rescue-platform/
├── client/                 # React frontend application
├── server/                 # Node.js backend application
├── .kiro/                  # Kiro AI assistant configuration
├── .vscode/                # VS Code workspace settings
├── package.json            # Root package.json with workspace scripts
├── docker-compose.dev.yml  # Docker services for development
├── README.md               # Project documentation
└── setup-dev.md           # Development setup guide
```

## Backend Structure (`server/`)
```
server/
├── config/                 # Database and service configurations
│   ├── database.js         # MongoDB connection setup
│   └── redis.js           # Redis connection and client
├── controllers/           # Route controllers (if using controller pattern)
├── middleware/            # Express middleware functions
│   ├── auth.js            # Authentication middleware
│   ├── validation.js      # Input validation middleware
│   └── errorHandler.js    # Global error handling
├── models/                # MongoDB Mongoose models
│   ├── index.js           # Model exports and database setup
│   ├── User.js            # User model with verification
│   ├── Case.js            # Animal rescue case model
│   ├── Message.js         # Real-time messaging model
│   └── StatusUpdate.js    # Case status update model
├── routes/                # API route definitions
│   ├── auth.js            # Authentication endpoints
│   ├── cases.js           # Case management endpoints
│   ├── users.js           # User management endpoints
│   ├── messages.js        # Messaging endpoints
│   ├── notifications.js   # Notification preferences
│   ├── location.js        # Location services
│   ├── ai.js              # AI assistance endpoints
│   └── admin.js           # Admin functionality
├── services/              # Business logic services
│   ├── caseService.js     # Case management logic
│   ├── messagingService.js # Real-time messaging with Socket.io
│   ├── notificationService.js # Multi-channel notifications
│   ├── locationService.js # Geospatial queries and matching
│   ├── verificationService.js # User verification logic
│   ├── aiEmergencyService.js # AI assistance integration
│   └── reminderService.js # Automated reminder system
├── utils/                 # Utility functions
│   ├── logger.js          # Winston logging configuration
│   └── auth.js            # JWT and authentication utilities
├── test/                  # Test files
│   ├── *.test.js          # Jest test files
│   └── setup.js           # Test environment setup
├── logs/                  # Application log files
├── .env.example           # Environment variables template
├── index.js               # Main server entry point
├── jest.config.js         # Jest testing configuration
└── package.json           # Backend dependencies and scripts
```

## Frontend Structure (`client/`)
```
client/
├── src/
│   ├── components/        # Reusable React components
│   │   ├── __tests__/     # Component test files
│   │   ├── CaseReportForm.jsx # Animal reporting form
│   │   ├── CaseList.jsx   # Case listing and search
│   │   ├── CaseDetails.jsx # Individual case view
│   │   ├── CaseMessaging.jsx # Real-time chat interface
│   │   ├── LocationPicker.jsx # Map-based location selection
│   │   ├── VerificationBadge.jsx # User verification display
│   │   ├── NotificationPreferences.jsx # Notification settings
│   │   ├── AdminDashboard.jsx # Admin interface components
│   │   ├── AIChat.jsx     # AI assistance chat
│   │   ├── MobileCamera.jsx # Mobile camera integration
│   │   └── PWAInstallPrompt.jsx # PWA installation
│   ├── pages/             # Page-level components
│   │   ├── CasesPage.jsx  # Main cases dashboard
│   │   └── VerificationPage.jsx # User verification flow
│   ├── services/          # API service functions
│   │   ├── caseService.js # Case-related API calls
│   │   ├── messagingService.js # Real-time messaging
│   │   ├── locationService.js # Location and maps
│   │   ├── verificationService.js # Verification APIs
│   │   ├── notificationService.js # Notification management
│   │   ├── aiService.js   # AI assistance APIs
│   │   └── pwaService.js  # PWA functionality
│   ├── contexts/          # React context providers
│   │   └── MessagingContext.jsx # Socket.io context
│   ├── utils/             # Utility functions
│   │   └── mobileUtils.js # Mobile-specific utilities
│   ├── test/              # Test setup and utilities
│   │   └── setup.js       # Vitest configuration
│   ├── App.jsx            # Main app component with routing
│   ├── main.jsx           # React app entry point
│   ├── App.css            # Global styles
│   └── index.css          # Base CSS styles
├── public/                # Static assets
│   ├── sw.js              # Service worker for PWA
│   ├── offline.html       # Offline fallback page
│   └── manifest.json      # PWA manifest
├── index.html             # HTML template
├── vite.config.js         # Vite build configuration
└── package.json           # Frontend dependencies and scripts
```

## Key Architectural Patterns

### Backend Patterns
- **Route → Service → Model**: Routes handle HTTP, services contain business logic, models handle data
- **Middleware Chain**: Authentication → validation → rate limiting → error handling
- **Service Layer**: Centralized business logic separate from HTTP concerns
- **Model Methods**: Static methods for queries, instance methods for operations
- **Error Handling**: Consistent error response format across all endpoints

### Frontend Patterns
- **Component Hierarchy**: Pages → Components → UI Elements
- **Service Layer**: Centralized API calls with React Query for caching
- **Context Providers**: Global state for real-time features (messaging, notifications)
- **Hook-based**: Custom hooks for reusable logic
- **Mobile-first**: PWA components for mobile experience

### File Naming Conventions
- **Backend**: camelCase for files (caseService.js, userModel.js)
- **Frontend**: PascalCase for components (CaseList.jsx), camelCase for services
- **Tests**: Same name as source file with .test.js/.test.jsx extension
- **Routes**: Plural nouns (cases.js, users.js, messages.js)

### Import/Export Patterns
- **Backend**: CommonJS (require/module.exports)
- **Frontend**: ES modules (import/export)
- **Services**: Named exports for multiple functions, default export for classes
- **Models**: Default export for Mongoose models
- **Components**: Default export for React components
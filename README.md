# Animal Rescue Platform

A mobile-first application built with React Native (Expo) and Supabase to connect people who discover injured or distressed animals with local volunteers and NGOs for immediate assistance.

## Project Structure

```
animal-rescue-platform/
├── App.js                  # React Native mobile app entry point
├── src/                    # Mobile app source code
│   ├── config/            # Configuration files (Supabase client)
│   ├── components/        # React components
│   ├── screens/           # Screen components
│   └── services/          # API service functions
├── supabase/              # Supabase backend
│   ├── functions/         # Edge Functions (Deno/TypeScript)
│   ├── migrations/        # Database migrations
│   └── config.toml        # Supabase configuration
├── .kiro/                 # Kiro AI specs and documentation
│   └── specs/
│       └── animal-rescue-platform/
│           ├── requirements.md    # Feature requirements
│           ├── design.md          # System design
│           ├── tasks.md           # Implementation tasks
│           ├── supabase-setup.md  # Supabase setup guide
│           └── cleanup-guide.md   # Migration cleanup guide
└── package.json           # Root package.json with scripts
```

## Technology Stack

### Mobile App
- React Native 0.81.5 with Expo SDK 54
- React 19.1.0
- Expo Camera, Location, Notifications, AsyncStorage
- React Navigation for screen navigation
- React Native Maps for location services
- Supabase JS Client for backend integration

### Backend (Supabase)
- PostgreSQL 15+ with PostGIS extension for geospatial queries
- Supabase Auth for authentication with JWT tokens
- Supabase Realtime for live data subscriptions
- Supabase Storage for file uploads
- Edge Functions (Deno/TypeScript) for business logic
- Row Level Security (RLS) for data access control
- pg_cron for scheduled tasks

## Prerequisites

- Node.js 18+ and npm
- Supabase CLI (`npm install -g supabase`)
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Studio (for mobile testing)
- Docker (optional, for local Supabase development)

## Quick Start

### 1. Install Dependencies

```bash
# Install mobile app dependencies
npm install
```

### 2. Set Up Supabase

**Option A: Use Supabase Cloud (Recommended for getting started)**
1. Create account at https://supabase.com
2. Create new project
3. Copy Project URL and anon key
4. Skip to step 3

**Option B: Local Supabase Development**
```bash
# Start local Supabase (requires Docker)
npm run supabase:start

# This will start PostgreSQL, Storage, Auth, and Edge Functions locally
```

For detailed setup instructions, see `.kiro/specs/animal-rescue-platform/supabase-setup.md`

### 3. Configure Environment Variables

```bash
# Copy environment variables template
cp .env.example .env

# Edit .env with your Supabase credentials
# EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Apply Database Migrations

```bash
# Apply database schema and RLS policies
npm run supabase:db:push
```

### 5. Start Mobile App

```bash
# Start Expo development server
npm start
```

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

### Supabase
- `npm run supabase:start` - Start local Supabase (requires Docker)
- `npm run supabase:stop` - Stop local Supabase
- `npm run supabase:status` - Check Supabase status
- `npm run supabase:db:reset` - Reset local database
- `npm run supabase:db:push` - Push migrations to remote
- `npm run supabase:functions:deploy` - Deploy Edge Functions
- `npm run supabase:functions:serve` - Serve Edge Functions locally
- `npm run supabase:migration:new` - Create new migration

## Development Workflow

1. **Supabase Setup**: Create project and apply migrations
2. **Edge Functions**: Develop business logic in `supabase/functions/`
3. **Mobile Development**: Build UI and integrate Supabase client
4. **Database**: Create migrations for schema changes
5. **Testing**: Test on simulators/devices with local or cloud Supabase

## Environment Variables

### Mobile App (.env)
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-preset
EXPO_PUBLIC_FCM_SERVER_KEY=your-fcm-key
```

### Edge Functions (Supabase Secrets)
Set via `supabase secrets set KEY=value`:
```
BREVO_API_KEY=your-brevo-key
WHATSAPP_API_KEY=your-whatsapp-key
GEMINI_API_KEY=your-gemini-key
CLOUDINARY_URL=your-cloudinary-url
```

## Data Access

### Direct Database Access (via Supabase Client)
```javascript
import { supabase } from './src/config/supabase'

// Query cases
const { data, error } = await supabase
  .from('cases')
  .select('*')
  .eq('status', 'open')

// Real-time subscription
supabase
  .channel('cases')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cases' }, 
    (payload) => console.log('New case:', payload)
  )
  .subscribe()
```

### Edge Functions
```javascript
// Call Edge Function
const { data, error } = await supabase.functions.invoke('case-workflow', {
  body: { caseId: 'uuid' }
})
```

## Features

### Implemented
- ✅ Mobile app foundation with Expo SDK 54
- ✅ Supabase backend infrastructure
- ✅ PostgreSQL with PostGIS for geospatial queries
- ✅ Database schema with RLS policies
- ✅ Supabase Auth configuration
- ✅ Storage buckets setup
- ✅ Edge Functions template

### In Progress (See tasks.md)
- ✅ User authentication and verification
- ✅ Animal case reporting with photos
- ✅ Location-based matching with PostGIS
- ✅ Real-time messaging with Supabase Realtime
- ✅ Status update reminders with pg_cron
- ✅ AI emergency assistance with Gemini
- ⏳ Multi-channel notifications via Edge Functions (WhatsApp, Email)

## Documentation

### Spec Documents
- **Setup Guide**: `.kiro/specs/animal-rescue-platform/supabase-setup.md`
- **Requirements**: `.kiro/specs/animal-rescue-platform/requirements.md`
- **Design**: `.kiro/specs/animal-rescue-platform/design.md`
- **Tasks**: `.kiro/specs/animal-rescue-platform/tasks.md`
- **Cleanup Guide**: `.kiro/specs/animal-rescue-platform/cleanup-guide.md`

### Feature Guides
- **AI Emergency System**: `supabase/AI_EMERGENCY_SYSTEM_GUIDE.md`
- **AI Functions Deployment**: `supabase/functions/AI_FUNCTIONS_DEPLOYMENT.md`
- **Reminder System**: `supabase/REMINDER_SYSTEM_QUICKSTART.md`
- **RLS Policies**: `supabase/RLS_POLICIES_GUIDE.md`
- **Realtime Integration**: `REALTIME_INTEGRATION_GUIDE.md`
- **Push Notifications**: `PUSH_NOTIFICATIONS_IMPLEMENTATION.md`

## Troubleshooting

### Supabase Connection Issues
```bash
# Check Supabase status
npm run supabase:status

# Restart local Supabase
npm run supabase:stop
npm run supabase:start
```

### Database Migration Issues
```bash
# Reset local database
npm run supabase:db:reset

# Check migration status
supabase migration list
```

### Expo Issues
```bash
# Clear Expo cache
expo start -c

# Reset Metro bundler
rm -rf node_modules/.cache
```

### Edge Function Issues
```bash
# View function logs
supabase functions logs case-workflow

# Test function locally
npm run supabase:functions:serve
```

## License

ISC

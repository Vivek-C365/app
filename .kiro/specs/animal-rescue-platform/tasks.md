# Implementation Plan

## Mobile App Development Tasks

- [x] 1. Set up mobile app foundation and Supabase backend infrastructure









  - Initialize React Native project with Expo SDK 54
  - Create Supabase project and configure database
  - Enable PostGIS extension for geospatial queries
  - Set up Supabase Auth for user authentication
  - Configure Supabase Storage buckets (case-photos, verification-docs, status-photos)
  - Install Supabase JS client (@supabase/supabase-js) in mobile app
  - Install required Expo packages (Camera, Location, Notifications, AsyncStorage)
  - Configure development environment with Supabase CLI
  - _Requirements: All requirements need foundational setup_

- [x] 2. Build mobile app navigation and basic UI structure




  - Set up React Navigation for screen navigation
  - Create tab navigation (Report, Cases, Profile)
  - Build basic screen layouts with native components
  - Implement loading states and error boundaries
  - Create reusable UI components (buttons, cards, inputs)
  - Set up app theme and styling system
  - _Requirements: 6.1 (mobile interface)_
-

- [x] 3. Implement PostgreSQL database schema with PostGIS











  - Create profiles table extending auth.users with verification fields and notification preferences
  - Implement cases table with PostGIS geography type for location and photo arrays
  - Create service_areas table with PostGIS for helper coverage zones
  - Implement messages table for case communications
  - Create status_updates table with mandatory photo requirements
  - Create case_assignments junction table for helper assignments
  - Create verification_documents table for document uploads
  - Set up PostGIS spatial indexes for geospatial queries
  - Create database triggers for automatic timestamp updates and profile creation
  - _Requirements: 1.2, 2.1, 3.3, 5.1_

- [x] 4. Build mobile authentication screens and flows



  - Create Login screen with form validation
  - Build Registration screen with role selection (reporter, volunteer, NGO)
  - Implement JWT token storage with AsyncStorage
  - Add biometric authentication (fingerprint/face ID)
  - Create password reset flow
  - Build onboarding screens for first-time users
  - _Requirements: 3.1, 3.2_

- [x] 5. Implement Supabase Auth integration in mobile app








  - Integrate Supabase Auth client for signup with user metadata (name, phone, user_type)
  - Implement login with email/password using Supabase Auth
  - Add magic link authentication for passwordless login
  - Implement session management with automatic token refresh
  - Build profile management using Supabase client queries
  - Add password reset flow using Supabase Auth
  - _Requirements: 3.1, 3.2, 4.1_

- [x] 6. Build mobile camera integration for photo capture
  - Integrate Expo Camera for taking photos
  - Integrate Expo Image Picker for gallery selection
  - Create photo preview and editing screen
  - Implement image compression before upload
  - Add multiple photo selection from gallery
  - Build photo validation (format, size, quality)
  - Integrate Cloudinary upload with progress indicator
  - _Requirements: 1.2, 6.2 (camera integration)_
-

- [x] 7. Implement GPS location services in mobile app
  - Integrate Expo Location for GPS coordinates
  - Use Expo Location for reverse geocoding (no Google Maps API needed)
  - Create location picker with React Native Maps
  - Build landmark-based location input
  - Implement location permission handling
  - Create offline location caching with AsyncStorage
  - _Requirements: 1.4, 6.3 (GPS integration)_

- [x] 8. Build Report Animal screen with full functionality
  - Create animal reporting form with all fields
  - Integrate camera for photo capture
  - Add GPS location picker
  - Implement form validation
  - Build contact information section
  - Add offline draft saving with AsyncStorage
  - Create submission confirmation screen
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 9. Build Active Cases list screen for mobile
  - Create scrollable case list with pull-to-refresh
  - Implement case filtering and search
  - Build case card component with status badges
  - Add distance calculation from user location
  - Create "I Can Help" action button
  - Implement case list caching for offline viewing
  - _Requirements: 2.1, 5.3_

- [x] 10. Implement Case Details screen with messaging
  - Create case details view with all information
  - Build real-time messaging interface
  - Add photo gallery for case images
  - Implement status update timeline
  - Create action buttons (Help, Message, Share)
  - Add map view showing case location
  - _Requirements: 5.3, 7.1, 7.2_

- [x] 11. Build User Profile and Settings screens
  - Create profile view with user information
  - Build profile editing screen
  - Implement notification preferences toggle
  - Add service area management for volunteers
  - Create verification status display
  - Build settings screen with app preferences
  - _Requirements: 3.1, 3.2_

- [x] 12. Implement Volunteer/NGO verification flow in mobile app
  - Create document upload screen with camera integration
  - Build verification form for NGOs (registration, location proof)
  - Create volunteer verification form (government ID, photo)
  - Implement document preview before submission
  - Add verification status tracking screen
  - Create verification badge display
  - _Requirements: 3.2, 3.3_

- [x] 13. Implement case management with Supabase and Edge Functions
  - Create case creation flow using Supabase client insert with photo upload to Storage
  - Build Edge Function for case workflow automation (case-workflow)
  - Implement case status management with Supabase client updates
  - Build case assignment system using case_assignments table
  - Create case search and filtering using Supabase queries with filters
  - Implement case timeline using status_updates table with joins
  - Add case archival system for resolved cases
  - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.3_

- [x] 14. Implement PostGIS location services and geospatial matching
  - Create find_nearby_helpers() PostgreSQL function using PostGIS ST_DWithin
  - Build calculate_distance() function using PostGIS ST_Distance
  - Create is_within_service_area() function for service area checks
  - Implement service area management using service_areas table with PostGIS
  - Add Expo Location integration for reverse geocoding (no Google Maps API needed)
  - Create Edge Function for complex location matching with business logic
  - _Requirements: 1.4, 2.1, 2.2_
  

- [x] 15. Build mobile status update screen with photo requirements
  - Create status update form requiring exactly 2 photos
  - Implement camera integration for status photos
  - Add photo validation (format, size, timestamp, quality)
  - Build status update history timeline view
  - Create reminder notification handling
  - _Requirements: 5.2, 5.4_





- [x] 16. Implement status update system with pg_cron and Edge Functions


  - Create status update flow using Supabase client with photo upload to Storage
  - Build database trigger to update case last_status_update and next_reminder_due
  - Implement pg_cron scheduled job to check for overdue status updates every hour
  - Create check_and_send_status_reminders() PostgreSQL function
  - Build Edge Function for sending reminder notifications (send-reminder)
  - Implement escalation workflow for missed updates using pg_cron
  - Add case reassignment logic for non-responsive helpers
  - _Requirements: 5.2, 5.4_

- [ ] 17. Implement push notifications in mobile app




  - Integrate Expo Notifications for push notifications
  - Handle notification permissions
  - Create notification display and handling
  - Build notification badge system
  - Implement deep linking from notifications
  - Add notification sound and vibration
  - _Requirements: 2.2, 6.5_

- [ ] 18. Build multi-channel notification system with Edge Functions





  - Create Edge Function for notification orchestration (send-notifications)
  - Integrate Brevo API for email notifications in Edge Function
  - Implement WhatsApp Business API for messaging in Edge Function
  - Set up Firebase Cloud Messaging for push notifications
  - Build notification preference management using profiles table
  - Create emergency alert Edge Function for case notifications
  - Implement reminder notifications with escalation via Edge Functions
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.2_

- [ ] 19. Build real-time messaging with Supabase Realtime





  - Integrate Supabase Realtime client for live message subscriptions
  - Create chat interface with message bubbles
  - Implement real-time message updates using postgres_changes subscription
  - Add message read receipts using read_by array updates
  - Build image sharing in chat with Supabase Storage
  - Create notification badges for unread messages
  - Implement presence tracking for online users
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 20. Set up Supabase Realtime subscriptions for live updates




  - Subscribe to new cases using postgres_changes for INSERT events
  - Implement case status update subscriptions for real-time UI updates
  - Create message subscriptions filtered by case_id
  - Build presence channel for online helper tracking
  - Add subscription cleanup and error handling
  - Implement reconnection logic for dropped connections
  - _Requirements: 5.2, 7.1, 7.2_

- [ ] 21. Implement Row Level Security policies for data access control





  - Create RLS policies for profiles table (public read, own update)
  - Implement RLS policies for cases table (anyone create, participants update)
  - Build RLS policies for messages table (only case participants can view/create)
  - Create RLS policies for status_updates table (only assigned helpers can create)
  - Implement RLS policies for verification_documents table (own view, admin update)
  - Add RLS policies for case_assignments and service_areas tables
  - Test RLS policies with different user roles
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 22. Build AI Emergency Assistance screen in mobile app









  - Create AI chat interface for emergency guidance
  - Build facility recommendation display
  - Implement one-tap calling to facilities
  - Add map navigation to recommended facilities
  - Create emergency instructions display
  - Build photo analysis result display
  - _Requirements: 2.1, 2.2 (fallback scenarios)_

- [ ] 23. Implement Google Gemini AI emergency system with Edge Functions





  - Create Edge Function for AI emergency assistance (ai-emergency)
  - Set up Google Gemini AI API integration in Edge Function
  - Implement automatic activation triggers for no-response scenarios
  - Build AI-powered facility recommendation engine using Gemini
  - Create Edge Function for AI guidance chat (ai-chat)
  - Implement photo analysis for injury assessment using Gemini Vision
  - Create emergency contact integration in Edge Function
  - _Requirements: 2.1, 2.2 (fallback scenarios)_

- [ ] 24. Implement offline mode and data synchronization with AsyncStorage




  - Build offline data storage with AsyncStorage for cases and profiles
  - Create draft report saving for offline use with local queue
  - Implement data sync when connection returns using mutation queue
  - Add offline indicator in UI based on network status
  - Cache case data for offline viewing using AsyncStorage
  - Build queue system for pending Supabase operations
  - Implement optimistic UI updates for better UX
  - _Requirements: 6.4 (offline capability)_

- [ ] 25. Add mobile-specific features and enhancements




  - Implement voice input for hands-free reporting
  - Add biometric authentication with Supabase Auth
  - Create background location tracking for volunteers
  - Build local notifications for reminders
  - Add haptic feedback for important actions
  - Implement dark mode support
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 26. Build admin verification system with Edge Functions and RLS





  - Create Edge Function for user verification workflow (verify-user)
  - Build admin dashboard queries using Supabase client with RLS
  - Implement case monitoring and analytics using PostgreSQL views
  - Create Edge Function for content moderation (moderate-content)
  - Build platform usage analytics using PostgreSQL aggregate queries
  - Add suspicious activity detection using database triggers
  - Implement admin notification system via Edge Functions
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 27. Integrate external services with Supabase Storage and Edge Functions




  - Configure Supabase Storage buckets with public/private access policies
  - Set up Cloudinary for advanced image processing and transformations
  - Integrate Brevo email service in Edge Functions
  - Integrate WhatsApp Business API in Edge Functions
  - Configure Firebase for push notifications in mobile app
  - Set up Google Gemini AI service in Edge Functions
  - Add error handling and fallback mechanisms in Edge Functions
  - _Requirements: 1.4, 2.1, 2.2, 6.3, 7.4_

- [ ] 28. Optimize mobile app performance with Supabase




  - Implement image compression before upload to Supabase Storage
  - Add lazy loading for case lists with Supabase pagination
  - Optimize Supabase queries with proper indexes and filters
  - Reduce app bundle size with code splitting
  - Implement Supabase query caching with React Query
  - Add error boundaries and crash reporting
  - Test on low-end Android devices
  - _Requirements: All requirements need performance optimization_

- [ ] 29. Implement comprehensive testing for mobile and Supabase backend




  - Write unit tests for React Native components with Jest
  - Create integration tests for Supabase client operations
  - Test Edge Functions using Deno test framework
  - Implement end-to-end tests using Detox for React Native
  - Test PostGIS geospatial queries using pgTAP
  - Test Row Level Security policies with different user roles
  - Test Supabase Realtime subscriptions and live updates
  - Test camera, GPS, and notification features on simulators
  - Test offline mode with AsyncStorage and data synchronization
  - _Requirements: All requirements need testing coverage_

- [ ] 30. Set up Supabase production deployment and monitoring




  - Configure Supabase production project with appropriate tier
  - Set up database backup and point-in-time recovery
  - Implement monitoring using Supabase Dashboard and logs
  - Configure Edge Function deployment and versioning
  - Set up custom domain and SSL certificates
  - Create CI/CD pipeline for Edge Functions deployment
  - Configure database connection pooling and performance optimization
  - Set up alerts for database performance and Edge Function errors
  - _Requirements: Platform reliability for all features_

- [ ] 31. Prepare mobile app for store deployment




  - Configure app icons and splash screens for iOS and Android
  - Set up app signing certificates
  - Create app store listings and screenshots
  - Implement analytics (Firebase Analytics or similar)
  - Add crash reporting (Sentry or Crashlytics)
  - Test on multiple devices and OS versions
  - Build release versions for iOS and Android
  - Submit to Google Play Store and Apple App Store
  - _Requirements: Platform deployment for all features_
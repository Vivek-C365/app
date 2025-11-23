/**
 * RLS Policy Testing Script
 * 
 * This script tests Row Level Security policies for the Animal Rescue Platform.
 * It creates test users, performs operations, and verifies access control.
 * 
 * Usage:
 *   node supabase/scripts/test-rls-policies.js
 * 
 * Requirements:
 *   - Supabase project running
 *   - Environment variables set (.env file)
 *   - @supabase/supabase-js installed
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env file');
  process.exit(1);
}

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// Store test data for cleanup
const testData = {
  users: [],
  cases: [],
  messages: [],
  statusUpdates: [],
  assignments: [],
  serviceAreas: [],
  documents: []
};

/**
 * Log test result
 */
function logTest(name, passed, details = '') {
  const result = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${result}: ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }
  
  testResults.tests.push({ name, passed, details });
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

/**
 * Create test users
 */
async function createTestUsers() {
  console.log('\n📝 Creating test users...\n');
  
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const timestamp = Date.now();
  const users = {};
  
  try {
    // Create reporter
    const { data: reporter, error: reporterError } = await serviceClient.auth.admin.createUser({
      email: `reporter-${timestamp}@test.com`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        name: 'Test Reporter',
        phone: '+919876543210',
        user_type: 'reporter'
      }
    });
    
    if (reporterError) throw reporterError;
    users.reporter = reporter.user;
    testData.users.push(reporter.user.id);
    console.log('✅ Created reporter:', reporter.user.email);
    
    // Create volunteer
    const { data: volunteer, error: volunteerError } = await serviceClient.auth.admin.createUser({
      email: `volunteer-${timestamp}@test.com`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        name: 'Test Volunteer',
        phone: '+919876543211',
        user_type: 'volunteer'
      }
    });
    
    if (volunteerError) throw volunteerError;
    users.volunteer = volunteer.user;
    testData.users.push(volunteer.user.id);
    console.log('✅ Created volunteer:', volunteer.user.email);
    
    // Create NGO
    const { data: ngo, error: ngoError } = await serviceClient.auth.admin.createUser({
      email: `ngo-${timestamp}@test.com`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        name: 'Test NGO',
        phone: '+919876543212',
        user_type: 'ngo'
      }
    });
    
    if (ngoError) throw ngoError;
    users.ngo = ngo.user;
    testData.users.push(ngo.user.id);
    console.log('✅ Created NGO:', ngo.user.email);
    
    // Create admin
    const { data: admin, error: adminError } = await serviceClient.auth.admin.createUser({
      email: `admin-${timestamp}@test.com`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        name: 'Test Admin',
        phone: '+919876543213',
        user_type: 'admin'
      }
    });
    
    if (adminError) throw adminError;
    users.admin = admin.user;
    testData.users.push(admin.user.id);
    console.log('✅ Created admin:', admin.user.email);
    
    // Create other user (not involved in test case)
    const { data: other, error: otherError } = await serviceClient.auth.admin.createUser({
      email: `other-${timestamp}@test.com`,
      password: 'TestPassword123!',
      email_confirm: true,
      user_metadata: {
        name: 'Test Other User',
        phone: '+919876543214',
        user_type: 'reporter'
      }
    });
    
    if (otherError) throw otherError;
    users.other = other.user;
    testData.users.push(other.user.id);
    console.log('✅ Created other user:', other.user.email);
    
    // Wait for profiles to be created by trigger
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return users;
  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
    throw error;
  }
}

/**
 * Get authenticated client for a user
 */
async function getAuthenticatedClient(email, password) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  
  if (error) {
    throw new Error(`Failed to authenticate: ${error.message}`);
  }
  
  return client;
}

/**
 * Test Profiles RLS
 */
async function testProfilesRLS(users) {
  console.log('\n🧪 Testing Profiles RLS...\n');
  
  const reporterClient = await getAuthenticatedClient(
    users.reporter.email,
    'TestPassword123!'
  );
  
  // Test 1: User can read all profiles
  const { data: allProfiles, error: readError } = await reporterClient
    .from('profiles')
    .select('*');
  
  logTest(
    'Profiles: Public read access',
    !readError && allProfiles && allProfiles.length > 0,
    readError ? readError.message : `Read ${allProfiles.length} profiles`
  );
  
  // Test 2: User can update own profile
  const { error: updateOwnError } = await reporterClient
    .from('profiles')
    .update({ name: 'Updated Reporter Name' })
    .eq('id', users.reporter.id);
  
  logTest(
    'Profiles: User can update own profile',
    !updateOwnError,
    updateOwnError ? updateOwnError.message : 'Successfully updated own profile'
  );
  
  // Test 3: User cannot update other profiles
  const { error: updateOtherError } = await reporterClient
    .from('profiles')
    .update({ name: 'Hacked Name' })
    .eq('id', users.volunteer.id);
  
  logTest(
    'Profiles: User cannot update other profiles',
    updateOtherError !== null,
    updateOtherError ? 'Correctly blocked' : 'ERROR: Should have been blocked'
  );
}

/**
 * Test Cases RLS
 */
async function testCasesRLS(users) {
  console.log('\n🧪 Testing Cases RLS...\n');
  
  const reporterClient = await getAuthenticatedClient(
    users.reporter.email,
    'TestPassword123!'
  );
  
  const volunteerClient = await getAuthenticatedClient(
    users.volunteer.email,
    'TestPassword123!'
  );
  
  const otherClient = await getAuthenticatedClient(
    users.other.email,
    'TestPassword123!'
  );
  
  // Test 1: User can create case
  const { data: newCase, error: createError } = await reporterClient
    .from('cases')
    .insert({
      reporter_id: users.reporter.id,
      animal_type: 'dog',
      condition: 'injured',
      description: 'Test case for RLS testing',
      location_landmarks: 'Near test park',
      location_description: 'Test location',
      contact_info: { phone: '+919876543210' }
    })
    .select()
    .single();
  
  logTest(
    'Cases: User can create case',
    !createError && newCase,
    createError ? createError.message : `Created case ${newCase.id}`
  );
  
  if (newCase) {
    testData.cases.push(newCase.id);
  }
  
  // Test 2: All users can view cases
  const { data: allCases, error: viewError } = await volunteerClient
    .from('cases')
    .select('*');
  
  logTest(
    'Cases: Public read access',
    !viewError && allCases && allCases.length > 0,
    viewError ? viewError.message : `Read ${allCases.length} cases`
  );
  
  // Test 3: Reporter can update own case
  const { error: updateOwnError } = await reporterClient
    .from('cases')
    .update({ description: 'Updated description' })
    .eq('id', newCase.id);
  
  logTest(
    'Cases: Reporter can update own case',
    !updateOwnError,
    updateOwnError ? updateOwnError.message : 'Successfully updated own case'
  );
  
  // Test 4: Non-participant cannot update case
  const { error: updateOtherError } = await otherClient
    .from('cases')
    .update({ description: 'Hacked description' })
    .eq('id', newCase.id);
  
  logTest(
    'Cases: Non-participant cannot update case',
    updateOtherError !== null,
    updateOtherError ? 'Correctly blocked' : 'ERROR: Should have been blocked'
  );
  
  return newCase;
}

/**
 * Test Messages RLS
 */
async function testMessagesRLS(users, testCase) {
  console.log('\n🧪 Testing Messages RLS...\n');
  
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  // Assign volunteer to case
  const { error: assignError } = await serviceClient
    .from('case_assignments')
    .insert({
      case_id: testCase.id,
      helper_id: users.volunteer.id,
      status: 'accepted'
    });
  
  if (assignError) {
    console.error('Failed to assign volunteer:', assignError.message);
    return;
  }
  
  testData.assignments.push({ case_id: testCase.id, helper_id: users.volunteer.id });
  
  const reporterClient = await getAuthenticatedClient(
    users.reporter.email,
    'TestPassword123!'
  );
  
  const volunteerClient = await getAuthenticatedClient(
    users.volunteer.email,
    'TestPassword123!'
  );
  
  const otherClient = await getAuthenticatedClient(
    users.other.email,
    'TestPassword123!'
  );
  
  // Test 1: Reporter can create message
  const { data: message, error: createError } = await reporterClient
    .from('messages')
    .insert({
      case_id: testCase.id,
      sender_id: users.reporter.id,
      content: 'Test message from reporter'
    })
    .select()
    .single();
  
  logTest(
    'Messages: Case participant can create message',
    !createError && message,
    createError ? createError.message : 'Successfully created message'
  );
  
  if (message) {
    testData.messages.push(message.id);
  }
  
  // Test 2: Volunteer can view messages
  const { data: messages, error: viewError } = await volunteerClient
    .from('messages')
    .select('*')
    .eq('case_id', testCase.id);
  
  logTest(
    'Messages: Assigned helper can view messages',
    !viewError && messages && messages.length > 0,
    viewError ? viewError.message : `Read ${messages.length} messages`
  );
  
  // Test 3: Non-participant cannot view messages
  const { data: otherMessages, error: otherViewError } = await otherClient
    .from('messages')
    .select('*')
    .eq('case_id', testCase.id);
  
  logTest(
    'Messages: Non-participant cannot view messages',
    !otherViewError && (!otherMessages || otherMessages.length === 0),
    otherMessages && otherMessages.length > 0 ? 'ERROR: Should not see messages' : 'Correctly blocked'
  );
  
  // Test 4: Non-participant cannot create message
  const { error: otherCreateError } = await otherClient
    .from('messages')
    .insert({
      case_id: testCase.id,
      sender_id: users.other.id,
      content: 'Unauthorized message'
    });
  
  logTest(
    'Messages: Non-participant cannot create message',
    otherCreateError !== null,
    otherCreateError ? 'Correctly blocked' : 'ERROR: Should have been blocked'
  );
}

/**
 * Test Status Updates RLS
 */
async function testStatusUpdatesRLS(users, testCase) {
  console.log('\n🧪 Testing Status Updates RLS...\n');
  
  const volunteerClient = await getAuthenticatedClient(
    users.volunteer.email,
    'TestPassword123!'
  );
  
  const reporterClient = await getAuthenticatedClient(
    users.reporter.email,
    'TestPassword123!'
  );
  
  const otherClient = await getAuthenticatedClient(
    users.other.email,
    'TestPassword123!'
  );
  
  // Test 1: Assigned helper can create status update
  const { data: statusUpdate, error: createError } = await volunteerClient
    .from('status_updates')
    .insert({
      case_id: testCase.id,
      updated_by: users.volunteer.id,
      previous_status: 'open',
      new_status: 'in_progress',
      condition: 'stable',
      description: 'Animal is being transported to shelter. Condition is stable.',
      photos: ['photo1.jpg', 'photo2.jpg'],
      treatment_provided: 'First aid applied',
      next_steps: 'Transport to vet'
    })
    .select()
    .single();
  
  logTest(
    'Status Updates: Assigned helper can create update',
    !createError && statusUpdate,
    createError ? createError.message : 'Successfully created status update'
  );
  
  if (statusUpdate) {
    testData.statusUpdates.push(statusUpdate.id);
  }
  
  // Test 2: Reporter can view status updates
  const { data: updates, error: viewError } = await reporterClient
    .from('status_updates')
    .select('*')
    .eq('case_id', testCase.id);
  
  logTest(
    'Status Updates: Reporter can view updates',
    !viewError && updates && updates.length > 0,
    viewError ? viewError.message : `Read ${updates.length} updates`
  );
  
  // Test 3: Non-participant cannot create status update
  const { error: otherCreateError } = await otherClient
    .from('status_updates')
    .insert({
      case_id: testCase.id,
      updated_by: users.other.id,
      previous_status: 'in_progress',
      new_status: 'resolved',
      condition: 'recovered',
      description: 'Unauthorized status update with sufficient description length.',
      photos: ['photo1.jpg', 'photo2.jpg'],
      treatment_provided: 'None',
      next_steps: 'None'
    });
  
  logTest(
    'Status Updates: Non-assigned user cannot create update',
    otherCreateError !== null,
    otherCreateError ? 'Correctly blocked' : 'ERROR: Should have been blocked'
  );
}

/**
 * Test Case Assignments RLS
 */
async function testCaseAssignmentsRLS(users, testCase) {
  console.log('\n🧪 Testing Case Assignments RLS...\n');
  
  const volunteerClient = await getAuthenticatedClient(
    users.volunteer.email,
    'TestPassword123!'
  );
  
  const reporterClient = await getAuthenticatedClient(
    users.reporter.email,
    'TestPassword123!'
  );
  
  const otherClient = await getAuthenticatedClient(
    users.other.email,
    'TestPassword123!'
  );
  
  // Test 1: Volunteer can view their assignments
  const { data: assignments, error: viewError } = await volunteerClient
    .from('case_assignments')
    .select('*')
    .eq('helper_id', users.volunteer.id);
  
  logTest(
    'Case Assignments: Helper can view own assignments',
    !viewError && assignments && assignments.length > 0,
    viewError ? viewError.message : `Read ${assignments.length} assignments`
  );
  
  // Test 2: Reporter can view assignments for their case
  const { data: caseAssignments, error: reporterViewError } = await reporterClient
    .from('case_assignments')
    .select('*')
    .eq('case_id', testCase.id);
  
  logTest(
    'Case Assignments: Reporter can view case assignments',
    !reporterViewError && caseAssignments && caseAssignments.length > 0,
    reporterViewError ? reporterViewError.message : `Read ${caseAssignments.length} assignments`
  );
  
  // Test 3: Other user cannot view unrelated assignments
  const { data: otherAssignments, error: otherViewError } = await otherClient
    .from('case_assignments')
    .select('*')
    .eq('case_id', testCase.id);
  
  logTest(
    'Case Assignments: Non-participant cannot view assignments',
    !otherViewError && (!otherAssignments || otherAssignments.length === 0),
    otherAssignments && otherAssignments.length > 0 ? 'ERROR: Should not see assignments' : 'Correctly blocked'
  );
  
  // Test 4: Helper can update their assignment
  const { error: updateError } = await volunteerClient
    .from('case_assignments')
    .update({ status: 'completed' })
    .eq('case_id', testCase.id)
    .eq('helper_id', users.volunteer.id);
  
  logTest(
    'Case Assignments: Helper can update own assignment',
    !updateError,
    updateError ? updateError.message : 'Successfully updated assignment'
  );
}

/**
 * Test Service Areas RLS
 */
async function testServiceAreasRLS(users) {
  console.log('\n🧪 Testing Service Areas RLS...\n');
  
  const volunteerClient = await getAuthenticatedClient(
    users.volunteer.email,
    'TestPassword123!'
  );
  
  const otherClient = await getAuthenticatedClient(
    users.other.email,
    'TestPassword123!'
  );
  
  // Test 1: Helper can create service area
  const { data: serviceArea, error: createError } = await volunteerClient
    .from('service_areas')
    .insert({
      helper_id: users.volunteer.id,
      center_point: 'POINT(77.5946 12.9716)',
      radius_km: 10,
      city: 'Bangalore',
      state: 'Karnataka'
    })
    .select()
    .single();
  
  logTest(
    'Service Areas: Helper can create service area',
    !createError && serviceArea,
    createError ? createError.message : 'Successfully created service area'
  );
  
  if (serviceArea) {
    testData.serviceAreas.push(serviceArea.id);
  }
  
  // Test 2: Anyone can view service areas
  const { data: allAreas, error: viewError } = await otherClient
    .from('service_areas')
    .select('*');
  
  logTest(
    'Service Areas: Public read access',
    !viewError && allAreas && allAreas.length > 0,
    viewError ? viewError.message : `Read ${allAreas.length} service areas`
  );
  
  // Test 3: Helper can update own service area
  const { error: updateError } = await volunteerClient
    .from('service_areas')
    .update({ radius_km: 15 })
    .eq('id', serviceArea.id);
  
  logTest(
    'Service Areas: Helper can update own area',
    !updateError,
    updateError ? updateError.message : 'Successfully updated service area'
  );
  
  // Test 4: Other user cannot update service area
  const { error: otherUpdateError } = await otherClient
    .from('service_areas')
    .update({ radius_km: 5 })
    .eq('id', serviceArea.id);
  
  logTest(
    'Service Areas: Other user cannot update area',
    otherUpdateError !== null,
    otherUpdateError ? 'Correctly blocked' : 'ERROR: Should have been blocked'
  );
}

/**
 * Test Verification Documents RLS
 */
async function testVerificationDocumentsRLS(users) {
  console.log('\n🧪 Testing Verification Documents RLS...\n');
  
  const volunteerClient = await getAuthenticatedClient(
    users.volunteer.email,
    'TestPassword123!'
  );
  
  const adminClient = await getAuthenticatedClient(
    users.admin.email,
    'TestPassword123!'
  );
  
  const otherClient = await getAuthenticatedClient(
    users.other.email,
    'TestPassword123!'
  );
  
  // Test 1: User can upload own document
  const { data: document, error: uploadError } = await volunteerClient
    .from('verification_documents')
    .insert({
      user_id: users.volunteer.id,
      document_type: 'government_id',
      file_url: 'https://example.com/test-doc.pdf',
      file_name: 'test-doc.pdf',
      file_size: 1024,
      mime_type: 'application/pdf'
    })
    .select()
    .single();
  
  logTest(
    'Verification Documents: User can upload own document',
    !uploadError && document,
    uploadError ? uploadError.message : 'Successfully uploaded document'
  );
  
  if (document) {
    testData.documents.push(document.id);
  }
  
  // Test 2: User can view own documents
  const { data: ownDocs, error: viewOwnError } = await volunteerClient
    .from('verification_documents')
    .select('*')
    .eq('user_id', users.volunteer.id);
  
  logTest(
    'Verification Documents: User can view own documents',
    !viewOwnError && ownDocs && ownDocs.length > 0,
    viewOwnError ? viewOwnError.message : `Read ${ownDocs.length} documents`
  );
  
  // Test 3: Other user cannot view documents
  const { data: otherDocs, error: otherViewError } = await otherClient
    .from('verification_documents')
    .select('*')
    .eq('user_id', users.volunteer.id);
  
  logTest(
    'Verification Documents: Other user cannot view documents',
    !otherViewError && (!otherDocs || otherDocs.length === 0),
    otherDocs && otherDocs.length > 0 ? 'ERROR: Should not see documents' : 'Correctly blocked'
  );
  
  // Test 4: Admin can view all documents
  const { data: allDocs, error: adminViewError } = await adminClient
    .from('verification_documents')
    .select('*');
  
  logTest(
    'Verification Documents: Admin can view all documents',
    !adminViewError && allDocs && allDocs.length > 0,
    adminViewError ? adminViewError.message : `Read ${allDocs.length} documents`
  );
  
  // Test 5: Admin can update documents
  const { error: adminUpdateError } = await adminClient
    .from('verification_documents')
    .update({ 
      verification_status: 'approved',
      verified_by: users.admin.id,
      verified_at: new Date().toISOString()
    })
    .eq('id', document.id);
  
  logTest(
    'Verification Documents: Admin can update documents',
    !adminUpdateError,
    adminUpdateError ? adminUpdateError.message : 'Successfully updated document'
  );
  
  // Test 6: Non-admin cannot update documents
  const { error: userUpdateError } = await volunteerClient
    .from('verification_documents')
    .update({ verification_status: 'approved' })
    .eq('id', document.id);
  
  logTest(
    'Verification Documents: Non-admin cannot update documents',
    userUpdateError !== null,
    userUpdateError ? 'Correctly blocked' : 'ERROR: Should have been blocked'
  );
}

/**
 * Cleanup test data
 */
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...\n');
  
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  try {
    // Delete in reverse order of dependencies
    if (testData.documents.length > 0) {
      await serviceClient.from('verification_documents').delete().in('id', testData.documents);
      console.log(`✅ Deleted ${testData.documents.length} verification documents`);
    }
    
    if (testData.serviceAreas.length > 0) {
      await serviceClient.from('service_areas').delete().in('id', testData.serviceAreas);
      console.log(`✅ Deleted ${testData.serviceAreas.length} service areas`);
    }
    
    if (testData.statusUpdates.length > 0) {
      await serviceClient.from('status_updates').delete().in('id', testData.statusUpdates);
      console.log(`✅ Deleted ${testData.statusUpdates.length} status updates`);
    }
    
    if (testData.messages.length > 0) {
      await serviceClient.from('messages').delete().in('id', testData.messages);
      console.log(`✅ Deleted ${testData.messages.length} messages`);
    }
    
    if (testData.assignments.length > 0) {
      for (const assignment of testData.assignments) {
        await serviceClient.from('case_assignments')
          .delete()
          .eq('case_id', assignment.case_id)
          .eq('helper_id', assignment.helper_id);
      }
      console.log(`✅ Deleted ${testData.assignments.length} case assignments`);
    }
    
    if (testData.cases.length > 0) {
      await serviceClient.from('cases').delete().in('id', testData.cases);
      console.log(`✅ Deleted ${testData.cases.length} cases`);
    }
    
    // Delete users
    if (testData.users.length > 0) {
      for (const userId of testData.users) {
        await serviceClient.auth.admin.deleteUser(userId);
      }
      console.log(`✅ Deleted ${testData.users.length} test users`);
    }
    
    console.log('\n✅ Cleanup complete\n');
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting RLS Policy Tests\n');
  console.log('='.repeat(50));
  
  let users;
  let testCase;
  
  try {
    // Create test users
    users = await createTestUsers();
    
    // Run tests
    await testProfilesRLS(users);
    testCase = await testCasesRLS(users);
    
    if (testCase) {
      await testMessagesRLS(users, testCase);
      await testStatusUpdatesRLS(users, testCase);
      await testCaseAssignmentsRLS(users, testCase);
    }
    
    await testServiceAreasRLS(users);
    await testVerificationDocumentsRLS(users);
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    await cleanup();
    
    // Print summary
    console.log('='.repeat(50));
    console.log('\n📊 Test Summary\n');
    console.log(`Total Tests: ${testResults.passed + testResults.failed}`);
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
    console.log('\n' + '='.repeat(50));
    
    // Exit with appropriate code
    process.exit(testResults.failed > 0 ? 1 : 0);
  }
}

// Run tests
runTests();

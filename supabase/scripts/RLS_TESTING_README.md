# RLS Policy Testing Guide

This guide explains how to test Row Level Security (RLS) policies for the Animal Rescue Platform.

## Prerequisites

1. **Supabase Project Running**
   - Local: `supabase start`
   - Remote: Ensure your Supabase project is accessible

2. **Environment Variables**
   - `EXPO_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (required for testing)

3. **Dependencies Installed**
   ```bash
   npm install @supabase/supabase-js dotenv
   ```

## Setting Up Service Role Key

The service role key is required to create test users and clean up test data. 

### For Local Development (Supabase CLI)

1. Start Supabase locally:
   ```bash
   supabase start
   ```

2. Get your service role key:
   ```bash
   supabase status
   ```
   Look for `service_role key` in the output.

3. Add to your `.env` file:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

### For Remote Supabase Project

1. Go to your Supabase Dashboard
2. Navigate to Settings > API
3. Copy the `service_role` key (keep this secret!)
4. Add to your `.env` file:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

⚠️ **IMPORTANT**: Never commit the service role key to version control!

## Running the Tests

### Automated Test Script

Run the comprehensive test script:

```bash
node supabase/scripts/test-rls-policies.js
```

This script will:
1. ✅ Create test users (reporter, volunteer, NGO, admin, other)
2. ✅ Test all RLS policies across all tables
3. ✅ Verify access control is working correctly
4. ✅ Clean up all test data automatically

### Expected Output

```
🚀 Starting RLS Policy Tests

==================================================

📝 Creating test users...

✅ Created reporter: reporter-1234567890@test.com
✅ Created volunteer: volunteer-1234567890@test.com
✅ Created NGO: ngo-1234567890@test.com
✅ Created admin: admin-1234567890@test.com
✅ Created other user: other-1234567890@test.com

🧪 Testing Profiles RLS...

✅ PASS: Profiles: Public read access
   Read 5 profiles
✅ PASS: Profiles: User can update own profile
   Successfully updated own profile
✅ PASS: Profiles: User cannot update other profiles
   Correctly blocked

🧪 Testing Cases RLS...

✅ PASS: Cases: User can create case
   Created case abc-123-def
✅ PASS: Cases: Public read access
   Read 1 cases
✅ PASS: Cases: Reporter can update own case
   Successfully updated own case
✅ PASS: Cases: Non-participant cannot update case
   Correctly blocked

... (more tests)

🧹 Cleaning up test data...

✅ Deleted 1 verification documents
✅ Deleted 1 service areas
✅ Deleted 1 status updates
✅ Deleted 2 messages
✅ Deleted 1 case assignments
✅ Deleted 1 cases
✅ Deleted 5 test users

✅ Cleanup complete

==================================================

📊 Test Summary

Total Tests: 25
✅ Passed: 25
❌ Failed: 0
Success Rate: 100.0%

==================================================
```

## Manual Testing

If you prefer to test manually or the automated script doesn't work:

### 1. Verify RLS is Enabled

```sql
-- Run in Supabase SQL Editor
SELECT 
  tablename,
  relrowsecurity as rls_enabled
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
AND tablename IN (
  'profiles', 'cases', 'messages', 'status_updates',
  'case_assignments', 'service_areas', 'verification_documents'
);
```

Expected: All tables should have `rls_enabled = true`

### 2. List All Policies

```sql
-- Run in Supabase SQL Editor
SELECT 
  tablename,
  policyname,
  cmd as operation,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Expected: You should see policies for all 7 tables

### 3. Test Specific Scenarios

#### Test Case: User Can Read All Profiles

```javascript
// In Supabase Dashboard > SQL Editor or your app
const { data, error } = await supabase
  .from('profiles')
  .select('*');

// Expected: Should return all profiles (no error)
```

#### Test Case: User Cannot Update Other Profiles

```javascript
// Try to update another user's profile
const { error } = await supabase
  .from('profiles')
  .update({ name: 'Hacked' })
  .eq('id', 'some-other-user-id');

// Expected: Should fail with RLS error or return 0 rows updated
```

#### Test Case: Non-Participant Cannot View Messages

```javascript
// Try to view messages for a case you're not part of
const { data, error } = await supabase
  .from('messages')
  .select('*')
  .eq('case_id', 'some-case-id');

// Expected: Should return empty array (no messages visible)
```

## Test Coverage

The automated test script covers:

### ✅ Profiles Table (3 tests)
- Public read access
- User can update own profile
- User cannot update other profiles

### ✅ Cases Table (4 tests)
- User can create case
- Public read access
- Reporter can update own case
- Non-participant cannot update case

### ✅ Messages Table (4 tests)
- Case participant can create message
- Assigned helper can view messages
- Non-participant cannot view messages
- Non-participant cannot create message

### ✅ Status Updates Table (3 tests)
- Assigned helper can create update
- Reporter can view updates
- Non-assigned user cannot create update

### ✅ Case Assignments Table (4 tests)
- Helper can view own assignments
- Reporter can view case assignments
- Non-participant cannot view assignments
- Helper can update own assignment

### ✅ Service Areas Table (4 tests)
- Helper can create service area
- Public read access
- Helper can update own area
- Other user cannot update area

### ✅ Verification Documents Table (6 tests)
- User can upload own document
- User can view own documents
- Other user cannot view documents
- Admin can view all documents
- Admin can update documents
- Non-admin cannot update documents

**Total: 28 test cases**

## Troubleshooting

### Issue: "Missing Supabase configuration"

**Solution**: Ensure your `.env` file has the required variables:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Issue: "Failed to authenticate"

**Solution**: 
- Check that your Supabase project is running
- Verify the URL and keys are correct
- Ensure email confirmation is disabled for testing (or use `email_confirm: true` in user creation)

### Issue: Tests fail with "permission denied"

**Solution**:
- Verify RLS policies are applied: Run the migration `20250122000001_rls_policies.sql`
- Check that the policies match the expected behavior
- Review the policy definitions in the migration file

### Issue: "Cannot delete test users"

**Solution**:
- Ensure you're using the service role key (not anon key)
- Check that cascading deletes are working (profiles should be deleted when users are deleted)
- Manually clean up data if needed using the service role key

### Issue: Tests pass but policies seem wrong

**Solution**:
- Review the test logic - passing tests might indicate the test is incorrect
- Manually verify the behavior in Supabase Dashboard
- Check the policy definitions in `supabase/migrations/20250122000001_rls_policies.sql`

## Continuous Integration

To run RLS tests in CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Test RLS Policies
  env:
    EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
  run: |
    npm install
    node supabase/scripts/test-rls-policies.js
```

## Security Best Practices

1. ✅ **Never commit service role key** - Add to `.gitignore`
2. ✅ **Use service role only in trusted environments** - Server-side code only
3. ✅ **Test policies thoroughly** - Run tests after any policy changes
4. ✅ **Monitor policy violations** - Set up logging and alerts
5. ✅ **Regular security audits** - Review policies periodically

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [RLS Policies Guide](../RLS_POLICIES_GUIDE.md)
- [Test Migration](../migrations/20250123000003_test_rls_policies.sql)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the RLS Policies Guide
3. Verify your Supabase project is running
4. Check the migration files are applied
5. Contact the development team

---

**Last Updated**: January 2025
**Maintained By**: Animal Rescue Platform Team

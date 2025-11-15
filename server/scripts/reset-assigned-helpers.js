/**
 * @fileoverview Script to reset assignedHelpers array for all cases
 * This will clear the assignedHelpers array so cases can be properly reassigned
 * 
 * Usage: node server/scripts/reset-assigned-helpers.js
 */

require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const Case = require('../models/Case');

async function resetAssignedHelpers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all cases with non-empty assignedHelpers
    const casesWithHelpers = await Case.find({
      assignedHelpers: { $exists: true, $ne: [] }
    });

    console.log(`\nFound ${casesWithHelpers.length} cases with assignedHelpers\n`);

    if (casesWithHelpers.length === 0) {
      console.log('No cases to reset!');
      await mongoose.disconnect();
      return;
    }

    // Display cases
    console.log('Cases to be reset:');
    console.log('='.repeat(80));
    casesWithHelpers.forEach((caseItem, index) => {
      console.log(`${index + 1}. Case ID: ${caseItem.caseId}`);
      console.log(`   Status: ${caseItem.status}`);
      console.log(`   Current assignedHelpers: ${JSON.stringify(caseItem.assignedHelpers)}`);
      console.log('-'.repeat(80));
    });

    // Reset all assignedHelpers arrays to empty
    const result = await Case.updateMany(
      { assignedHelpers: { $exists: true, $ne: [] } },
      { $set: { assignedHelpers: [] } }
    );

    console.log(`\n✅ Reset ${result.modifiedCount} cases`);
    console.log(`   Matched: ${result.matchedCount}`);
    console.log(`   Modified: ${result.modifiedCount}\n`);
    
    console.log('⚠️  Now you need to reassign cases properly:');
    console.log('1. Login as each user');
    console.log('2. Go to "All Cases" tab');
    console.log('3. Click "I Can Help" on the cases they should be assigned to');
    console.log('4. The system will properly add their user ID to assignedHelpers\n');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

  } catch (error) {
    console.error('Error resetting assigned helpers:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
resetAssignedHelpers();

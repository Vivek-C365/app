/**
 * @fileoverview Script to fix assigned cases with empty assignedHelpers array
 * This script helps migrate existing assigned cases to include user IDs
 * 
 * Usage:
 * 1. Update USER_ID_TO_ASSIGN with the actual user ID
 * 2. Run: node server/scripts/fix-assigned-cases.js
 */

require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const Case = require('../models/Case');

// CONFIGURATION - Update these values
const USER_ID_TO_ASSIGN = 'YOUR_USER_ID_HERE'; // Replace with actual user ObjectId
const DRY_RUN = true; // Set to false to actually update the database

async function fixAssignedCases() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find all assigned/in_progress cases with empty assignedHelpers
    const casesToFix = await Case.find({
      status: { $in: ['assigned', 'in_progress'] },
      $or: [
        { assignedHelpers: { $exists: false } },
        { assignedHelpers: { $size: 0 } }
      ]
    });

    console.log(`\nFound ${casesToFix.length} cases with empty assignedHelpers array\n`);

    if (casesToFix.length === 0) {
      console.log('No cases to fix!');
      await mongoose.disconnect();
      return;
    }

    // Display cases
    console.log('Cases to be updated:');
    console.log('='.repeat(80));
    casesToFix.forEach((caseItem, index) => {
      console.log(`${index + 1}. Case ID: ${caseItem.caseId}`);
      console.log(`   Status: ${caseItem.status}`);
      console.log(`   Animal: ${caseItem.animalType}`);
      console.log(`   Location: ${caseItem.location.address || caseItem.location.landmarks}`);
      console.log(`   Created: ${caseItem.createdAt}`);
      console.log(`   Current assignedHelpers: ${JSON.stringify(caseItem.assignedHelpers)}`);
      console.log('-'.repeat(80));
    });

    if (DRY_RUN) {
      console.log('\n⚠️  DRY RUN MODE - No changes will be made');
      console.log('To actually update the database:');
      console.log('1. Set USER_ID_TO_ASSIGN to the correct user ObjectId');
      console.log('2. Set DRY_RUN = false in the script');
      console.log('3. Run the script again\n');
    } else {
      // Validate user ID
      if (USER_ID_TO_ASSIGN === 'YOUR_USER_ID_HERE' || !mongoose.Types.ObjectId.isValid(USER_ID_TO_ASSIGN)) {
        console.error('\n❌ ERROR: Invalid USER_ID_TO_ASSIGN');
        console.error('Please set a valid MongoDB ObjectId\n');
        await mongoose.disconnect();
        return;
      }

      // Update all cases
      const result = await Case.updateMany(
        {
          status: { $in: ['assigned', 'in_progress'] },
          $or: [
            { assignedHelpers: { $exists: false } },
            { assignedHelpers: { $size: 0 } }
          ]
        },
        {
          $addToSet: { assignedHelpers: USER_ID_TO_ASSIGN }
        }
      );

      console.log(`\n✅ Updated ${result.modifiedCount} cases`);
      console.log(`   Matched: ${result.matchedCount}`);
      console.log(`   Modified: ${result.modifiedCount}\n`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

  } catch (error) {
    console.error('Error fixing assigned cases:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
fixAssignedCases();

require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/line-donation';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB:', mongoUri);
}

// Define schemas
const AdminSchema = new mongoose.Schema({
  line_user_id: String,
  display_name: String,
  added_at: Date
});

const Admin = mongoose.model('Admin', AdminSchema);

async function cleanup() {
  try {
    await connectDB();

    console.log('\n=== Starting Database Cleanup ===\n');

    // 1. Remove all Admin users
    console.log('1. Cleaning Admin collection...');
    const adminResult = await Admin.deleteMany({});
    console.log(`   ✓ Deleted ${adminResult.deletedCount} admin records`);

    // 2. Optional: Clean other collections (uncomment if needed)

    // Clean all donations
    // console.log('2. Cleaning Donations...');
    // const donationResult = await mongoose.connection.collection('donations').deleteMany({});
    // console.log(`   ✓ Deleted ${donationResult.deletedCount} donation records`);

    // Clean all expenses
    // console.log('3. Cleaning Expenses...');
    // const expenseResult = await mongoose.connection.collection('expenses').deleteMany({});
    // console.log(`   ✓ Deleted ${expenseResult.deletedCount} expense records`);

    // Clean all keywords
    // console.log('4. Cleaning Keywords...');
    // const keywordResult = await mongoose.connection.collection('keywords').deleteMany({});
    // console.log(`   ✓ Deleted ${keywordResult.deletedCount} keyword records`);

    // Clean all projects
    // console.log('5. Cleaning Projects...');
    // const projectResult = await mongoose.connection.collection('projects').deleteMany({});
    // console.log(`   ✓ Deleted ${projectResult.deletedCount} project records`);

    // Clean all user states
    // console.log('6. Cleaning User States...');
    // const userStateResult = await mongoose.connection.collection('userstates').deleteMany({});
    // console.log(`   ✓ Deleted ${userStateResult.deletedCount} user state records`);

    // Clean all settings
    // console.log('7. Cleaning Settings...');
    // const settingResult = await mongoose.connection.collection('settings').deleteMany({});
    // console.log(`   ✓ Deleted ${settingResult.deletedCount} setting records`);

    console.log('\n=== Cleanup Complete ===\n');

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run cleanup
cleanup();

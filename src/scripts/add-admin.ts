import dotenv from 'dotenv';
import { connectDB } from '../db/mongodb';
import Admin from '../models/Admin';
import mongoose from 'mongoose';

dotenv.config();

async function addAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();

    const lineUserId = 'U8993177e8e3a8561e74d48e492f70a5c';
    const displayName = 'Admin User';

    console.log(`Adding admin: ${lineUserId}`);

    const admin = await Admin.findOneAndUpdate(
      { line_user_id: lineUserId },
      {
        line_user_id: lineUserId,
        display_name: displayName,
        added_at: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log('Admin added successfully!');
    console.log('Admin details:', {
      id: admin._id.toString(),
      line_user_id: admin.line_user_id,
      display_name: admin.display_name,
      added_at: admin.added_at,
    });

    await mongoose.connection.close();
    console.log('Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error adding admin:', error);
    process.exit(1);
  }
}

addAdmin();

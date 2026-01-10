import dotenv from 'dotenv';
import { connectDB } from '../db/mongodb';
import Keyword from '../models/Keyword';
import Setting from '../models/Setting';

dotenv.config();

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await connectDB();

    console.log('Seeding keywords...');
    const keywords = [
      { keyword: 'ทำบุญ', action: 'show_projects', is_active: true },
      { keyword: 'บริจาค', action: 'show_projects', is_active: true },
      { keyword: 'donate', action: 'show_projects', is_active: true },
      { keyword: 'สรุป', action: 'show_summary', is_active: true },
      { keyword: 'summary', action: 'show_summary', is_active: true },
    ];

    for (const kw of keywords) {
      await Keyword.findOneAndUpdate(
        { keyword: kw.keyword },
        kw,
        { upsert: true, new: true }
      );
    }
    console.log('Keywords seeded');

    console.log('Seeding settings...');
    const settings = [
      { key: 'summary_time', value: '19:00', description: 'Time to send daily summary (HH:MM format)' },
      { key: 'summary_group_id', value: '', description: 'Group ID to send summary to' },
    ];

    for (const setting of settings) {
      await Setting.findOneAndUpdate(
        { key: setting.key },
        setting,
        { upsert: true, new: true }
      );
    }
    console.log('Settings seeded');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const AdminUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  created_at: { type: Date, default: Date.now },
  last_login: { type: Date }
});

const AdminUser = mongoose.model('AdminUser', AdminUserSchema);

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/line-donation';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');
}

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
  try {
    await connectDB();

    console.log('\n=== Create Admin User ===\n');

    const email = await question('Email: ');
    const password = await question('Password: ');
    const name = await question('Name (optional): ');

    if (!email || !password) {
      console.log('Email and password are required!');
      process.exit(1);
    }

    // Check if admin already exists
    const existingUser = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('\n❌ Admin user with this email already exists!');
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const adminUser = new AdminUser({
      email: email.toLowerCase(),
      password: hashedPassword,
      name: name || undefined
    });

    await adminUser.save();

    console.log('\n✅ Admin user created successfully!');
    console.log('\nYou can now login at: http://localhost:5006/admin-panel');
    console.log('Or production: https://donation.fastforwardssl.com/admin-panel');
    console.log(`\nEmail: ${email}`);

  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    rl.close();
    await mongoose.connection.close();
    process.exit(0);
  }
}

createAdmin();

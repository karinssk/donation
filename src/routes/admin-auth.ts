import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jwt-simple';
import AdminUser from '../models/AdminUser';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
export const verifyAdminToken = async (req: any, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.decode(token, JWT_SECRET);

    // Check if token is expired
    if (decoded.exp < Date.now()) {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }

    req.adminUser = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'กรุณากรอก Email และ Password'
      });
    }

    const user = await AdminUser.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Email หรือ Password ไม่ถูกต้อง'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Email หรือ Password ไม่ถูกต้อง'
      });
    }

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Create JWT token (expires in 24 hours)
    const token = jwt.encode({
      userId: user._id,
      email: user.email,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    }, JWT_SECRET);

    res.json({
      success: true,
      token,
      user: {
        email: user.email,
        name: user.name
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Verify token
router.get('/verify', verifyAdminToken, async (req: any, res: Response) => {
  res.json({
    success: true,
    user: req.adminUser
  });
});

// Create admin user (for initial setup)
router.post('/create-admin', async (req: Request, res: Response) => {
  try {
    const { email, password, name, secret } = req.body;

    // Simple secret key check for creating admin (remove in production)
    if (secret !== process.env.ADMIN_CREATE_SECRET) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Check if admin already exists
    const existingUser = await AdminUser.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const adminUser = new AdminUser({
      email: email.toLowerCase(),
      password: hashedPassword,
      name
    });

    await adminUser.save();

    res.json({
      success: true,
      message: 'Admin user created successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

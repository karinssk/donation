import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Request } from 'express';
import projectService from '../services/projectService';
import donationService from '../services/donationService';
import expenseService from '../services/expenseService';
import adminService from '../services/adminService';
import lineService from '../services/lineService';
import userStateService from '../services/userStateService';
import Donation from '../models/Donation';
import Keyword from '../models/Keyword';
import Setting from '../models/Setting';

const router = express.Router();

const uploadsDir = path.join(__dirname, '../../uploads');
const promptpayUploadsDir = path.join(uploadsDir, 'qr');

if (!fs.existsSync(promptpayUploadsDir)) {
  fs.mkdirSync(promptpayUploadsDir, { recursive: true });
}

const promptpayUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, promptpayUploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const uniqueName = `promptpay_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image uploads are allowed'));
      return;
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Public endpoints (User LIFF - Read only)

router.get('/config', async (req, res) => {
  res.json({
    success: true,
    data: {
      liffId: process.env.LIFF_ID || '',
      liffUrl: process.env.LIFF_URL || 'https://liff.line.me',
    },
  });
});

router.get('/projects', async (req, res) => {
  try {
    const status = req.query.status as string;
    const projects = await projectService.getAllProjects(status);
    res.json({ success: true, data: projects });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/projects/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const project = await projectService.getProject(id);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, data: project });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/projects/:id/transparency', async (req, res) => {
  try {
    const id = req.params.id;
    const project = await projectService.getProject(id);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const donations = await donationService.getDonationsByProject(id, 'confirmed');
    const expenses = await expenseService.getExpensesByProject(id);
    const balance = await projectService.getProjectBalance(id);

    res.json({
      success: true,
      data: {
        project,
        totalIncome: project.current_amount,
        totalExpenses: project.total_expenses,
        balance,
        recentDonations: donations.slice(0, 20),
        expenses,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin endpoints (public)

router.post('/admin/projects', async (req: Request, res) => {
  try {
    const { name, description, goal_amount, promptpay_qr_url, destination } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Name is required' });
    }

    const project = await projectService.createProject(
      name,
      description,
      goal_amount,
      promptpay_qr_url,
      destination
    );
    res.json({ success: true, data: project });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/admin/projects/:id', async (req: Request, res) => {
  try {
    const id = req.params.id;
    const project = await projectService.updateProject(id, req.body);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true, data: project });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/admin/projects/:id', async (req: Request, res) => {
  try {
    const id = req.params.id;
    const deleted = await projectService.deleteProject(id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post(
  '/admin/uploads/promptpay',
  promptpayUpload.single('file'),
  (req: Request, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'File is required' });
    }

    const filePath = `/uploads/qr/${req.file.filename}`;
    const forwardedProto = req.headers['x-forwarded-proto'] as string | undefined;
    const protocol = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;
    const baseUrl = `${protocol}://${req.get('host')}`;
    res.json({ success: true, url: baseUrl + filePath, path: filePath });
  }
);

router.get('/admin/donations', async (req: Request, res) => {
  try {
    const projectId = req.query.project_id as string;
    const status = req.query.status as string;

    let donations;
    if (projectId) {
      donations = await donationService.getDonationsByProject(
        projectId,
        status
      );
    } else {
      donations = await Donation.find()
        .populate('project_id', 'name destination')
        .sort({ created_at: -1 })
        .limit(100)
        .lean();
    }

    res.json({ success: true, data: donations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/admin/expenses', async (req: Request, res) => {
  try {
    const { project_id, amount, description, receipt_url } = req.body;

    if (!project_id || !amount || !description) {
      return res.status(400).json({
        success: false,
        error: 'project_id, amount, and description are required',
      });
    }

    const expense = await expenseService.createExpense(
      project_id,
      amount,
      description,
      receipt_url
    );

    res.json({ success: true, data: expense });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/admin/expenses/:id', async (req: Request, res) => {
  try {
    const id = req.params.id;
    const expense = await expenseService.updateExpense(id, req.body);

    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    res.json({ success: true, data: expense });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/admin/expenses/:id', async (req: Request, res) => {
  try {
    const id = req.params.id;
    const deleted = await expenseService.deleteExpense(id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/admin/keywords', async (_req: Request, res) => {
  try {
    const keywords = await Keyword.find().sort({ keyword: 1 }).lean();
    res.json({ success: true, data: keywords });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/admin/keywords', async (req: Request, res) => {
  try {
    const { keyword, action } = req.body;

    if (!keyword || !action) {
      return res.status(400).json({
        success: false,
        error: 'keyword and action are required',
      });
    }

    const newKeyword = new Keyword({ keyword, action });
    await newKeyword.save();

    res.json({ success: true, data: newKeyword });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/admin/keywords/:id', async (req: Request, res) => {
  try {
    const id = req.params.id;
    const { keyword, action, is_active } = req.body;

    const updateData: any = {};
    if (keyword !== undefined) updateData.keyword = keyword;
    if (action !== undefined) updateData.action = action;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    const updatedKeyword = await Keyword.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedKeyword) {
      return res.status(404).json({ success: false, error: 'Keyword not found' });
    }

    res.json({ success: true, data: updatedKeyword });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/admin/keywords/:id', async (req: Request, res) => {
  try {
    const id = req.params.id;
    const result = await Keyword.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Keyword not found' });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/admin/settings', async (_req: Request, res) => {
  try {
    const settings = await Setting.find().lean();
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/admin/settings/:key', async (req: Request, res) => {
  try {
    const key = req.params.key;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ success: false, error: 'value is required' });
    }

    const updated = await Setting.findOneAndUpdate(
      { key },
      { key, value, updated_at: new Date() },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public donation endpoints (for LIFF)

// Get donation by ID (for LIFF edit amount page)
router.get('/donations/:id', async (req: Request, res) => {
  try {
    const id = req.params.id;
    const donation = await donationService.getDonation(id);

    if (!donation) {
      return res.status(404).json({ success: false, error: 'Donation not found' });
    }

    res.json({ success: true, data: donation });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update donation amount (for LIFF edit amount)
router.put('/donations/:id/amount', async (req: Request, res) => {
  try {
    const id = req.params.id;
    const { amount, recipient_name } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid amount is required' });
    }

    const donation = await donationService.getDonation(id);
    if (!donation) {
      return res.status(404).json({ success: false, error: 'Donation not found' });
    }
    if (donation.status === 'confirmed') {
      return res.status(409).json({ success: false, error: 'Donation already confirmed' });
    }

    const confirmed = await donationService.confirmDonation(id, amount, recipient_name);
    if (!confirmed) {
      return res.status(500).json({ success: false, error: 'Failed to confirm donation' });
    }

    const project = await projectService.getProject(donation.project_id);
    await userStateService.clearState(donation.line_user_id, donation.source_id);

    // Get LINE user display name
    let displayName = 'ผู้บริจาค';
    try {
      const profile = await lineService.getProfile(donation.line_user_id);
      displayName = profile.displayName || donation.display_name || 'ผู้บริจาค';
    } catch (profileError) {
      displayName = donation.display_name || 'ผู้บริจาค';
    }

    const thankYouSetting = await Setting.findOne({ key: 'thank_you_message' }).lean();
    const thankYouMessage = (thankYouSetting?.value || 'ขอบคุณสำหรับการบริจาค')
      .toString()
      .trim() || 'ขอบคุณสำหรับการบริจาค';
    const projectName = project?.name || 'โปรเจกต์';

    try {
      await lineService.pushMessage(donation.line_user_id, [
        lineService.createDonationThankYouFlex(
          displayName,
          amount,
          project?.destination,
          projectName,
          thankYouMessage
        ),
      ]);
    } catch (sendError) {
      console.error('Failed to send confirmation message:', sendError);
    }

    res.json({ success: true, data: confirmed });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/admin/line-quota', async (_req: Request, res) => {
  try {
    const data = await lineService.getMessagingQuotaRemaining();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;

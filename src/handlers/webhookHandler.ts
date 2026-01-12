import {
  WebhookEvent,
  MessageEvent,
  PostbackEvent,
  TextEventMessage,
  ImageEventMessage,
} from '@line/bot-sdk';
import lineService from '../services/lineService';
import projectService from '../services/projectService';
import donationService from '../services/donationService';
import userStateService from '../services/userStateService';
import adminService from '../services/adminService';
import path from 'path';
import fs from 'fs';
import Keyword from '../models/Keyword';
import Donation from '../models/Donation';
import Project from '../models/Project';
import Setting from '../models/Setting';

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Track processed message IDs to prevent duplicate processing
const processedMessageIds = new Set<string>();
const MAX_TRACKED_MESSAGES = 1000;
const DUPLICATE_IMAGE_WINDOW_MS = 60 * 1000;

export class WebhookHandler {
  async handleEvents(events: WebhookEvent[]): Promise<void> {
    const promises = events.map(event => this.handleEvent(event));
    await Promise.all(promises);
  }

  private async handleEvent(event: WebhookEvent): Promise<void> {
    try {
      if (event.type === 'message') {
        await this.handleMessage(event);
      } else if (event.type === 'postback') {
        await this.handlePostback(event);
      }
    } catch (error) {
      console.error('Error handling event:', error);
    }
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    const { replyToken, message, source } = event;
    const userId = source.userId || '';
    const sourceType = source.type === 'group' ? 'group' : 'user';
    const sourceId = source.type === 'group' ? source.groupId! : userId;

    if (message.type === 'text') {
      await this.handleTextMessage(replyToken, message, userId, sourceType, sourceId);
    } else if (message.type === 'image') {
      await this.handleImageMessage(replyToken, message, userId, sourceType, sourceId);
    }
  }

  private async handleTextMessage(
    replyToken: string,
    message: TextEventMessage,
    userId: string,
    sourceType: 'user' | 'group',
    sourceId: string
  ): Promise<void> {
    const text = message.text.trim().toLowerCase();

    // Check if text matches any keyword
    const keyword = await Keyword.findOne({
      keyword: { $regex: new RegExp(`^${text}$`, 'i') },
      is_active: true,
    });

    if (keyword) {
      const action = keyword.action;

      if (action === 'show_projects') {
        await this.showProjects(replyToken, sourceId);
        return;
      } else if (action === 'show_summary') {
        await this.showSummary(replyToken, sourceType, sourceId);
        return;
      }
    }

    // Check if user is in a flow (waiting for amount input)
    const userState = await userStateService.getState(userId, sourceId);
    if (userState && userState.state === 'waiting_confirmation') {
      const amount = Number(text.replace(/,/g, ''));
      if (Number.isNaN(amount) || amount <= 0) {
        await this.sendReplyMessage(replyToken, sourceId, [
          { type: 'text', text: 'กรุณากรอกยอดเงินในการบริจาค เช่น 100' },
        ]);
        return;
      }

      const donation = await Donation.findOne({
        line_user_id: userId,
        source_id: sourceId,
        project_id: userState.pending_project_id,
        status: 'waiting_confirmation',
      })
        .sort({ created_at: -1 })
        .lean();

      if (!donation) {
        await this.sendReplyMessage(replyToken, sourceId, [
          { type: 'text', text: 'ไม่พบข้อมูลการบริจาคที่รอการยืนยัน' },
        ]);
        return;
      }

      const confirmed = await donationService.confirmDonation(
        donation._id.toString(),
        amount
      );

      if (!confirmed) {
        await this.sendReplyMessage(replyToken, sourceId, [
          { type: 'text', text: 'เกิดข้อผิดพลาดในการยืนยันการบริจาค' },
        ]);
        return;
      }

      const project = await projectService.getProject(donation.project_id.toString());
      const thankYouSetting = await Setting.findOne({ key: 'thank_you_message' }).lean();
      const thankYouMessage = (thankYouSetting?.value || 'ขอบคุณสำหรับการบริจาค')
        .toString()
        .trim() || 'ขอบคุณสำหรับการบริจาค';

      let displayName = 'ผู้บริจาค';
      try {
        const profile = await lineService.getProfile(userId);
        displayName = profile.displayName || donation.display_name || 'ผู้บริจาค';
      } catch (profileError) {
        displayName = donation.display_name || 'ผู้บริจาค';
      }
      if (displayName && displayName !== donation.display_name) {
        await donationService.updateDonation(donation._id.toString(), {
          display_name: displayName,
        });
      }

      const projectName = project?.name || 'โปรเจกต์';
      await this.sendReplyMessage(replyToken, sourceId, [
        lineService.createDonationThankYouFlex(
          displayName,
          amount,
          project?.destination,
          projectName,
          thankYouMessage
        ),
      ]);

      await userStateService.clearState(userId, sourceId);
      return;
    }

    // Default response disabled to avoid interrupting user chat.
  }

  private async handleImageMessage(
    replyToken: string,
    message: ImageEventMessage,
    userId: string,
    sourceType: 'user' | 'group',
    sourceId: string
  ): Promise<void> {
    // Check if we've already processed this message ID
    if (processedMessageIds.has(message.id)) {
      console.log(`Skipping already processed message: ${message.id}`);
      return;
    }

    // Mark message as processed
    processedMessageIds.add(message.id);
    if (processedMessageIds.size > MAX_TRACKED_MESSAGES) {
      const firstItem = processedMessageIds.values().next().value;
      if (firstItem) {
        processedMessageIds.delete(firstItem);
      }
    }

    // Check if user selected a project
    const userState = await userStateService.getState(userId, sourceId);

    if (!userState || !userState.pending_project_id) {
      await this.sendReplyMessage(replyToken, sourceId, [
        {
          type: 'text',
          text: 'กรุณาเลือกโปรเจกต์ก่อนส่งสลิป\nพิมพ์ "ทำบุญ" เพื่อเลือกโปรเจกต์',
        },
      ]);
      return;
    }

    try {
      const duplicateWindowStart = new Date(Date.now() - DUPLICATE_IMAGE_WINDOW_MS);
      const recentDonation = await Donation.findOne({
        line_user_id: userId,
        source_id: sourceId,
        project_id: userState.pending_project_id,
        status: { $in: ['waiting_confirmation', 'confirmed'] },
        created_at: { $gte: duplicateWindowStart },
      })
        .sort({ created_at: -1 })
        .lean();
      if (recentDonation) {
        return;
      }

      // Lock state early to avoid multiple prompts from multiple images.
      const lockedState = await userStateService.lockWaitingConfirmation(
        userId,
        sourceType,
        sourceId,
        userState.pending_project_id
      );
      if (!lockedState) {
        return;
      }

      let displayName = 'ผู้บริจาค';
      try {
        const profile = await lineService.getProfile(userId);
        displayName = profile.displayName || displayName;
      } catch (profileError) {
        displayName = 'ผู้บริจาค';
      }

      // Create donation record quickly to reply fast.
      const donation = await donationService.createDonation({
        projectId: userState.pending_project_id,
        lineUserId: userId,
        displayName,
        sourceType,
        sourceId,
        slipImageUrl: '',
        status: 'waiting_confirmation',
      });

      const project = await projectService.getProject(userState.pending_project_id);

      await this.sendReplyMessage(replyToken, sourceId, [
        { type: 'text', text: 'กรุณากรอกยอดเงินในการบริจาค เช่น 100' },
      ]);

      // Download and attach slip in the background (no extra reply/push).
      void lineService
        .downloadImage(message.id, UPLOADS_DIR)
        .then(imagePath => donationService.updateDonation(donation.id, { slip_image_url: imagePath }))
        .catch(error => {
          console.error('Error downloading slip image:', error);
        });

    } catch (error: any) {
      console.error('Error processing image:', error);
      await this.sendReplyMessage(replyToken, sourceId, [
        {
          type: 'text',
          text: 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ กรุณาลองใหม่อีกครั้ง',
        },
      ]);
    }
  }

  private async handlePostback(event: PostbackEvent): Promise<void> {
    const { replyToken, postback, source } = event;
    const userId = source.userId || '';
    const sourceType = source.type === 'group' ? 'group' : 'user';
    const sourceId = source.type === 'group' ? source.groupId! : userId;
    const data = new URLSearchParams(postback.data);
    const action = data.get('action');

    if (action === 'select_project') {
      await this.handleSelectProject(replyToken, data, userId, sourceType, sourceId);
    } else if (action === 'confirm_donation') {
      await this.handleConfirmDonation(replyToken, data, userId, sourceType, sourceId);
    }
  }

  private async handleSelectProject(
    replyToken: string,
    data: URLSearchParams,
    userId: string,
    sourceType: 'user' | 'group',
    sourceId: string
  ): Promise<void> {
    const projectId = data.get('project_id') || '';

    if (!projectId) {
      await this.sendReplyMessage(replyToken, sourceId, [
        { type: 'text', text: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' },
      ]);
      return;
    }

    const project = await projectService.getProject(projectId);
    if (!project) {
      await this.sendReplyMessage(replyToken, sourceId, [
        { type: 'text', text: 'ไม่พบโปรเจกต์ที่เลือก' },
      ]);
      return;
    }

    // Set user state
    await userStateService.setState(
      userId,
      sourceType,
      sourceId,
      'waiting_slip',
      projectId
    );

    if (project.promptpay_qr_url) {
      await this.sendReplyMessage(replyToken, sourceId, [
        {
          type: 'text',
          text: `คุณเลือกโปรเจกต์: ${project.name}\n\nสแกน QR PromptPay เพื่อทำบุญ`,
        },
        {
          type: 'image',
          originalContentUrl: project.promptpay_qr_url,
          previewImageUrl: project.promptpay_qr_url,
        },
        {
          type: 'text',
          text: 'โอนแล้วส่งรูปสลิปเพื่อยืนยันยอดได้เลยค่ะ',
        },
      ]);
    } else {
      await this.sendReplyMessage(replyToken, sourceId, [
        {
          type: 'text',
          text: `คุณเลือกโปรเจกต์: ${project.name}\n\nกรุณาส่งรูปสลิปโอนเงินมาได้เลยค่ะ`,
        },
      ]);
    }
  }

  private async handleConfirmDonation(
    replyToken: string,
    data: URLSearchParams,
    userId: string,
    sourceType: 'user' | 'group',
    sourceId: string
  ): Promise<void> {
    const donationId = data.get('donation_id') || '';

    if (!donationId) {
      await this.sendReplyMessage(replyToken, sourceId, [
        { type: 'text', text: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' },
      ]);
      return;
    }

    const donation = await donationService.getDonation(donationId);
    if (!donation) {
      await this.sendReplyMessage(replyToken, sourceId, [
        { type: 'text', text: 'ไม่พบข้อมูลการบริจาค' },
      ]);
      return;
    }
    if (donation.status === 'confirmed') {
      await this.sendReplyMessage(replyToken, sourceId, [
        { type: 'text', text: 'รายการนี้ยืนยันยอดแล้ว' },
      ]);
      return;
    }

    // Confirm donation
    const confirmed = await donationService.confirmDonation(
      donationId,
      donation.amount_final
    );

    if (confirmed) {
      const project = await projectService.getProject(donation.project_id);
      const thankYouSetting = await Setting.findOne({ key: 'thank_you_message' }).lean();
      const thankYouMessage = (thankYouSetting?.value || 'ขอบคุณสำหรับการบริจาค')
        .toString()
        .trim() || 'ขอบคุณสำหรับการบริจาค';

      // Get LINE user profile to get actual display name
      let displayName = 'ผู้บริจาค';
      try {
        const profile = await lineService.getProfile(userId);
        displayName = profile.displayName || donation.display_name || 'ผู้บริจาค';
      } catch (profileError) {
        displayName = donation.display_name || 'ผู้บริจาค';
      }
      if (displayName && displayName !== donation.display_name) {
        await donationService.updateDonation(donationId, { display_name: displayName });
      }

      const projectName = project?.name || 'โปรเจกต์';
      await this.sendReplyMessage(replyToken, sourceId, [
        lineService.createDonationThankYouFlex(
          displayName,
          donation.amount_final,
          project?.destination,
          projectName,
          thankYouMessage
        ),
      ]);

      // Clear user state
      await userStateService.clearState(userId, sourceId);
    } else {
      await this.sendReplyMessage(replyToken, sourceId, [
        { type: 'text', text: 'เกิดข้อผิดพลาดในการยืนยันการบริจาค' },
      ]);
    }
  }

  private async showProjects(replyToken: string, sourceId: string): Promise<void> {
    const projects = await projectService.getActiveProjects();

    if (projects.length === 0) {
      await this.sendReplyMessage(replyToken, sourceId, [
        { type: 'text', text: 'ขณะนี้ยังไม่มีโปรเจกต์ที่เปิดรับบริจาค' },
      ]);
      return;
    }

    await this.sendReplyMessage(replyToken, sourceId, [
      { type: 'text', text: '🙏 เลือกโครงการที่ต้องการทำบุญ' },
      lineService.createProjectListFlex(projects),
    ]);
  }

  private async showSummary(
    replyToken: string,
    sourceType: 'user' | 'group',
    sourceId: string
  ): Promise<void> {
    // Get donations for this source today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await Donation.aggregate([
      {
        $match: {
          source_type: sourceType,
          source_id: sourceId,
          status: 'confirmed',
          created_at: { $gte: today },
        },
      },
      {
        $group: {
          _id: '$project_id',
          donation_count: { $sum: 1 },
          total_amount: { $sum: '$amount_final' },
        },
      },
    ]);

    if (result.length === 0) {
      await this.sendReplyMessage(replyToken, sourceId, [
        { type: 'text', text: 'ยังไม่มีการบริจาควันนี้' },
      ]);
      return;
    }

    const messages = [];

    for (const row of result) {
      const project = await Project.findById(row._id);
      const recentDonations = await donationService.getRecentDonations(
        row._id.toString(),
        5
      );

      messages.push(
        lineService.createSummaryFlex(
          project?.name || 'โปรเจกต์',
          row.total_amount,
          row.donation_count,
          recentDonations
        )
      );
    }

    await this.sendReplyMessage(replyToken, sourceId, messages);
  }

  private async sendReplyMessage(
    replyToken: string,
    sourceId: string,
    messages: any[]
  ): Promise<void> {
    const token = typeof replyToken === 'string' ? replyToken.trim() : '';

    if (!token) {
      console.error('Missing reply token, cannot send reply.');
      return;
    }

    try {
      await lineService.replyMessage(token, messages);
    } catch (error: any) {
      const errorData = error?.response?.data || error;
      console.error('Reply failed:', errorData);
    }
  }
}

export default new WebhookHandler();

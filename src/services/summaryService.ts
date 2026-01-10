import cron from 'node-cron';
import lineService from './lineService';
import donationService from './donationService';
import projectService from './projectService';
import Setting from '../models/Setting';
import Donation from '../models/Donation';

export class SummaryService {
  private cronJob: cron.ScheduledTask | null = null;

  async start() {
    const settings = await this.getSettings();
    const summaryTime = settings.summary_time || '19:00';

    const [hour, minute] = summaryTime.split(':');
    const cronExpression = `${minute} ${hour} * * *`;

    console.log(`Scheduling daily summary at ${summaryTime} (cron: ${cronExpression})`);

    this.cronJob = cron.schedule(cronExpression, async () => {
      await this.sendDailySummary();
    });
  }

  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
  }

  async getSettings() {
    const settingsArray = await Setting.find();
    const settings: { [key: string]: string } = {};

    settingsArray.forEach((setting) => {
      settings[setting.key] = setting.value;
    });

    return settings;
  }

  async sendDailySummary() {
    try {
      console.log('Sending daily summary...');

      const settings = await this.getSettings();
      const summaryGroupId = settings.summary_group_id;

      if (!summaryGroupId) {
        console.log('No summary group ID configured');
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const projects = await projectService.getActiveProjects();

      for (const project of projects) {
        const summary = await donationService.getDonationsSummary(
          project.id,
          today
        );

        if (summary.total_donations > 0) {
          const recentDonations = await Donation.find({
            project_id: project.id,
            status: 'confirmed',
            created_at: { $gte: today },
          })
            .sort({ confirmed_at: -1 })
            .limit(10)
            .lean();

          const message = lineService.createSummaryFlex(
            project.name,
            parseFloat(summary.total_amount?.toString() || '0'),
            parseInt(summary.total_donations?.toString() || '0'),
            recentDonations
          );

          console.warn('Skipping summary push message (push disabled).', {
            summaryGroupId,
            projectId: project.id,
          });
        }
      }

      console.log('Daily summary sent successfully');
    } catch (error) {
      console.error('Error sending daily summary:', error);
    }
  }

  async sendManualSummary(
    projectId: string,
    targetType: 'user' | 'group',
    targetId: string
  ) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const project = await projectService.getProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const summary = await donationService.getDonationsSummary(
        projectId,
        today
      );

      const recentDonations = await Donation.find({
        project_id: projectId,
        status: 'confirmed',
        created_at: { $gte: today },
      })
        .sort({ confirmed_at: -1 })
        .limit(10)
        .lean();

      const message = lineService.createSummaryFlex(
        project.name,
        parseFloat(summary.total_amount?.toString() || '0'),
        parseInt(summary.total_donations?.toString() || '0'),
        recentDonations
      );

      console.warn('Skipping manual summary push message (push disabled).', {
        targetId,
        projectId,
      });
    } catch (error) {
      console.error('Error sending manual summary:', error);
      throw error;
    }
  }
}

export default new SummaryService();

import Donation, { IDonation } from '../models/Donation';
import { Donation as DonationType } from '../models/types';
import projectService from './projectService';

export class DonationService {
  async createDonation(data: {
    projectId: string;
    lineUserId: string;
    displayName?: string;
    sourceType: 'user' | 'group';
    sourceId: string;
    amountOcr?: number;
    amountFinal?: number;
    slipImageUrl?: string;
    status?: string;
    isAnonymous?: boolean;
  }): Promise<DonationType> {
    const amountFinal = data.amountFinal ?? data.amountOcr ?? 0;

    const donation = new Donation({
      project_id: data.projectId,
      line_user_id: data.lineUserId,
      display_name: data.displayName,
      source_type: data.sourceType,
      source_id: data.sourceId,
      amount_ocr: data.amountOcr,
      amount_final: amountFinal,
      slip_image_url: data.slipImageUrl,
      status: data.status || 'waiting_slip',
      is_anonymous: data.isAnonymous || false,
    });

    await donation.save();
    return this.toPlainObject(donation);
  }

  async updateDonation(
    id: string,
    data: Partial<DonationType>
  ): Promise<DonationType | null> {
    const updateData: any = {};

    if (data.display_name !== undefined) updateData.display_name = data.display_name;
    if (data.amount_ocr !== undefined) updateData.amount_ocr = data.amount_ocr;
    if (data.amount_final !== undefined) updateData.amount_final = data.amount_final;
    if (data.slip_image_url !== undefined) updateData.slip_image_url = data.slip_image_url;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.is_anonymous !== undefined) updateData.is_anonymous = data.is_anonymous;
    if (data.note !== undefined) updateData.note = data.note;
    if (data.recipient_name !== undefined) updateData.recipient_name = data.recipient_name;

    if (Object.keys(updateData).length === 0) return null;

    const donation = await Donation.findByIdAndUpdate(id, updateData, { new: true });
    return donation ? this.toPlainObject(donation) : null;
  }

  async confirmDonation(id: string, finalAmount: number, recipientName?: string): Promise<DonationType | null> {
    const updateData: any = {
      amount_final: finalAmount,
      status: 'confirmed',
      confirmed_at: new Date(),
    };

    if (recipientName !== undefined) {
      updateData.recipient_name = recipientName;
    }

    const donation = await Donation.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    if (donation) {
      await projectService.updateProjectAmount(
        donation.project_id.toString(),
        finalAmount
      );
    }

    return donation ? this.toPlainObject(donation) : null;
  }

  async getDonation(id: string): Promise<DonationType | null> {
    const donation = await Donation.findById(id);
    return donation ? this.toPlainObject(donation) : null;
  }

  async getDonationsByProject(
    projectId: string,
    status?: string
  ): Promise<DonationType[]> {
    const query: any = { project_id: projectId };
    if (status) query.status = status;

    const donations = await Donation.find(query).sort({ created_at: -1 });
    return donations.map(d => this.toPlainObject(d));
  }

  async getDonationsBySource(
    sourceType: 'user' | 'group',
    sourceId: string
  ): Promise<DonationType[]> {
    const donations = await Donation.find({
      source_type: sourceType,
      source_id: sourceId,
    }).sort({ created_at: -1 });
    return donations.map(d => this.toPlainObject(d));
  }

  async getDonationsSummary(
    projectId: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const query: any = {
      project_id: projectId,
      status: 'confirmed',
    };

    if (startDate) {
      query.created_at = { ...query.created_at, $gte: startDate };
    }
    if (endDate) {
      query.created_at = { ...query.created_at, $lte: endDate };
    }

    const result = await Donation.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          total_donations: { $sum: 1 },
          total_amount: { $sum: '$amount_final' },
          average_amount: { $avg: '$amount_final' },
        },
      },
    ]);

    return result[0] || {
      total_donations: 0,
      total_amount: 0,
      average_amount: 0,
    };
  }

  async getRecentDonations(projectId: string, limit: number = 10): Promise<DonationType[]> {
    const donations = await Donation.find({
      project_id: projectId,
      status: 'confirmed',
    })
      .sort({ confirmed_at: -1 })
      .limit(limit);

    return donations.map(d => this.toPlainObject(d));
  }

  private toPlainObject(donation: IDonation): DonationType {
    return {
      id: donation._id.toString(),
      project_id: donation.project_id.toString(),
      line_user_id: donation.line_user_id,
      display_name: donation.display_name,
      source_type: donation.source_type,
      source_id: donation.source_id,
      amount_ocr: donation.amount_ocr,
      amount_final: donation.amount_final,
      slip_image_url: donation.slip_image_url,
      status: donation.status as 'waiting_slip' | 'ocr_ready' | 'confirmed' | 'rejected',
      is_anonymous: donation.is_anonymous,
      note: donation.note,
      recipient_name: donation.recipient_name,
      created_at: donation.created_at,
      confirmed_at: donation.confirmed_at,
    };
  }
}

export default new DonationService();

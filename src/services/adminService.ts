import Admin, { IAdmin } from '../models/Admin';
import { Admin as AdminType } from '../models/types';

export class AdminService {
  async isAdmin(lineUserId: string): Promise<boolean> {
    const admin = await Admin.findOne({ line_user_id: lineUserId });
    return admin !== null;
  }

  async addAdmin(lineUserId: string, displayName?: string): Promise<AdminType> {
    const admin = new Admin({
      line_user_id: lineUserId,
      display_name: displayName,
    });
    await admin.save();
    return this.toPlainObject(admin);
  }

  async removeAdmin(lineUserId: string): Promise<boolean> {
    const result = await Admin.deleteOne({ line_user_id: lineUserId });
    return result.deletedCount > 0;
  }

  async getAllAdmins(): Promise<AdminType[]> {
    const admins = await Admin.find().sort({ added_at: -1 });
    return admins.map(a => this.toPlainObject(a));
  }

  async getAdmin(lineUserId: string): Promise<AdminType | null> {
    const admin = await Admin.findOne({ line_user_id: lineUserId });
    return admin ? this.toPlainObject(admin) : null;
  }

  private toPlainObject(admin: IAdmin): AdminType {
    return {
      id: admin._id.toString(),
      line_user_id: admin.line_user_id,
      display_name: admin.display_name,
      added_at: admin.added_at,
    };
  }
}

export default new AdminService();

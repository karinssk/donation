import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminUser extends Document {
  email: string;
  password: string;
  name?: string;
  created_at: Date;
  last_login?: Date;
}

const AdminUserSchema: Schema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  created_at: { type: Date, default: Date.now },
  last_login: { type: Date }
});

export default mongoose.model<IAdminUser>('AdminUser', AdminUserSchema);

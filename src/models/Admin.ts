import mongoose, { Schema, Document } from 'mongoose';

export interface IAdmin extends Document {
  line_user_id: string;
  display_name?: string;
  added_at: Date;
}

const AdminSchema: Schema = new Schema({
  line_user_id: { type: String, required: true, unique: true },
  display_name: { type: String },
  added_at: { type: Date, default: Date.now },
});

export default mongoose.model<IAdmin>('Admin', AdminSchema);

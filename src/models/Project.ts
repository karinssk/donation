import mongoose, { Schema, Document } from 'mongoose';

export interface IProject extends Document {
  name: string;
  description?: string;
  destination?: string;
  promptpay_qr_url?: string;
  goal_amount?: number;
  current_amount: number;
  total_expenses: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

const ProjectSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    destination: { type: String },
    promptpay_qr_url: { type: String },
    goal_amount: { type: Number },
    current_amount: { type: Number, default: 0 },
    total_expenses: { type: Number, default: 0 },
    status: { type: String, default: 'active' },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

export default mongoose.model<IProject>('Project', ProjectSchema);

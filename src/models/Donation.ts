import mongoose, { Schema, Document } from 'mongoose';

export interface IDonation extends Document {
  project_id: mongoose.Types.ObjectId;
  line_user_id: string;
  display_name?: string;
  source_type: 'user' | 'group';
  source_id: string;
  amount_ocr?: number;
  amount_final: number;
  slip_image_url?: string;
  status: string;
  is_anonymous: boolean;
  note?: string;
  recipient_name?: string;
  created_at: Date;
  confirmed_at?: Date;
}

const DonationSchema: Schema = new Schema(
  {
    project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    line_user_id: { type: String, required: true },
    display_name: { type: String },
    source_type: { type: String, required: true, enum: ['user', 'group'], index: true },
    source_id: { type: String, required: true, index: true },
    amount_ocr: { type: Number },
    amount_final: { type: Number, required: true },
    slip_image_url: { type: String },
    status: { type: String, default: 'waiting_slip', index: true },
    is_anonymous: { type: Boolean, default: false },
    note: { type: String },
    recipient_name: { type: String },
    confirmed_at: { type: Date },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: false },
  }
);

// Compound indexes for common queries
DonationSchema.index({ source_type: 1, source_id: 1 });
DonationSchema.index({ created_at: -1 });

export default mongoose.model<IDonation>('Donation', DonationSchema);

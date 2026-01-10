import mongoose, { Schema, Document } from 'mongoose';

export interface ISetting extends Document {
  key: string;
  value: string;
  description?: string;
  updated_at: Date;
}

const SettingSchema: Schema = new Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
  description: { type: String },
  updated_at: { type: Date, default: Date.now },
});

export default mongoose.model<ISetting>('Setting', SettingSchema);

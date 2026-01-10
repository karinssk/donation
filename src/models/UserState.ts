import mongoose, { Schema, Document } from 'mongoose';

export interface IUserState extends Document {
  user_id: string;
  source_type: 'user' | 'group';
  source_id: string;
  pending_project_id?: mongoose.Types.ObjectId;
  state?: string;
  created_at: Date;
  updated_at: Date;
}

const UserStateSchema: Schema = new Schema(
  {
    user_id: { type: String, required: true },
    source_type: { type: String, required: true, enum: ['user', 'group'] },
    source_id: { type: String, required: true },
    pending_project_id: { type: Schema.Types.ObjectId, ref: 'Project' },
    state: { type: String },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Unique compound index to ensure one state per user-source combination
UserStateSchema.index({ user_id: 1, source_id: 1 }, { unique: true });

export default mongoose.model<IUserState>('UserState', UserStateSchema);

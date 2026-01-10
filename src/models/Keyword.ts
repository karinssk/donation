import mongoose, { Schema, Document } from 'mongoose';

export interface IKeyword extends Document {
  keyword: string;
  action: string;
  is_active: boolean;
  created_at: Date;
}

const KeywordSchema: Schema = new Schema({
  keyword: { type: String, required: true, unique: true },
  action: { type: String, required: true },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.model<IKeyword>('Keyword', KeywordSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface IExpense extends Document {
  project_id: mongoose.Types.ObjectId;
  amount: number;
  description: string;
  receipt_url?: string;
  created_by_admin_id?: mongoose.Types.ObjectId;
  created_at: Date;
}

const ExpenseSchema: Schema = new Schema({
  project_id: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  receipt_url: { type: String },
  created_by_admin_id: { type: Schema.Types.ObjectId, ref: 'Admin' },
  created_at: { type: Date, default: Date.now },
});

export default mongoose.model<IExpense>('Expense', ExpenseSchema);

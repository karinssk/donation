import Expense, { IExpense } from '../models/Expense';
import { Expense as ExpenseType } from '../models/types';
import projectService from './projectService';

export class ExpenseService {
  async createExpense(
    projectId: string,
    amount: number,
    description: string,
    receiptUrl?: string,
    createdByAdminId?: string
  ): Promise<ExpenseType> {
    const expense = new Expense({
      project_id: projectId,
      amount,
      description,
      receipt_url: receiptUrl,
      created_by_admin_id: createdByAdminId,
    });

    await expense.save();
    await projectService.updateProjectExpenses(projectId, amount);

    return this.toPlainObject(expense);
  }

  async updateExpense(
    id: string,
    data: { amount?: number; description?: string; receipt_url?: string }
  ): Promise<ExpenseType | null> {
    const expense = await this.getExpense(id);
    if (!expense) return null;

    const updateData: any = {};

    if (data.amount !== undefined) {
      const diff = data.amount - expense.amount;
      await projectService.updateProjectExpenses(expense.project_id, diff);
      updateData.amount = data.amount;
    }
    if (data.description !== undefined) {
      updateData.description = data.description;
    }
    if (data.receipt_url !== undefined) {
      updateData.receipt_url = data.receipt_url;
    }

    if (Object.keys(updateData).length === 0) return expense;

    const updated = await Expense.findByIdAndUpdate(id, updateData, { new: true });
    return updated ? this.toPlainObject(updated) : null;
  }

  async deleteExpense(id: string): Promise<boolean> {
    const expense = await this.getExpense(id);
    if (!expense) return false;

    await projectService.updateProjectExpenses(expense.project_id, -expense.amount);

    const result = await Expense.findByIdAndDelete(id);
    return result !== null;
  }

  async getExpense(id: string): Promise<ExpenseType | null> {
    const expense = await Expense.findById(id);
    return expense ? this.toPlainObject(expense) : null;
  }

  async getExpensesByProject(projectId: string): Promise<ExpenseType[]> {
    const expenses = await Expense.find({ project_id: projectId }).sort({ created_at: -1 });
    return expenses.map(e => this.toPlainObject(e));
  }

  async getTotalExpenses(projectId: string): Promise<number> {
    const result = await Expense.aggregate([
      { $match: { project_id: projectId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return result[0]?.total || 0;
  }

  private toPlainObject(expense: IExpense): ExpenseType {
    return {
      id: expense._id.toString(),
      project_id: expense.project_id.toString(),
      amount: expense.amount,
      description: expense.description,
      receipt_url: expense.receipt_url,
      created_by_admin_id: expense.created_by_admin_id?.toString(),
      created_at: expense.created_at,
    };
  }
}

export default new ExpenseService();

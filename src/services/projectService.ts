import Project, { IProject } from '../models/Project';
import { Project as ProjectType } from '../models/types';

export class ProjectService {
  async createProject(
    name: string,
    description?: string,
    goalAmount?: number,
    promptpayQrUrl?: string,
    destination?: string
  ): Promise<ProjectType> {
    const project = new Project({
      name,
      description,
      destination,
      goal_amount: goalAmount,
      promptpay_qr_url: promptpayQrUrl,
    });
    await project.save();
    return this.toPlainObject(project);
  }

  async updateProject(
    id: string,
    data: Partial<ProjectType>
  ): Promise<ProjectType | null> {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.destination !== undefined) updateData.destination = data.destination;
    if (data.promptpay_qr_url !== undefined) updateData.promptpay_qr_url = data.promptpay_qr_url;
    if (data.goal_amount !== undefined) updateData.goal_amount = data.goal_amount;
    if (data.status !== undefined) updateData.status = data.status;

    if (Object.keys(updateData).length === 0) return null;

    updateData.updated_at = new Date();

    const project = await Project.findByIdAndUpdate(id, updateData, { new: true });
    return project ? this.toPlainObject(project) : null;
  }

  async deleteProject(id: string): Promise<boolean> {
    const result = await Project.findByIdAndDelete(id);
    return result !== null;
  }

  async getProject(id: string | number): Promise<ProjectType | null> {
    const project = await Project.findById(id);
    return project ? this.toPlainObject(project) : null;
  }

  async getAllProjects(status?: string): Promise<ProjectType[]> {
    const query = status ? { status } : {};
    const projects = await Project.find(query).sort({ created_at: -1 });
    return projects.map(p => this.toPlainObject(p));
  }

  async getActiveProjects(): Promise<ProjectType[]> {
    return this.getAllProjects('active');
  }

  async updateProjectAmount(projectId: string, amount: number): Promise<void> {
    await Project.findByIdAndUpdate(projectId, {
      $inc: { current_amount: amount },
      updated_at: new Date(),
    });
  }

  async updateProjectExpenses(projectId: string, amount: number): Promise<void> {
    await Project.findByIdAndUpdate(projectId, {
      $inc: { total_expenses: amount },
      updated_at: new Date(),
    });
  }

  async getProjectBalance(projectId: string): Promise<number> {
    const project = await Project.findById(projectId);
    if (!project) return 0;
    return (project.current_amount || 0) - (project.total_expenses || 0);
  }

  private toPlainObject(project: IProject): ProjectType {
    return {
      id: project._id.toString(),
      name: project.name,
      description: project.description,
      destination: project.destination,
      promptpay_qr_url: project.promptpay_qr_url,
      goal_amount: project.goal_amount,
      current_amount: project.current_amount,
      total_expenses: project.total_expenses,
      status: project.status as 'active' | 'completed' | 'archived',
      created_at: project.created_at,
      updated_at: project.updated_at,
    };
  }
}

export default new ProjectService();

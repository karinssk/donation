import UserState, { IUserState } from '../models/UserState';
import { UserState as UserStateType } from '../models/types';

export class UserStateService {
  async setState(
    userId: string,
    sourceType: 'user' | 'group',
    sourceId: string,
    state: string,
    pendingProjectId?: string
  ): Promise<UserStateType> {
    const userState = await UserState.findOneAndUpdate(
      { user_id: userId, source_id: sourceId },
      {
        user_id: userId,
        source_type: sourceType,
        source_id: sourceId,
        state,
        pending_project_id: pendingProjectId,
        updated_at: new Date(),
      },
      { upsert: true, new: true }
    );

    return this.toPlainObject(userState);
  }

  async getState(userId: string, sourceId: string): Promise<UserStateType | null> {
    const userState = await UserState.findOne({
      user_id: userId,
      source_id: sourceId,
    });
    return userState ? this.toPlainObject(userState) : null;
  }

  async clearState(userId: string, sourceId: string): Promise<boolean> {
    const result = await UserState.deleteOne({
      user_id: userId,
      source_id: sourceId,
    });
    return result.deletedCount > 0;
  }

  async updatePendingProject(
    userId: string,
    sourceId: string,
    projectId: string
  ): Promise<UserStateType | null> {
    const userState = await UserState.findOneAndUpdate(
      { user_id: userId, source_id: sourceId },
      {
        pending_project_id: projectId,
        state: 'waiting_slip',
        updated_at: new Date(),
      },
      { new: true }
    );

    return userState ? this.toPlainObject(userState) : null;
  }

  async lockWaitingConfirmation(
    userId: string,
    sourceType: 'user' | 'group',
    sourceId: string,
    projectId: string
  ): Promise<UserStateType | null> {
    const userState = await UserState.findOneAndUpdate(
      {
        user_id: userId,
        source_id: sourceId,
        pending_project_id: projectId,
        state: { $ne: 'waiting_confirmation' },
      },
      {
        user_id: userId,
        source_type: sourceType,
        source_id: sourceId,
        state: 'waiting_confirmation',
        pending_project_id: projectId,
        updated_at: new Date(),
      },
      { new: true }
    );

    return userState ? this.toPlainObject(userState) : null;
  }

  private toPlainObject(userState: IUserState): UserStateType {
    return {
      id: userState._id.toString(),
      user_id: userState.user_id,
      source_type: userState.source_type,
      source_id: userState.source_id,
      pending_project_id: userState.pending_project_id?.toString(),
      state: userState.state as 'waiting_project_selection' | 'waiting_slip' | 'waiting_confirmation',
      created_at: userState.created_at,
      updated_at: userState.updated_at,
    };
  }
}

export default new UserStateService();

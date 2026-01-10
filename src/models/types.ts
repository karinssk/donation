export interface Project {
  id: string;
  name: string;
  description?: string;
  destination?: string;
  promptpay_qr_url?: string;
  goal_amount?: number;
  current_amount: number;
  total_expenses: number;
  status: 'active' | 'completed' | 'archived';
  created_at: Date;
  updated_at: Date;
}

export interface Admin {
  id: string;
  line_user_id: string;
  display_name?: string;
  added_at: Date;
}

export interface UserState {
  id: string;
  user_id: string;
  source_type: 'user' | 'group';
  source_id: string;
  pending_project_id?: string;
  state: 'waiting_project_selection' | 'waiting_slip' | 'waiting_confirmation';
  created_at: Date;
  updated_at: Date;
}

export interface Donation {
  id: string;
  project_id: string;
  line_user_id: string;
  display_name?: string;
  source_type: 'user' | 'group';
  source_id: string;
  amount_ocr?: number;
  amount_final: number;
  slip_image_url?: string;
  status: 'waiting_slip' | 'ocr_ready' | 'waiting_confirmation' | 'confirmed' | 'rejected';
  is_anonymous: boolean;
  note?: string;
  recipient_name?: string;
  created_at: Date;
  confirmed_at?: Date;
}

export interface Expense {
  id: string;
  project_id: string;
  amount: number;
  description: string;
  receipt_url?: string;
  created_by_admin_id?: string;
  created_at: Date;
}

export interface Keyword {
  id: string;
  keyword: string;
  action: 'show_projects' | 'show_summary';
  is_active: boolean;
  created_at: Date;
}

export interface Setting {
  key: string;
  value: string;
  description?: string;
  updated_at: Date;
}

export type UserPlan = 'Free' | 'Basic' | 'Standard' | 'Premium';

export interface PlanDetails {
  id: string;
  name: UserPlan;
  price: number;
  priceLabel: string;
  benefits: string[];
}

export interface User {
  gmail: string;
  name: string;
  password?: string;
  plan: UserPlan;
  price: number;
  paymentStatus: 'none' | 'pending' | 'approved' | 'rejected';
  createdAt: string;
  dailyUploadsCount: number;
  lastUploadDate?: string; // YYYY-MM-DD
}

export interface PaymentRequest {
  id: string;
  gmail: string;
  name: string;
  planName: UserPlan;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface AIHistoryItem {
  id: string;
  gmail: string;
  type: 'photo' | 'text_file' | 'direct_text';
  fileName?: string;
  promptText?: string;
  response: string;
  timestamp: string;
}

export interface AppStats {
  totalUsers: number;
  pendingPaymentsCount: number;
  approvedPaymentsCount: number;
  totalRevenue: number;
}

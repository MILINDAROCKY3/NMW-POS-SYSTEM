export interface InventoryItem {
  id: string;
  item_code: string;
  name: string;
  box_number: string;
  category: string;
  cost_price: number;
  selling_price: number;
  quantity: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  phone_model?: string;
  notes?: string;
  total_spent: number;
  bills_count: number;
  last_visit: string;
  created_at: string;
}

export interface BillItem {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  box_number: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export type PaymentMethod = 'Cash' | 'Card' | 'Bank Transfer' | 'Credit';

export interface Bill {
  id: string;
  bill_number: string;
  customer_id?: string;
  customer_name: string;
  customer_phone: string;
  phone_model?: string;
  issue_notes?: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  discount_type: 'fixed' | 'percentage';
  net_total: number;
  paid_amount: number;
  balance: number;
  payment_method: PaymentMethod;
  status: 'Completed' | 'Pending' | 'Cancelled';
  created_at: string;
  created_by: string;
}

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'staff';
  created_at: string;
  last_login?: string;
}

export interface ShopSettings {
  shop_name: string;
  tagline: string;
  phone: string;
  alt_phone: string;
  address: string;
  city: string;
  currency_symbol: string; // e.g., 'Rs.'
  currency_code: string; // 'LKR'
  receipt_footer: string;
  warranty_terms: string;
  auto_print_on_save: boolean;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isEnabled: boolean;
  lastSyncedAt?: string;
}

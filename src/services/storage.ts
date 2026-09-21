import { InventoryItem, Customer, Bill, ShopSettings, SupabaseConfig, AdminUser } from '../types';
import { getSupabaseClient } from './supabase';

// 🛑 Local Storage එකේ භාණ්ඩ හෝ බිල්පත් කිසිවක් තබා නොගනී.
// හුදෙක් සම්බන්ධ වීමට අවශ්‍ය Supabase credentials සහ Session එක පමණක් session-level තබා ගනී.
const STORAGE_KEYS = {
  SETTINGS: 'nmw_pos_settings_v1',
  SUPABASE_CONFIG: 'nmw_pos_supabase_v1',
  AUTH_USER: 'nmw_pos_auth_user_v1',
};

export const DEFAULT_SETTINGS: ShopSettings = {
  shop_name: 'NMW POS SYSTEM',
  tagline: 'Mobile Repair, Spare Parts & Electronics Care',
  phone: '077 123 4567',
  alt_phone: '011 234 5678',
  address: 'No. 142/A, Galle Road, Colombo',
  city: 'Colombo, Sri Lanka',
  currency_symbol: 'Rs.',
  currency_code: 'LKR',
  receipt_footer: 'Thank you for choosing NMW POS! 30-day warranty on replaced hardware modules.',
  warranty_terms: 'Warranty void if physical damage, water entry or tampering stickers are broken.',
  auto_print_on_save: true,
};

export const DEFAULT_ADMIN: AdminUser = {
  id: 'usr-admin-1',
  username: 'NMWadmin',
  email: 'admin@nmwpos.lk',
  role: 'admin',
  created_at: new Date().toISOString(),
  last_login: new Date().toISOString(),
};

// ========================================================
// ☁️ 1. CLOUD-ONLY INVENTORY OPERATIONS (DIRECT SUPABASE)
// ========================================================

// Supabase වෙතින් සෘජුවම භාණ්ඩ ලබා ගැනීම
export async function fetchCloudInventory(config: SupabaseConfig): Promise<InventoryItem[]> {
  const client = getSupabaseClient(config);
  if (!client || !config.isEnabled) return [];

  try {
    const { data, error } = await client
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((i: any) => ({
      id: i.id,
      item_code: i.item_code,
      name: i.name,
      box_number: i.box_number || 'BOX-01',
      category: i.category || 'General',
      cost_price: Number(i.cost_price) || 0,
      selling_price: Number(i.selling_price) || 0,
      quantity: Number(i.quantity) || 0,
      low_stock_threshold: Number(i.low_stock_threshold) || 3,
      created_at: i.created_at || new Date().toISOString(),
      updated_at: i.updated_at || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

// සෘජුවම Supabase Cloud එකට Item එක Save/Update කිරීම (No LocalStorage)
export async function saveCloudInventoryItem(config: SupabaseConfig, item: InventoryItem): Promise<boolean> {
  const client = getSupabaseClient(config);
  if (!client || !config.isEnabled) return false;

  try {
    const payload = {
      id: item.id.startsWith('itm-') ? generateUUID() : item.id,
      item_code: item.item_code,
      name: item.name,
      box_number: item.box_number,
      category: item.category,
      cost_price: item.cost_price,
      selling_price: item.selling_price,
      quantity: item.quantity,
      low_stock_threshold: item.low_stock_threshold,
      updated_at: new Date().toISOString(),
    };
    const { error } = await client.from('inventory').upsert(payload, { onConflict: 'item_code' });
    return !error;
  } catch {
    return false;
  }
}

// සෘජුවම Supabase Cloud එකෙන් Item එක Delete කිරීම
export async function deleteCloudInventoryItem(config: SupabaseConfig, itemId: string): Promise<boolean> {
  const client = getSupabaseClient(config);
  if (!client || !config.isEnabled) return false;

  try {
    const { error } = await client.from('inventory').delete().eq('id', itemId);
    return !error;
  } catch {
    return false;
  }
}

// ========================================================
// ☁️ 2. CLOUD-ONLY CUSTOMERS OPERATIONS (DIRECT SUPABASE)
// ========================================================

export async function fetchCloudCustomers(config: SupabaseConfig): Promise<Customer[]> {
  const client = getSupabaseClient(config);
  if (!client || !config.isEnabled) return [];

  try {
    const { data, error } = await client
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((c: any) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      phone_model: c.phone_model,
      notes: c.notes,
      total_spent: Number(c.total_spent) || 0,
      bills_count: Number(c.bills_count) || 0,
      last_visit: c.last_visit || new Date().toISOString(),
      created_at: c.created_at || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function saveCloudCustomer(config: SupabaseConfig, customer: Customer): Promise<boolean> {
  const client = getSupabaseClient(config);
  if (!client || !config.isEnabled) return false;

  try {
    const payload = {
      id: customer.id.startsWith('cust-') ? generateUUID() : customer.id,
      name: customer.name,
      phone: customer.phone,
      phone_model: customer.phone_model,
      notes: customer.notes,
      total_spent: customer.total_spent,
      bills_count: customer.bills_count,
      last_visit: customer.last_visit,
    };
    const { error } = await client.from('customers').upsert(payload, { onConflict: 'phone' });
    return !error;
  } catch {
    return false;
  }
}

// ========================================================
// ☁️ 3. CLOUD-ONLY BILLS OPERATIONS (DIRECT SUPABASE)
// ========================================================

export async function fetchCloudBills(config: SupabaseConfig): Promise<Bill[]> {
  const client = getSupabaseClient(config);
  if (!client || !config.isEnabled) return [];

  try {
    const { data: billsData, error: billsErr } = await client
      .from('bills')
      .select('*')
      .order('created_at', { ascending: false });

    if (billsErr || !billsData) return [];

    const { data: itemsData } = await client.from('bill_items').select('*');
    const itemsMap: Record<string, any[]> = {};
    if (itemsData) {
      itemsData.forEach((it: any) => {
        if (!itemsMap[it.bill_id]) itemsMap[it.bill_id] = [];
        itemsMap[it.bill_id].push({
          id: it.id,
          item_id: it.item_id,
          item_code: it.item_code,
          item_name: it.item_name,
          box_number: it.box_number,
          quantity: Number(it.quantity) || 1,
          unit_price: Number(it.unit_price) || 0,
          line_total: Number(it.line_total) || 0,
        });
      });
    }

    return billsData.map((b: any) => ({
      id: b.id,
      bill_number: b.bill_number,
      customer_id: b.customer_id,
      customer_name: b.customer_name,
      customer_phone: b.customer_phone,
      phone_model: b.phone_model,
      issue_notes: b.issue_notes,
      items: itemsMap[b.id] || [],
      subtotal: Number(b.subtotal) || 0,
      discount: Number(b.discount) || 0,
      discount_type: b.discount_type || 'fixed',
      net_total: Number(b.net_total) || 0,
      paid_amount: Number(b.paid_amount) || 0,
      balance: Number(b.balance) || 0,
      payment_method: b.payment_method || 'Cash',
      status: b.status || 'Completed',
      created_at: b.created_at,
      created_by: b.created_by || 'NMWadmin',
    }));
  } catch {
    return [];
  }
}

export async function saveCloudBill(config: SupabaseConfig, bill: Bill): Promise<boolean> {
  const client = getSupabaseClient(config);
  if (!client || !config.isEnabled) return false;

  try {
    const billPayload = {
      id: bill.id.startsWith('bill-') ? generateUUID() : bill.id,
      bill_number: bill.bill_number,
      customer_id: bill.customer_id || null,
      customer_name: bill.customer_name,
      customer_phone: bill.customer_phone,
      phone_model: bill.phone_model || null,
      issue_notes: bill.issue_notes || null,
      subtotal: bill.subtotal,
      discount: bill.discount,
      discount_type: bill.discount_type,
      net_total: bill.net_total,
      paid_amount: bill.paid_amount,
      balance: bill.balance,
      payment_method: bill.payment_method,
      status: bill.status,
      created_at: bill.created_at,
      created_by: bill.created_by,
    };

    const { error: billError } = await client.from('bills').upsert(billPayload, { onConflict: 'id' });
    if (billError) return false;

    if (bill.items && bill.items.length > 0) {
      const itemsPayload = bill.items.map((it) => ({
        id: generateUUID(),
        bill_id: billPayload.id,
        item_id: it.item_id || null,
        item_code: it.item_code,
        item_name: it.item_name,
        box_number: it.box_number,
        quantity: it.quantity,
        unit_price: it.unit_price,
        line_total: it.line_total,
      }));
      await client.from('bill_items').upsert(itemsPayload, { onConflict: 'id' });
    }

    return true;
  } catch {
    return false;
  }
}

// ========================================================
// ⚙️ FALLBACK IN-MEMORY METHODS (BROWSER STORAGE REMAINS EMPTY)
// ========================================================
// App එකේ පැරණි functions වලට crash නොවී වැඩ කිරීම සඳහා:
export function getStoredInventory(): InventoryItem[] { return []; }
export function saveStoredInventory(_items: InventoryItem[]): void { /* Local storage එකට කිසිවක් නොලියයි */ }

export function getStoredCustomers(): Customer[] { return []; }
export function saveStoredCustomers(_customers: Customer[]): void { /* Local storage එකට කිසිවක් නොලියයි */ }

export function getStoredBills(): Bill[] { return []; }
export function saveStoredBills(_bills: Bill[]): void { /* Local storage එකට කිසිවක් නොලියයි */ }

// Settings & Config
export function getStoredSettings(): ShopSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: ShopSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {}
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
    if (!raw) {
      const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
      const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
      return { url: envUrl, anonKey: envKey, isEnabled: Boolean(envUrl && envKey) };
    }
    return JSON.parse(raw);
  } catch {
    return { url: '', anonKey: '', isEnabled: false };
  }
}

export function saveStoredSupabaseConfig(config: SupabaseConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
  } catch {}
}

// 🔐 SESSION STORAGE (CLOSING TAB LOGS OUT AUTOMATICALLY)
export function getStoredAuthUser(): AdminUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.AUTH_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveStoredAuthUser(user: AdminUser | null): void {
  try {
    if (user) {
      sessionStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.AUTH_USER);
    }
  } catch {}
}

export function getAdminUsers(): AdminUser[] {
  return [DEFAULT_ADMIN];
}

export function saveAdminUsers(_users: AdminUser[]): void {}

// Helpers
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateNextItemCode(items: InventoryItem[]): string {
  let highestNum = 0;
  const regex = /NMW-ITM-(\d+)/i;
  for (const item of items) {
    const match = item.item_code.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > highestNum) highestNum = num;
    }
  }
  return `NMW-ITM-${(highestNum + 1).toString().padStart(3, '0')}`;
}

export function generateNextBillNumber(bills: Bill[]): string {
  const currentYear = new Date().getFullYear();
  let highestNum = 0;
  const regex = new RegExp(`NMW-BILL-${currentYear}-(\\d+)`, 'i');
  for (const b of bills) {
    const match = b.bill_number.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > highestNum) highestNum = num;
    }
  }
  return `NMW-BILL-${currentYear}-${(highestNum + 1).toString().padStart(4, '0')}`;
}

export function formatRupees(amount: number, symbol: string = 'Rs.'): string {
  const formatted = Number(amount || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted}`;
}

// Full Sync Helper for Settings View
export async function syncWithSupabase(config: SupabaseConfig): Promise<{
  success: boolean;
  message: string;
  inventory?: InventoryItem[];
  customers?: Customer[];
  bills?: Bill[];
}> {
  try {
    const inventory = await fetchCloudInventory(config);
    const customers = await fetchCloudCustomers(config);
    const bills = await fetchCloudBills(config);

    return {
      success: true,
      message: 'Cloud data successfully fetched from Supabase!',
      inventory,
      customers,
      bills,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Sync failed.' };
  }
}

import { InventoryItem, Customer, Bill, ShopSettings, SupabaseConfig, AdminUser } from '../types';
import { getSupabaseClient } from './supabase';

const STORAGE_KEYS = {
  INVENTORY: 'nmw_pos_inventory_v1',
  CUSTOMERS: 'nmw_pos_customers_v1',
  BILLS: 'nmw_pos_bills_v1',
  SETTINGS: 'nmw_pos_settings_v1',
  SUPABASE_CONFIG: 'nmw_pos_supabase_v1',
  AUTH_USER: 'nmw_pos_auth_user_v1',
  USERS: 'nmw_pos_admin_users_v1',
  PASSWORD_RESETS: 'nmw_pos_password_resets_v1',
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

// ========================================================
// 🛑 ALL DEMO DATA REMOVED (NOW COMPLETELY EMPTY ARRAYS)
// ========================================================
const SEED_INVENTORY: InventoryItem[] = [];

const SEED_CUSTOMERS: Customer[] = [];

const SEED_BILLS: Bill[] = [];

export const DEFAULT_ADMIN: AdminUser = {
  id: 'usr-admin-1',
  username: 'NMWadmin',
  email: 'admin@nmwpos.lk',
  role: 'admin',
  created_at: new Date().toISOString(),
  last_login: new Date().toISOString(),
};

// Storage helper methods
export function getStoredInventory(): InventoryItem[] {
  const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(SEED_INVENTORY));
    return SEED_INVENTORY;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_INVENTORY;
  }
}

export function saveStoredInventory(items: InventoryItem[]): void {
  localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
}

export function getStoredCustomers(): Customer[] {
  const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(SEED_CUSTOMERS));
    return SEED_CUSTOMERS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_CUSTOMERS;
  }
}

export function saveStoredCustomers(customers: Customer[]): void {
  localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
}

export function getStoredBills(): Bill[] {
  const raw = localStorage.getItem(STORAGE_KEYS.BILLS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(SEED_BILLS));
    return SEED_BILLS;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return SEED_BILLS;
  }
}

export function saveStoredBills(bills: Bill[]): void {
  localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
}

export function getStoredSettings(): ShopSettings {
  const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: ShopSettings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

export function getStoredSupabaseConfig(): SupabaseConfig {
  const raw = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
  if (!raw) {
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
    const initial: SupabaseConfig = {
      url: envUrl,
      anonKey: envKey,
      isEnabled: Boolean(envUrl && envKey),
    };
    return initial;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { url: '', anonKey: '', isEnabled: false };
  }
}

export function saveStoredSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
}

// ✅ WEB PAGE එක CLOSE කළ සැණින් AUTO LOGOUT වී LOGIN PAGE එකට ඒම සඳහා:
export function getStoredAuthUser(): AdminUser | null {
  const raw = sessionStorage.getItem(STORAGE_KEYS.AUTH_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoredAuthUser(user: AdminUser | null): void {
  if (user) {
    sessionStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  }
}
export function getAdminUsers(): AdminUser[] {
  const raw = localStorage.getItem(STORAGE_KEYS.USERS);
  if (!raw) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([DEFAULT_ADMIN]));
    return [DEFAULT_ADMIN];
  }
  try {
    return JSON.parse(raw);
  } catch {
    return [DEFAULT_ADMIN];
  }
}

export function saveAdminUsers(users: AdminUser[]): void {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

// UUID Generator
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

// Generate Next Item Code
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
  const next = highestNum + 1;
  return `NMW-ITM-${next.toString().padStart(3, '0')}`;
}

// Generate Next Bill Number
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
  const next = highestNum + 1;
  return `NMW-BILL-${currentYear}-${next.toString().padStart(4, '0')}`;
}

// Format Sri Lankan Rupees
export function formatRupees(amount: number, symbol: string = 'Rs.'): string {
  const formatted = Number(amount || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted}`;
}

// Async Full Sync with Supabase
export async function syncWithSupabase(config: SupabaseConfig): Promise<{
  success: boolean;
  message: string;
  inventory?: InventoryItem[];
  customers?: Customer[];
  bills?: Bill[];
}> {
  const client = getSupabaseClient(config);
  if (!client || !config.isEnabled) {
    return { success: false, message: 'Supabase is not configured or enabled.' };
  }

  try {
    // 1. Fetch remote inventory or push local
    const { data: remoteInventory, error: invErr } = await client.from('inventory').select('*').order('created_at', { ascending: false });
    let resolvedInventory = getStoredInventory();
    if (!invErr && remoteInventory && remoteInventory.length > 0) {
      resolvedInventory = remoteInventory.map((i: any) => ({
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
      saveStoredInventory(resolvedInventory);
    } else if (!invErr && (!remoteInventory || remoteInventory.length === 0)) {
      const local = getStoredInventory();
      if (local.length > 0) {
        const payload = local.map((i) => ({
          id: i.id.startsWith('itm-') ? generateUUID() : i.id,
          item_code: i.item_code,
          name: i.name,
          box_number: i.box_number,
          category: i.category,
          cost_price: i.cost_price,
          selling_price: i.selling_price,
          quantity: i.quantity,
          low_stock_threshold: i.low_stock_threshold,
        }));
        await client.from('inventory').upsert(payload, { onConflict: 'item_code' });
      }
    }

    // 2. Fetch remote customers or push local
    const { data: remoteCustomers, error: custErr } = await client.from('customers').select('*').order('created_at', { ascending: false });
    let resolvedCustomers = getStoredCustomers();
    if (!custErr && remoteCustomers && remoteCustomers.length > 0) {
      resolvedCustomers = remoteCustomers.map((c: any) => ({
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
      saveStoredCustomers(resolvedCustomers);
    } else if (!custErr && (!remoteCustomers || remoteCustomers.length === 0)) {
      const localCust = getStoredCustomers();
      if (localCust.length > 0) {
        const payload = localCust.map((c) => ({
          id: c.id.startsWith('cust-') ? generateUUID() : c.id,
          name: c.name,
          phone: c.phone,
          phone_model: c.phone_model,
          notes: c.notes,
          total_spent: c.total_spent,
          bills_count: c.bills_count,
        }));
        await client.from('customers').upsert(payload, { onConflict: 'phone' });
      }
    }

    // 3. Fetch remote bills and bill_items
    const { data: remoteBills, error: billsErr } = await client.from('bills').select('*').order('created_at', { ascending: false });
    let resolvedBills = getStoredBills();
    if (!billsErr && remoteBills && remoteBills.length > 0) {
      const { data: remoteItems } = await client.from('bill_items').select('*');
      const itemsMap: Record<string, any[]> = {};
      if (remoteItems) {
        remoteItems.forEach((it: any) => {
          if (!itemsMap[it.bill_id]) itemsMap[it.bill_id] = [];
          itemsMap[it.bill_id].push({
            id: it.id,
            item_id: it.item_id || it.id,
            item_code: it.item_code,
            item_name: it.item_name,
            box_number: it.box_number,
            quantity: Number(it.quantity) || 1,
            unit_price: Number(it.unit_price) || 0,
            line_total: Number(it.line_total) || 0,
          });
        });
      }

      resolvedBills = remoteBills.map((b: any) => ({
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
      saveStoredBills(resolvedBills);
    } else if (!billsErr && (!remoteBills || remoteBills.length === 0)) {
      const localBills = getStoredBills();
      for (const bill of localBills) {
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
        await client.from('bills').upsert(billPayload, { onConflict: 'id' });
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
      }
    }

    config.lastSyncedAt = new Date().toISOString();
    saveStoredSupabaseConfig(config);

    return {
      success: true,
      message: 'Data synchronized successfully with Supabase Cloud!',
      inventory: resolvedInventory,
      customers: resolvedCustomers,
      bills: resolvedBills,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Sync failed.' };
  }
}

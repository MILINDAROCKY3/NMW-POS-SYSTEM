import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig, InventoryItem, Customer, Bill, BillItem, AdminUser } from '../types';

let supabaseClient: SupabaseClient | null = null;
let cachedConfigKey = '';

export function getSupabaseClient(config?: SupabaseConfig): SupabaseClient | null {
  // If config provided, check if client needs recreation
  if (config && config.url && config.anonKey) {
    const key = `${config.url}_${config.anonKey}`;
    if (supabaseClient && cachedConfigKey === key) {
      return supabaseClient;
    }
    try {
      supabaseClient = createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
      cachedConfigKey = key;
      return supabaseClient;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  // Fallback to env if available
  if (!supabaseClient) {
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
    if (envUrl && envKey) {
      try {
        supabaseClient = createClient(envUrl, envKey);
        cachedConfigKey = `${envUrl}_${envKey}`;
      } catch (err) {
        console.error('Failed to initialize Supabase from env:', err);
      }
    }
  }

  return supabaseClient;
}

export function resetSupabaseClient(): void {
  supabaseClient = null;
  cachedConfigKey = '';
}

export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  try {
    const client = createClient(url, key);
    // Probe database
    const { error } = await client.from('inventory').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      if (error.message.includes('relation "public.inventory" does not exist') || error.code === '42P01') {
        return {
          success: true,
          message: 'Connected to Supabase project! Please execute the SQL schema in your Supabase SQL Editor to create tables.',
        };
      }
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Successfully connected and verified Supabase tables!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Connection test failed' };
  }
}

// ----------------------------------------------------
// FULL SUPABASE CRUD OPERATIONS
// ----------------------------------------------------

// 1. Fetch All Data (Inventory, Customers, Bills, Users)
export async function fetchAllSupabaseData(config: SupabaseConfig): Promise<{
  success: boolean;
  inventory?: InventoryItem[];
  customers?: Customer[];
  bills?: Bill[];
  adminUsers?: AdminUser[];
  error?: string;
}> {
  const client = getSupabaseClient(config);
  if (!client || !config.isEnabled) {
    return { success: false, error: 'Supabase is not configured or disabled' };
  }

  try {
    // A. Fetch Inventory
    const { data: invData, error: invErr } = await client
      .from('inventory')
      .select('*')
      .order('created_at', { ascending: false });
    if (invErr && invErr.code !== '42P01') {
      console.warn('Supabase fetch inventory warning:', invErr.message);
    }

    // B. Fetch Customers
    const { data: custData, error: custErr } = await client
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    if (custErr && custErr.code !== '42P01') {
      console.warn('Supabase fetch customers warning:', custErr.message);
    }

    // C. Fetch Bills and Bill Items
    const { data: billsData, error: billsErr } = await client
      .from('bills')
      .select('*')
      .order('created_at', { ascending: false });
    if (billsErr && billsErr.code !== '42P01') {
      console.warn('Supabase fetch bills warning:', billsErr.message);
    }

    let itemsByBill: Record<string, BillItem[]> = {};
    if (billsData && billsData.length > 0) {
      const { data: itemsData } = await client.from('bill_items').select('*');
      if (itemsData) {
        itemsData.forEach((item: any) => {
          if (!itemsByBill[item.bill_id]) {
            itemsByBill[item.bill_id] = [];
          }
          itemsByBill[item.bill_id].push({
            id: item.id,
            item_id: item.item_id || item.id,
            item_code: item.item_code,
            item_name: item.item_name,
            box_number: item.box_number,
            quantity: Number(item.quantity) || 1,
            unit_price: Number(item.unit_price) || 0,
            line_total: Number(item.line_total) || 0,
          });
        });
      }
    }

    const assembledBills: Bill[] = (billsData || []).map((b: any) => ({
      id: b.id,
      bill_number: b.bill_number,
      customer_id: b.customer_id,
      customer_name: b.customer_name,
      customer_phone: b.customer_phone,
      phone_model: b.phone_model,
      issue_notes: b.issue_notes,
      items: itemsByBill[b.id] || [],
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

    // D. Fetch Admin Users
    const { data: usersData } = await client.from('admin_users').select('*');

    return {
      success: true,
      inventory: (invData || []).map((i: any) => ({
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
      })),
      customers: (custData || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        phone_model: c.phone_model,
        notes: c.notes,
        total_spent: Number(c.total_spent) || 0,
        bills_count: Number(c.bills_count) || 0,
        last_visit: c.last_visit || new Date().toISOString(),
        created_at: c.created_at || new Date().toISOString(),
      })),
      bills: assembledBills,
      adminUsers: usersData || undefined,
    };
  } catch (err: any) {
    console.error('fetchAllSupabaseData error:', err);
    return { success: false, error: err.message || 'Failed to load from Supabase' };
  }
}

// 2. Inventory Operations
export async function syncInventoryItemToSupabase(
  item: InventoryItem,
  config: SupabaseConfig
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(config);
  if (!client || !config.isEnabled) return { success: true };

  try {
    const payload = {
      id: item.id,
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

    const { error } = await client.from('inventory').upsert(payload, { onConflict: 'id' });
    if (error) {
      // If error was conflict on item_code, try item_code conflict
      const { error: err2 } = await client.from('inventory').upsert(payload, { onConflict: 'item_code' });
      if (err2) return { success: false, error: err2.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteInventoryItemFromSupabase(
  itemId: string,
  config: SupabaseConfig
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(config);
  if (!client || !config.isEnabled) return { success: true };

  try {
    const { error } = await client.from('inventory').delete().eq('id', itemId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateInventoryStockInSupabase(
  itemId: string,
  newPrice: number,
  newQty: number,
  config: SupabaseConfig
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(config);
  if (!client || !config.isEnabled) return { success: true };

  try {
    const { error } = await client
      .from('inventory')
      .update({
        selling_price: newPrice,
        quantity: newQty,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// 3. Customer Operations
export async function syncCustomerToSupabase(
  customer: Customer,
  config: SupabaseConfig
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(config);
  if (!client || !config.isEnabled) return { success: true };

  try {
    const payload = {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      phone_model: customer.phone_model,
      notes: customer.notes,
      total_spent: customer.total_spent,
      bills_count: customer.bills_count,
      last_visit: customer.last_visit,
    };
    const { error } = await client.from('customers').upsert(payload, { onConflict: 'id' });
    if (error) {
      const { error: err2 } = await client.from('customers').upsert(payload, { onConflict: 'phone' });
      if (err2) return { success: false, error: err2.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteCustomerFromSupabase(
  customerId: string,
  config: SupabaseConfig
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(config);
  if (!client || !config.isEnabled) return { success: true };

  try {
    const { error } = await client.from('customers').delete().eq('id', customerId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// 4. Bill & Bill Items Operations
export async function syncBillToSupabase(
  bill: Bill,
  updatedInventory: InventoryItem[],
  updatedCustomers: Customer[],
  config: SupabaseConfig
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(config);
  if (!client || !config.isEnabled) return { success: true };

  try {
    // 1. Insert bill
    const billPayload = {
      id: bill.id,
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

    const { error: billErr } = await client.from('bills').upsert(billPayload, { onConflict: 'id' });
    if (billErr) {
      console.error('Failed to insert bill into Supabase:', billErr);
      return { success: false, error: billErr.message };
    }

    // 2. Insert bill items
    if (bill.items && bill.items.length > 0) {
      const itemsPayload = bill.items.map((item) => ({
        id: item.id || `bi-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        bill_id: bill.id,
        item_id: item.item_id || null,
        item_code: item.item_code,
        item_name: item.item_name,
        box_number: item.box_number,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.line_total,
      }));

      const { error: itemsErr } = await client.from('bill_items').upsert(itemsPayload, { onConflict: 'id' });
      if (itemsErr) {
        console.warn('Warning inserting bill items:', itemsErr.message);
      }
    }

    // 3. Update inventory stock in Supabase for each sold item
    for (const sold of bill.items) {
      const current = updatedInventory.find((i) => i.id === sold.item_id || i.item_code === sold.item_code);
      if (current) {
        await client
          .from('inventory')
          .update({ quantity: current.quantity, updated_at: new Date().toISOString() })
          .or(`id.eq.${current.id},item_code.eq.${current.item_code}`);
      }
    }

    // 4. Update customer stats in Supabase if applicable
    if (bill.customer_phone && bill.customer_phone !== 'N/A') {
      const cust = updatedCustomers.find((c) => c.phone === bill.customer_phone || c.id === bill.customer_id);
      if (cust) {
        await client.from('customers').upsert(
          {
            id: cust.id,
            name: cust.name,
            phone: cust.phone,
            phone_model: cust.phone_model,
            notes: cust.notes,
            total_spent: cust.total_spent,
            bills_count: cust.bills_count,
            last_visit: cust.last_visit,
          },
          { onConflict: 'id' }
        );
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('syncBillToSupabase exception:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteBillFromSupabase(
  billId: string,
  config: SupabaseConfig
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(config);
  if (!client || !config.isEnabled) return { success: true };

  try {
    // Delete bill items first (in case cascade is not setup)
    await client.from('bill_items').delete().eq('bill_id', billId);
    const { error } = await client.from('bills').delete().eq('id', billId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// 5. Admin Users Operations
export async function syncAdminUserToSupabase(
  user: AdminUser,
  config: SupabaseConfig
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(config);
  if (!client || !config.isEnabled) return { success: true };

  try {
    const { error } = await client.from('admin_users').upsert(user, { onConflict: 'id' });
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteAdminUserFromSupabase(
  userId: string,
  config: SupabaseConfig
): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient(config);
  if (!client || !config.isEnabled) return { success: true };

  try {
    const { error } = await client.from('admin_users').delete().eq('id', userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export const SUPABASE_SCHEMA_SQL = `-- =======================================================
-- NMW POS SYSTEM Complete Database Schema
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor)
-- =======================================================

-- 1. Create admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'staff',
    created_at TIMESTAMPTZ DEFAULT now(),
    last_login TIMESTAMPTZ DEFAULT now()
);

-- 2. Create inventory table with Box Number tracking
CREATE TABLE IF NOT EXISTS public.inventory (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    item_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    box_number TEXT NOT NULL DEFAULT 'BOX-01',
    category TEXT NOT NULL DEFAULT 'General',
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_threshold INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    phone_model TEXT,
    notes TEXT,
    total_spent NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    bills_count INTEGER NOT NULL DEFAULT 0,
    last_visit TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create bills table
CREATE TABLE IF NOT EXISTS public.bills (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    bill_number TEXT NOT NULL UNIQUE,
    customer_id TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    phone_model TEXT,
    issue_notes TEXT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount_type TEXT NOT NULL DEFAULT 'fixed',
    net_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    status TEXT NOT NULL DEFAULT 'Completed',
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by TEXT NOT NULL DEFAULT 'NMWadmin'
);

-- 5. Create bill_items table
CREATE TABLE IF NOT EXISTS public.bill_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    bill_id TEXT NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
    item_id TEXT,
    item_code TEXT NOT NULL,
    item_name TEXT NOT NULL,
    box_number TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    line_total NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- Fast Searching Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_code ON public.inventory(item_code);
CREATE INDEX IF NOT EXISTS idx_inventory_box ON public.inventory(box_number);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_bills_number ON public.bills(bill_number);
CREATE INDEX IF NOT EXISTS idx_bills_date ON public.bills(created_at);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON public.bill_items(bill_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;

-- Production RLS Policies (Allow authenticated / anon access for POS operations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory' AND policyname = 'Allow full access to inventory') THEN
    CREATE POLICY "Allow full access to inventory" ON public.inventory FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow full access to customers') THEN
    CREATE POLICY "Allow full access to customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bills' AND policyname = 'Allow full access to bills') THEN
    CREATE POLICY "Allow full access to bills" ON public.bills FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bill_items' AND policyname = 'Allow full access to bill_items') THEN
    CREATE POLICY "Allow full access to bill_items" ON public.bill_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'admin_users' AND policyname = 'Allow full access to admin_users') THEN
    CREATE POLICY "Allow full access to admin_users" ON public.admin_users FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;
`;

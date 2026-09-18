import React, { useState, useEffect, useCallback } from 'react';
import { Header, NavTab } from './components/Header';
import { LoginModal } from './components/LoginModal';
import { BillingView } from './components/BillingView';
import { InventoryView } from './components/InventoryView';
import { CustomersView } from './components/CustomersView';
import { BillHistoryView } from './components/BillHistoryView';
import { SettingsView } from './components/SettingsView';
import { PrintReceiptModal } from './components/PrintReceiptModal';
import { 
  InventoryItem, 
  Customer, 
  Bill, 
  ShopSettings, 
  SupabaseConfig, 
  AdminUser 
} from './types';
import { 
  getStoredInventory, 
  saveStoredInventory, 
  getStoredCustomers, 
  saveStoredCustomers, 
  getStoredBills, 
  saveStoredBills, 
  getStoredSettings, 
  saveStoredSettings, 
  getStoredSupabaseConfig, 
  saveStoredSupabaseConfig, 
  getStoredAuthUser, 
  saveStoredAuthUser,
  syncWithSupabase,
  generateUUID
} from './services/storage';
import {
  fetchAllSupabaseData,
  syncInventoryItemToSupabase,
  deleteInventoryItemFromSupabase,
  updateInventoryStockInSupabase,
  syncCustomerToSupabase,
  deleteCustomerFromSupabase,
  syncBillToSupabase,
  deleteBillFromSupabase
} from './services/supabase';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => getStoredAuthUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => !getStoredAuthUser());

  // Navigation Tab State
  const [currentTab, setCurrentTab] = useState<NavTab>('bill');

  // Core Data Collections
  const [inventory, setInventory] = useState<InventoryItem[]>(() => getStoredInventory());
  const [customers, setCustomers] = useState<Customer[]>(() => getStoredCustomers());
  const [bills, setBills] = useState<Bill[]>(() => getStoredBills());
  const [settings, setSettings] = useState<ShopSettings>(() => getStoredSettings());
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => getStoredSupabaseConfig());

  // Cloud Sync & Loading Status
  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(false);
  const [cloudSyncBanner, setCloudSyncBanner] = useState<string | null>(null);

  // Active Print Receipt State
  const [activeReceiptBill, setActiveReceiptBill] = useState<Bill | null>(null);

  // Fetch or sync data with Supabase on mount and when login occurs
  const syncDataFromCloud = useCallback(async (cfg: SupabaseConfig) => {
    if (!cfg.isEnabled || !cfg.url || !cfg.anonKey) return;

    setIsLoadingCloud(true);
    try {
      const result = await fetchAllSupabaseData(cfg);
      if (result.success) {
        if (result.inventory && result.inventory.length > 0) {
          setInventory(result.inventory);
          saveStoredInventory(result.inventory);
        }
        if (result.customers && result.customers.length > 0) {
          setCustomers(result.customers);
          saveStoredCustomers(result.customers);
        }
        if (result.bills && result.bills.length > 0) {
          setBills(result.bills);
          saveStoredBills(result.bills);
        }

        // If remote database was empty, push local data to seed Supabase
        if (
          (!result.inventory || result.inventory.length === 0) &&
          (!result.customers || result.customers.length === 0)
        ) {
          await syncWithSupabase(cfg);
        }

        setCloudSyncBanner('Connected to Supabase. Online data active.');
        setTimeout(() => setCloudSyncBanner(null), 4000);
      }
    } catch (err) {
      console.warn('Supabase initial fetch warning:', err);
    } finally {
      setIsLoadingCloud(false);
    }
  }, []);

  useEffect(() => {
    if (supabaseConfig.isEnabled && currentUser) {
      syncDataFromCloud(supabaseConfig);
    }
  }, [supabaseConfig.isEnabled, currentUser, syncDataFromCloud]);

  // Handle Login Success
  const handleLoginSuccess = (user: AdminUser) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
  };

  // Handle Logout
  const handleLogout = () => {
    saveStoredAuthUser(null);
    setCurrentUser(null);
    setIsAuthModalOpen(true);
  };

  // Save Bill handler (reduces stock, updates customer stats, saves bill)
  const handleSaveBill = async (newBill: Bill, updatedInventory: InventoryItem[], updatedCustomers: Customer[]) => {
    // 1. Immediate UI update
    const updatedBills = [newBill, ...bills];
    setBills(updatedBills);
    saveStoredBills(updatedBills);

    setInventory(updatedInventory);
    saveStoredInventory(updatedInventory);

    setCustomers(updatedCustomers);
    saveStoredCustomers(updatedCustomers);

    // 2. Direct online persistence to Supabase
    if (supabaseConfig.isEnabled) {
      const res = await syncBillToSupabase(newBill, updatedInventory, updatedCustomers, supabaseConfig);
      if (!res.success) {
        console.warn('Supabase bill sync notice:', res.error);
      }
    }
  };

  // Trigger Print Modal
  const handleTriggerPrint = (bill: Bill) => {
    setActiveReceiptBill(bill);
  };

  // Inventory Item Save (Add or Edit)
  const handleSaveInventoryItem = async (item: InventoryItem) => {
    const existingIndex = inventory.findIndex((i) => i.id === item.id);
    let updated: InventoryItem[];
    if (existingIndex >= 0) {
      updated = [...inventory];
      updated[existingIndex] = item;
    } else {
      updated = [item, ...inventory];
    }
    setInventory(updated);
    saveStoredInventory(updated);

    // Online direct sync
    if (supabaseConfig.isEnabled) {
      await syncInventoryItemToSupabase(item, supabaseConfig);
    }
  };

  // Inventory Item Delete
  const handleDeleteInventoryItem = async (itemId: string) => {
    const updated = inventory.filter((i) => i.id !== itemId);
    setInventory(updated);
    saveStoredInventory(updated);

    if (supabaseConfig.isEnabled) {
      await deleteInventoryItemFromSupabase(itemId, supabaseConfig);
    }
  };

  // Quick In-line Update for Price and Quantity
  const handleQuickUpdateInventory = async (itemId: string, newPrice: number, newQty: number) => {
    const updated = inventory.map((i) => {
      if (i.id === itemId) {
        return {
          ...i,
          selling_price: newPrice,
          quantity: newQty,
          updated_at: new Date().toISOString(),
        };
      }
      return i;
    });
    setInventory(updated);
    saveStoredInventory(updated);

    if (supabaseConfig.isEnabled) {
      await updateInventoryStockInSupabase(itemId, newPrice, newQty, supabaseConfig);
    }
  };

  // Customer Save (Add or Edit)
  const handleSaveCustomer = async (customer: Customer) => {
    const existingIndex = customers.findIndex((c) => c.id === customer.id);
    let updated: Customer[];
    if (existingIndex >= 0) {
      updated = [...customers];
      updated[existingIndex] = customer;
    } else {
      updated = [customer, ...customers];
    }
    setCustomers(updated);
    saveStoredCustomers(updated);

    if (supabaseConfig.isEnabled) {
      await syncCustomerToSupabase(customer, supabaseConfig);
    }
  };

  // Customer Delete
  const handleDeleteCustomer = async (customerId: string) => {
    const updated = customers.filter((c) => c.id !== customerId);
    setCustomers(updated);
    saveStoredCustomers(updated);

    if (supabaseConfig.isEnabled) {
      await deleteCustomerFromSupabase(customerId, supabaseConfig);
    }
  };

  // Start Bill For Customer action
  const handleStartBillForCustomer = (_customer: Customer) => {
    setCurrentTab('bill');
  };

  // Bill Delete
  const handleDeleteBill = async (billId: string) => {
    const updated = bills.filter((b) => b.id !== billId);
    setBills(updated);
    saveStoredBills(updated);

    if (supabaseConfig.isEnabled) {
      await deleteBillFromSupabase(billId, supabaseConfig);
    }
  };

  // Settings update
  const handleUpdateSettings = (newSettings: ShopSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
  };

  // Supabase Config update
  const handleUpdateSupabaseConfig = (newConfig: SupabaseConfig) => {
    setSupabaseConfig(newConfig);
    saveStoredSupabaseConfig(newConfig);
    if (newConfig.isEnabled) {
      syncDataFromCloud(newConfig);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-[#dfe2ee] font-sans antialiased flex flex-col">
      {/* Top Application Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        supabaseConfig={supabaseConfig}
        settings={settings}
      />

      {/* Main Viewport Router */}
      <main className="flex-1 pb-12">
        {currentTab === 'bill' && (
          <BillingView
            inventory={inventory}
            customers={customers}
            bills={bills}
            settings={settings}
            currentUser={currentUser}
            onSaveBill={handleSaveBill}
            onTriggerPrint={handleTriggerPrint}
          />
        )}

        {currentTab === 'inventory' && (
          <InventoryView
            inventory={inventory}
            settings={settings}
            onSaveItem={handleSaveInventoryItem}
            onDeleteItem={handleDeleteInventoryItem}
            onQuickUpdate={handleQuickUpdateInventory}
          />
        )}

        {currentTab === 'customers' && (
          <CustomersView
            customers={customers}
            bills={bills}
            settings={settings}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onStartBillForCustomer={handleStartBillForCustomer}
            onViewBillReceipt={handleTriggerPrint}
          />
        )}

        {currentTab === 'history' && (
          <BillHistoryView
            bills={bills}
            settings={settings}
            onOpenReceipt={handleTriggerPrint}
            onDeleteBill={handleDeleteBill}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            settings={settings}
            supabaseConfig={supabaseConfig}
            currentUser={currentUser}
            onUpdateSettings={handleUpdateSettings}
            onUpdateSupabaseConfig={handleUpdateSupabaseConfig}
          />
        )}
      </main>

      {/* Printable Receipt Modal */}
      {activeReceiptBill && (
        <PrintReceiptModal
          bill={activeReceiptBill}
          settings={settings}
          onClose={() => setActiveReceiptBill(null)}
        />
      )}

      {/* Security Login Modal */}
      <LoginModal
        isOpen={isAuthModalOpen}
        onLoginSuccess={handleLoginSuccess}
        supabaseConfig={supabaseConfig}
      />
    </div>
  );
}

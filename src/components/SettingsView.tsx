import React, { useState } from 'react';
import { 
  Settings, 
  Store, 
  Shield, 
  Database, 
  Key, 
  Copy, 
  Check, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  UserPlus, 
  FileCode,
  Lock,
  ExternalLink,
  Trash2,
  UserCheck,
  KeyRound
} from 'lucide-react';
import { ShopSettings, SupabaseConfig, AdminUser } from '../types';
import { testSupabaseConnection, SUPABASE_SCHEMA_SQL, resetSupabaseClient, getSupabaseClient } from '../services/supabase';
import { syncWithSupabase, getAdminUsers, saveAdminUsers, generateUUID } from '../services/storage';

interface SettingsViewProps {
  settings: ShopSettings;
  supabaseConfig: SupabaseConfig;
  currentUser: AdminUser | null;
  onUpdateSettings: (newSettings: ShopSettings) => void;
  onUpdateSupabaseConfig: (newConfig: SupabaseConfig) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  supabaseConfig,
  currentUser,
  onUpdateSettings,
  onUpdateSupabaseConfig,
}) => {
  // Active Tab inside Settings
  const [activeSubTab, setActiveSubTab] = useState<'shop' | 'admin' | 'supabase'>('shop');

  // Shop Settings Form State
  const [shopName, setShopName] = useState(settings.shop_name);
  const [tagline, setTagline] = useState(settings.tagline);
  const [phone, setPhone] = useState(settings.phone);
  const [altPhone, setAltPhone] = useState(settings.alt_phone);
  const [address, setAddress] = useState(settings.address);
  const [city, setCity] = useState(settings.city);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currency_symbol);
  const [receiptFooter, setReceiptFooter] = useState(settings.receipt_footer);
  const [warrantyTerms, setWarrantyTerms] = useState(settings.warranty_terms);

  // Supabase Configuration Form State
  const [supabaseUrl, setSupabaseUrl] = useState(supabaseConfig.url || '');
  const [supabaseKey, setSupabaseKey] = useState(supabaseConfig.anonKey || '');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Admin Account & Password State
  const [currentAdminPass, setCurrentAdminPass] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');
  const [confirmAdminPass, setConfirmAdminPass] = useState('');
  const [adminEmailInput, setAdminEmailInput] = useState(currentUser?.email || 'admin@nmwpos.lk');
  const [adminNotification, setAdminNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Top Global Notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // User Accounts State
  const [userList, setUserList] = useState<AdminUser[]>(() => getAdminUsers());
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'staff'>('staff');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Save Shop Settings
  const handleSaveShopSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ShopSettings = {
      ...settings,
      shop_name: shopName.trim() || 'NMW POS SYSTEM',
      tagline: tagline.trim(),
      phone: phone.trim(),
      alt_phone: altPhone.trim(),
      address: address.trim(),
      city: city.trim(),
      currency_symbol: currencySymbol.trim() || 'Rs.',
      receipt_footer: receiptFooter.trim(),
      warranty_terms: warrantyTerms.trim(),
    };
    onUpdateSettings(updated);
    setNotification({ message: 'Shop details and billing preferences updated successfully!', type: 'success' });
  };

  // Test Supabase Connection
  const handleTestSupabase = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      setConnectionResult({
        success: false,
        message: 'Please provide both Supabase Project URL and Anon/Publishable API Key.',
      });
      return;
    }

    setIsTestingConnection(true);
    setConnectionResult(null);

    const result = await testSupabaseConnection(supabaseUrl.trim(), supabaseKey.trim());
    setIsTestingConnection(false);
    setConnectionResult(result);
  };

  // Save Supabase Configuration
  const handleSaveSupabaseConfig = () => {
    resetSupabaseClient();
    const newConfig: SupabaseConfig = {
      url: supabaseUrl.trim(),
      anonKey: supabaseKey.trim(),
      isEnabled: Boolean(supabaseUrl.trim() && supabaseKey.trim()),
      lastSyncedAt: supabaseConfig.lastSyncedAt,
    };
    onUpdateSupabaseConfig(newConfig);
    setNotification({
      message: newConfig.isEnabled
        ? 'Supabase database credentials saved and linked!'
        : 'Supabase credentials cleared. Using local persistence mode.',
      type: 'success',
    });
  };

  // Perform Manual Cloud Sync
  const handleManualSync = async () => {
    if (!supabaseConfig.isEnabled) {
      setNotification({ message: 'Please configure and save Supabase credentials first.', type: 'error' });
      return;
    }
    setIsSyncing(true);
    const res = await syncWithSupabase(supabaseConfig);
    setIsSyncing(false);
    setNotification({
      message: res.message,
      type: res.success ? 'success' : 'error',
    });
  };

  // Copy Supabase SQL Schema
  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  // Update Admin Password / Email
  const handleUpdateAdminAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminNotification(null);

    const storedCustomPass = localStorage.getItem('nmw_custom_admin_pass') || 'NMW@2409';
    if (currentAdminPass !== 'NMW@2409' && currentAdminPass !== storedCustomPass) {
      setAdminNotification({ message: 'Current password does not match.', type: 'error' });
      return;
    }

    if (!newAdminPass) {
      setAdminNotification({ message: 'Please enter a new password.', type: 'error' });
      return;
    }

    if (newAdminPass !== confirmAdminPass) {
      setAdminNotification({ message: 'New password and confirmation do not match.', type: 'error' });
      return;
    }

    if (newAdminPass.length < 6) {
      setAdminNotification({ message: 'Password must be at least 6 characters.', type: 'error' });
      return;
    }

    localStorage.setItem('nmw_custom_admin_pass', newAdminPass);

    // Update email in admin list
    const users = getAdminUsers();
    const updatedUsers = users.map((u) =>
      u.username === (currentUser?.username || 'NMWadmin') ? { ...u, email: adminEmailInput } : u
    );
    saveAdminUsers(updatedUsers);

    setCurrentAdminPass('');
    setNewAdminPass('');
    setConfirmAdminPass('');
    setAdminNotification({
      message: 'Admin security password & recovery settings updated successfully!',
      type: 'success',
    });
  };

  // Add New System User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserUsername.trim() || !newUserPassword.trim()) {
      setAdminNotification({ message: 'Username and password are required.', type: 'error' });
      return;
    }
    const cleanUser = newUserUsername.trim();
    if (userList.some((u) => u.username.toLowerCase() === cleanUser.toLowerCase())) {
      setAdminNotification({ message: 'A user with this username already exists.', type: 'error' });
      return;
    }
    const newUser: AdminUser = {
      id: generateUUID(),
      username: cleanUser,
      email: newUserEmail.trim() || `${cleanUser.toLowerCase()}@nmwpos.lk`,
      role: newUserRole,
      created_at: new Date().toISOString(),
    };
    const updated = [...userList, newUser];
    setUserList(updated);
    saveAdminUsers(updated);
    localStorage.setItem(`nmw_user_pass_${newUser.username}`, newUserPassword.trim());

    if (supabaseConfig.isEnabled) {
      const client = getSupabaseClient(supabaseConfig);
      if (client) {
        await client.from('admin_users').upsert({
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
        });
      }
    }

    setNewUserUsername('');
    setNewUserEmail('');
    setNewUserPassword('');
    setIsAddingUser(false);
    setAdminNotification({ message: `User account "${newUser.username}" created successfully!`, type: 'success' });
  };

  // Delete System User
  const handleDeleteUser = async (userId: string, username: string) => {
    if (username === 'NMWadmin') {
      setAdminNotification({ message: 'Master admin account (NMWadmin) cannot be deleted.', type: 'error' });
      return;
    }
    const updated = userList.filter((u) => u.id !== userId);
    setUserList(updated);
    saveAdminUsers(updated);
    localStorage.removeItem(`nmw_user_pass_${username}`);

    if (supabaseConfig.isEnabled) {
      const client = getSupabaseClient(supabaseConfig);
      if (client) {
        await client.from('admin_users').delete().eq('id', userId);
      }
    }
    setAdminNotification({ message: `User account "${username}" has been removed.`, type: 'success' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg flex items-center justify-between text-xs transition shadow-lg ${
            notification.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/15 border border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            )}
            <span className="font-medium">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs hover:underline opacity-80">
            Dismiss
          </button>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveSubTab('shop')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeSubTab === 'shop'
              ? 'bg-cyan-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Shop & Receipt Details</span>
        </button>

        <button
          onClick={() => setActiveSubTab('supabase')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeSubTab === 'supabase'
              ? 'bg-cyan-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Supabase Cloud Integration</span>
        </button>

        <button
          onClick={() => setActiveSubTab('admin')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
            activeSubTab === 'admin'
              ? 'bg-cyan-500 text-slate-950 shadow'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Admin & Security Accounts</span>
        </button>
      </div>

      {/* 1. SHOP & RECEIPT SETTINGS */}
      {activeSubTab === 'shop' && (
        <form onSubmit={handleSaveShopSettings} className="bg-[#111827] p-6 rounded-xl border border-white/5 shadow-lg space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h3 className="text-base font-bold text-white">Shop Profile & Bill Settings</h3>
              <p className="text-xs text-slate-400">Printed on all customer invoices and receipts</p>
            </div>
            <button
              id="btn-save-shop-settings"
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                Shop / Company Name *
              </label>
              <input
                type="text"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                Shop Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                Primary Contact Phone *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                Alternative Phone / Hotline
              </label>
              <input
                type="text"
                value={altPhone}
                onChange={(e) => setAltPhone(e.target.value)}
                className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                Shop Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                City / Region
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                Currency Symbol (Sri Lankan Rupees) *
              </label>
              <input
                type="text"
                required
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                placeholder="Rs."
                className="w-full px-3 py-2 bg-[#0b0f17] border border-cyan-500/30 rounded-lg text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                Bill Footer Note
              </label>
              <textarea
                rows={2}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                Warranty & Terms Disclaimer
              </label>
              <textarea
                rows={2}
                value={warrantyTerms}
                onChange={(e) => setWarrantyTerms(e.target.value)}
                className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
          </div>
        </form>
      )}

      {/* 2. SUPABASE CLOUD INTEGRATION */}
      {activeSubTab === 'supabase' && (
        <div className="bg-[#111827] p-6 rounded-xl border border-white/5 shadow-lg space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Supabase Cloud Database Synchronization</h3>
                <p className="text-xs text-slate-400">
                  Connect your PostgreSQL Supabase instance for real-time cloud persistence across multiple terminals.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition border border-white/10"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
                <span>Sync Now</span>
              </button>
              <button
                id="btn-save-supabase"
                onClick={handleSaveSupabaseConfig}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Save Credentials</span>
              </button>
            </div>
          </div>

          {/* Connection Test Result */}
          {connectionResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                connectionResult.success
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/15 border border-red-500/30 text-red-300'
              }`}
            >
              {connectionResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              )}
              <span>{connectionResult.message}</span>
            </div>
          )}

          {/* Supabase URL & Key Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                Supabase Project URL
              </label>
              <input
                type="text"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xyzprojectid.supabase.co"
                className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Found in your Supabase Project Settings → API</p>
            </div>

            <div>
              <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                Supabase Anon / Publishable API Key
              </label>
              <input
                type="password"
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
              <div className="flex items-center justify-between mt-1">
                <span className="text-[11px] text-slate-500">Public anon key with RLS enforcement</span>
                <button
                  type="button"
                  onClick={handleTestSupabase}
                  disabled={isTestingConnection}
                  className="text-[11px] text-cyan-400 hover:underline font-semibold flex items-center gap-1"
                >
                  {isTestingConnection ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </div>
          </div>

          {/* Supabase SQL DDL Schema Generator */}
          <div className="pt-4 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span>Supabase Relational Database Schema (SQL)</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Tables: <code className="text-cyan-400">admin_users</code>, <code className="text-cyan-400">inventory</code>, <code className="text-cyan-400">customers</code>, <code className="text-cyan-400">bills</code>, <code className="text-cyan-400">bill_items</code> with Foreign Keys and RLS Policies.
                </p>
              </div>
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1 px-3 py-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-mono font-medium transition border border-cyan-500/30"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
              </button>
            </div>

            {/* SQL Code Preview Block */}
            <div className="p-3 bg-[#0b0f17] border border-white/10 rounded-lg text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto whitespace-pre">
              {SUPABASE_SCHEMA_SQL}
            </div>

            <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-300/90 leading-relaxed">
              <span className="font-bold text-white">How to apply:</span> Open your Supabase Dashboard, click on <span className="underline">SQL Editor</span> in the left navigation menu, paste the copied SQL script, and click <span className="font-semibold text-white">Run</span>. Your tables, indexes, and RLS policies will be automatically provisioned!
            </div>
          </div>
        </div>
      )}

      {/* 3. ADMIN & SECURITY ACCOUNTS */}
      {activeSubTab === 'admin' && (
        <div className="bg-[#111827] p-6 rounded-xl border border-white/5 shadow-lg space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Admin Security & Password Control</h3>
                <p className="text-xs text-slate-400">
                  Manage master terminal credentials and password recovery channels
                </p>
              </div>
            </div>
          </div>

          {adminNotification && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                adminNotification.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/15 border border-red-500/30 text-red-300'
              }`}
            >
              {adminNotification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{adminNotification.message}</span>
            </div>
          )}

          <form onSubmit={handleUpdateAdminAccount} className="max-w-md space-y-4">
            <div>
              <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                Admin Username (Fixed)
              </label>
              <input
                type="text"
                disabled
                value={currentUser?.username || 'NMWadmin'}
                className="w-full px-3 py-2 bg-[#0b0f17] border border-white/5 rounded-lg text-xs text-slate-400 font-mono cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                Designated Admin Email (Confidential for Recovery)
              </label>
              <input
                type="email"
                required
                value={adminEmailInput}
                onChange={(e) => setAdminEmailInput(e.target.value)}
                placeholder="admin@nmwpos.lk"
                className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Used to receive forgot password reset links without being exposed on the login screen.
              </p>
            </div>

            <div className="pt-2 border-t border-white/5 space-y-3">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  value={currentAdminPass}
                  onChange={(e) => setCurrentAdminPass(e.target.value)}
                  placeholder="Enter current password (default: NMW@2409)"
                  className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  value={newAdminPass}
                  onChange={(e) => setNewAdminPass(e.target.value)}
                  placeholder="Enter new secure password"
                  className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmAdminPass}
                  onChange={(e) => setConfirmAdminPass(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold rounded-lg text-xs transition shadow-md shadow-cyan-500/20 active:scale-95"
              >
                Update Security Credentials
              </button>
            </div>
          </form>

          {/* System User Accounts Management Section */}
          <div className="pt-6 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  <span>Authorized System User Accounts</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Manage staff and admin accounts for multiple terminal operators.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingUser(!isAddingUser)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold border border-cyan-500/30 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isAddingUser ? 'Cancel' : 'Add New User'}</span>
              </button>
            </div>

            {/* Add New User Form */}
            {isAddingUser && (
              <form onSubmit={handleAddUser} className="p-4 rounded-xl bg-[#0b0f17] border border-cyan-500/30 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={newUserUsername}
                      onChange={(e) => setNewUserUsername(e.target.value)}
                      placeholder="e.g. staff_kasun"
                      className="w-full px-3 py-2 bg-[#111827] border border-white/10 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="kasun@nmwpos.lk"
                      className="w-full px-3 py-2 bg-[#111827] border border-white/10 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                      Initial Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-[#111827] border border-white/10 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                      System Role
                    </label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'staff')}
                      className="w-full px-3 py-2 bg-[#111827] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="staff">Staff Operator</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            )}

            {/* User List Table */}
            <div className="overflow-x-auto rounded-xl border border-white/5 bg-[#0b0f17]">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-white/5 text-[10px] uppercase font-mono text-slate-400">
                  <tr>
                    <th className="px-4 py-2.5">User</th>
                    <th className="px-4 py-2.5">Email</th>
                    <th className="px-4 py-2.5">Role</th>
                    <th className="px-4 py-2.5">Created</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {userList.map((usr) => (
                    <tr key={usr.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-4 py-3 font-semibold text-white flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-[10px] text-cyan-400 font-bold">
                          {usr.username.charAt(0).toUpperCase()}
                        </div>
                        <span>{usr.username}</span>
                        {usr.username === 'NMWadmin' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                            Master
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                        {usr.email || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            usr.role === 'admin'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {usr.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        {new Date(usr.created_at).toLocaleDateString('en-LK')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {usr.username !== 'NMWadmin' ? (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(usr.id, usr.username)}
                            className="p-1.5 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                            title="Delete Account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-600 italic">Protected</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

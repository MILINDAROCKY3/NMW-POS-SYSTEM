import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  Package, 
  Users, 
  History, 
  Settings, 
  LogOut, 
  Database, 
  CloudCheck, 
  HardDrive,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { AdminUser, SupabaseConfig, ShopSettings } from '../types';

export type NavTab = 'bill' | 'inventory' | 'customers' | 'history' | 'settings';

interface HeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: AdminUser | null;
  onLogout: () => void;
  supabaseConfig: SupabaseConfig;
  settings: ShopSettings;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  onLogout,
  supabaseConfig,
  settings,
}) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setDateStr(
        now.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'bill' as NavTab, label: 'Bill (Register)', icon: Receipt, badge: null },
    { id: 'inventory' as NavTab, label: 'Inventory', icon: Package, badge: null },
    { id: 'customers' as NavTab, label: 'Customers', icon: Users, badge: null },
    { id: 'history' as NavTab, label: 'Bill History', icon: History, badge: null },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings, badge: null },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0f17]/95 backdrop-blur-md border-b border-white/10 select-none no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand & System Title */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center text-slate-950 font-black text-xl tracking-tighter shadow-lg shadow-cyan-500/20 border border-cyan-300/40">
              NMW
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base tracking-wide">
                  {settings.shop_name}
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  POS v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Mobile Repair & Electronics Inventory
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-[#111827] p-1 rounded-lg border border-white/5 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Section: Time, Database Status, User, Logout */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Clock */}
            <div className="hidden xl:flex flex-col text-right font-mono">
              <span className="text-xs font-semibold text-slate-200">{timeStr}</span>
              <span className="text-[10px] text-slate-500">{dateStr}</span>
            </div>

            {/* Supabase Status Pill */}
            <div 
              onClick={() => onSelectTab('settings')}
              title={supabaseConfig.isEnabled ? 'Supabase Connected' : 'Local Storage Mode (Click to configure Supabase)'}
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono cursor-pointer border transition ${
                supabaseConfig.isEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${supabaseConfig.isEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <Database className="w-3 h-3" />
              <span>{supabaseConfig.isEnabled ? 'Supabase Sync' : 'Local Mode'}</span>
            </div>

            {/* Current User Chip */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono text-xs font-bold">
                  {currentUser.username.substring(0, 2).toUpperCase()}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-medium text-slate-200 leading-tight">
                    {currentUser.username}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                    {currentUser.role}
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  id="btn-logout"
                  onClick={onLogout}
                  title="Log Out of System"
                  className="p-1.5 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

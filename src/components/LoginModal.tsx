import React, { useState } from 'react';
import { Shield, Lock, User, AlertCircle, Eye, EyeOff, LogIn, KeyRound } from 'lucide-react';
import { AdminUser, SupabaseConfig } from '../types';
import { getStoredSupabaseConfig, saveStoredAuthUser } from '../services/storage';
import { getSupabaseClient } from '../services/supabase';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: AdminUser) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMsg('Please enter both username and password.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. MASTER ADMIN LOGIN CHECK
      const storedCustomPass = localStorage.getItem('nmw_custom_admin_pass') || 'NMW@2409';
      if (
        (cleanUser.toLowerCase() === 'nmwadmin' || cleanUser.toLowerCase() === 'admin') &&
        (cleanPass === 'NMW@2409' || cleanPass === storedCustomPass)
      ) {
        const adminUser: AdminUser = {
          id: 'usr-admin-1',
          username: 'NMWadmin',
          email: 'admin@nmwpos.lk',
          role: 'admin',
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        };
        saveStoredAuthUser(adminUser);
        onLoginSuccess(adminUser);
        setIsLoading(false);
        return;
      }

      // 2. CLOUD DATABASE (SUPABASE) USER AUTHENTICATION (FOR ANY COMPUTER)
      const supabaseConfig: SupabaseConfig = getStoredSupabaseConfig();
      if (supabaseConfig.isEnabled && supabaseConfig.url && supabaseConfig.anonKey) {
        const client = getSupabaseClient(supabaseConfig);
        if (client) {
          const { data: dbUser, error } = await client
            .from('admin_users')
            .select('*')
            .ilike('username', cleanUser)
            .single();

          if (!error && dbUser) {
            // Check password against Supabase Cloud saved password
            if (dbUser.password_hash === cleanPass || (!dbUser.password_hash && cleanPass === '123456')) {
              const authenticatedUser: AdminUser = {
                id: dbUser.id,
                username: dbUser.username,
                email: dbUser.email || `${dbUser.username}@nmwpos.lk`,
                role: dbUser.role || 'staff',
                created_at: dbUser.created_at || new Date().toISOString(),
                last_login: new Date().toISOString(),
              };

              // Update last_login in Supabase Cloud
              client
                .from('admin_users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', dbUser.id)
                .then(() => {});

              saveStoredAuthUser(authenticatedUser);
              onLoginSuccess(authenticatedUser);
              setIsLoading(false);
              return;
            } else {
              setErrorMsg('Invalid password entered for this user account.');
              setIsLoading(false);
              return;
            }
          }
        }
      }

      // 3. LOCAL STORAGE FALLBACK CHECK (IF OFFLINE)
      const localPass = localStorage.getItem(`nmw_user_pass_${cleanUser}`);
      if (localPass && localPass === cleanPass) {
        const localUser: AdminUser = {
          id: `usr-${cleanUser.toLowerCase()}`,
          username: cleanUser,
          email: `${cleanUser.toLowerCase()}@nmwpos.lk`,
          role: 'staff',
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
        };
        saveStoredAuthUser(localUser);
        onLoginSuccess(localUser);
        setIsLoading(false);
        return;
      }

      setErrorMsg('Invalid username or password. Please verify and try again.');
    } catch (err: any) {
      setErrorMsg('Authentication error. Please check your network or try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#111827] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-b from-white/[0.04] to-transparent border-b border-white/5 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-3 shadow-lg shadow-cyan-500/10">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">Terminal Access Authorization</h2>
          <p className="text-xs text-slate-400 mt-1">Sign in with your designated Admin or Staff credentials</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Username or Staff ID</span>
              <span className="text-[10px] text-cyan-400 font-mono lowercase">required</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. NMWadmin or kasun_staff"
                className="w-full pl-9 pr-3 py-2.5 bg-[#0b0f17] border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Access Key / Password</span>
              <span className="text-[10px] text-cyan-400 font-mono lowercase">required</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter account password"
                className="w-full pl-9 pr-10 py-2.5 bg-[#0b0f17] border border-white/10 rounded-lg text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-cyan-500/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Verifying Account...' : 'Authorize Terminal Sign In'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

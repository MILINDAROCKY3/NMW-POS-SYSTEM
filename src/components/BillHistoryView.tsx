import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Printer, 
  Eye, 
  Trash2, 
  Calendar, 
  Filter, 
  Box, 
  Smartphone, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Bill, ShopSettings } from '../types';
import { formatRupees } from '../services/storage';

interface BillHistoryViewProps {
  bills: Bill[];
  settings: ShopSettings;
  onOpenReceipt: (bill: Bill) => void;
  onDeleteBill: (billId: string) => void;
}

export const BillHistoryView: React.FC<BillHistoryViewProps> = ({
  bills,
  settings,
  onOpenReceipt,
  onDeleteBill,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [billToDelete, setBillToDelete] = useState<Bill | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filtered bills
  const filteredBills = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const now = new Date();

    return bills.filter((b) => {
      // Date filter
      const bDate = new Date(b.created_at);
      if (dateFilter === 'today') {
        const isToday =
          bDate.getDate() === now.getDate() &&
          bDate.getMonth() === now.getMonth() &&
          bDate.getFullYear() === now.getFullYear();
        if (!isToday) return false;
      } else if (dateFilter === 'week') {
        const diffTime = Math.abs(now.getTime() - bDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 7) return false;
      } else if (dateFilter === 'month') {
        const isMonth =
          bDate.getMonth() === now.getMonth() && bDate.getFullYear() === now.getFullYear();
        if (!isMonth) return false;
      }

      // Payment method filter
      if (paymentFilter !== 'all' && b.payment_method !== paymentFilter) {
        return false;
      }

      // Search term
      if (!query) return true;
      return (
        b.bill_number.toLowerCase().includes(query) ||
        b.customer_name.toLowerCase().includes(query) ||
        b.customer_phone.toLowerCase().includes(query) ||
        (b.phone_model && b.phone_model.toLowerCase().includes(query)) ||
        (b.issue_notes && b.issue_notes.toLowerCase().includes(query))
      );
    });
  }, [bills, searchTerm, dateFilter, paymentFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalCount = filteredBills.length;
    const totalRevenue = filteredBills.reduce((sum, b) => sum + b.net_total, 0);
    const totalCash = filteredBills
      .filter((b) => b.payment_method === 'Cash')
      .reduce((sum, b) => sum + b.net_total, 0);
    const totalCard = filteredBills
      .filter((b) => b.payment_method === 'Card')
      .reduce((sum, b) => sum + b.net_total, 0);
    return { totalCount, totalRevenue, totalCash, totalCard };
  }, [filteredBills]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Notifications */}
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

      {/* Revenue & Bills KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] p-4 rounded-xl border border-white/5 shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Filtered Invoices</span>
            <History className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {stats.totalCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Bills in current selection</div>
        </div>

        <div className="bg-[#111827] p-4 rounded-xl border border-white/5 shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Period Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-emerald-400 truncate">
            {formatRupees(stats.totalRevenue, settings.currency_symbol)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Net settled income</div>
        </div>

        <div className="bg-[#111827] p-4 rounded-xl border border-white/5 shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Cash Settlement</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-cyan-400 truncate">
            {formatRupees(stats.totalCash, settings.currency_symbol)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Physical register intake</div>
        </div>

        <div className="bg-[#111827] p-4 rounded-xl border border-white/5 shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Card / Digital</span>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-lg font-bold font-mono text-purple-400 truncate">
            {formatRupees(stats.totalCard, settings.currency_symbol)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">POS terminal transactions</div>
        </div>
      </div>

      {/* Bill History Toolbar */}
      <div className="bg-[#111827] p-4 rounded-xl border border-white/5 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-history-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Bill No, Customer, Phone, or Model..."
              className="w-full pl-9 pr-4 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
              >
                ×
              </button>
            )}
          </div>

          {/* Date & Payment Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-start lg:justify-end">
            {/* Date Filters */}
            <div className="flex items-center bg-[#0b0f17] p-1 rounded-lg border border-white/10 text-xs">
              {(['all', 'today', 'week', 'month'] as const).map((df) => (
                <button
                  key={df}
                  onClick={() => setDateFilter(df)}
                  className={`px-2.5 py-1 rounded capitalize font-medium transition ${
                    dateFilter === df
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {df}
                </button>
              ))}
            </div>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="px-3 py-1.5 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Credit">Credit</option>
            </select>
          </div>
        </div>

        {/* Bills Table */}
        <div className="overflow-x-auto rounded-lg border border-white/5">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0b0f17] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3 px-3">Bill Number</th>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Customer & Device</th>
                <th className="py-3 px-3">Items / Box No</th>
                <th className="py-3 px-3 text-right">Net Total ({settings.currency_symbol})</th>
                <th className="py-3 px-3 text-center">Payment</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-[#111827]">
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <History className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    No bill records found for the selected parameters.
                  </td>
                </tr>
              ) : (
                filteredBills.map((bill) => {
                  const formattedDate = new Date(bill.created_at).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  const formattedTime = new Date(bill.created_at).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr
                      key={bill.id}
                      className="hover:bg-cyan-500/[0.03] transition-colors group"
                    >
                      {/* Bill Number */}
                      <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                        {bill.bill_number}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        <div>{formattedDate}</div>
                        <div className="text-[10px] text-slate-500">{formattedTime}</div>
                      </td>

                      {/* Customer & Phone & Device Model */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-white">{bill.customer_name}</div>
                        <div className="text-[11px] font-mono text-slate-400">{bill.customer_phone}</div>
                        {bill.phone_model && (
                          <div className="text-[10px] text-cyan-300 font-sans flex items-center gap-1 mt-0.5">
                            <Smartphone className="w-2.5 h-2.5" />
                            <span>{bill.phone_model}</span>
                          </div>
                        )}
                        {bill.issue_notes && (
                          <div className="text-[10px] text-slate-500 italic truncate max-w-xs">
                            {bill.issue_notes}
                          </div>
                        )}
                      </td>

                      {/* Items and Box Numbers */}
                      <td className="py-3 px-3 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {bill.items.map((item, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#181c24] border border-white/10 text-[10px] font-mono text-slate-300"
                              title={`${item.item_name} - Qty: ${item.quantity}`}
                            >
                              <span className="truncate max-w-[90px]">{item.item_name}</span>
                              <span className="text-cyan-400 font-bold bg-cyan-500/10 px-1 rounded">
                                {item.box_number}
                              </span>
                              <span className="text-slate-500">x{item.quantity}</span>
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Net Total */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400 text-sm">
                        {formatRupees(bill.net_total, settings.currency_symbol)}
                        {bill.discount > 0 && (
                          <div className="text-[10px] text-slate-500 line-through">
                            {formatRupees(bill.subtotal, settings.currency_symbol)}
                          </div>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          {bill.payment_method}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Print / View Receipt button ("bill karaddi bill eke print ekak enna ona", "re-print") */}
                          <button
                            id={`btn-view-bill-${bill.id}`}
                            onClick={() => onOpenReceipt(bill)}
                            className="px-2.5 py-1 rounded bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 text-xs font-bold transition flex items-center gap-1 shadow-sm"
                            title="Open Printable Bill Receipt"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </button>

                          {/* Delete / Void Bill */}
                          <button
                            onClick={() => setBillToDelete(bill)}
                            className="p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition"
                            title="Delete or Void Bill"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete / Void Bill Modal */}
      {billToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0f17]/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#111827] border border-red-500/30 rounded-xl shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete / Void Bill?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to permanently delete invoice <span className="text-cyan-400 font-mono font-semibold">{billToDelete.bill_number}</span> for {billToDelete.customer_name}?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setBillToDelete(null)}
                className="w-1/2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteBill(billToDelete.id);
                  setBillToDelete(null);
                  setNotification({
                    message: `Bill ${billToDelete.bill_number} removed from records.`,
                    type: 'success',
                  });
                }}
                className="w-1/2 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold text-xs shadow"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

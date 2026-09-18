import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Smartphone, 
  FileText, 
  Calendar, 
  Receipt, 
  ArrowRight, 
  Edit, 
  Trash2, 
  X, 
  DollarSign, 
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Customer, Bill, ShopSettings } from '../types';
import { formatRupees } from '../services/storage';

interface CustomersViewProps {
  customers: Customer[];
  bills: Bill[];
  settings: ShopSettings;
  onSaveCustomer: (customer: Customer) => void;
  onDeleteCustomer: (customerId: string) => void;
  onStartBillForCustomer: (customer: Customer) => void;
  onViewBillReceipt: (bill: Bill) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  bills,
  settings,
  onSaveCustomer,
  onDeleteCustomer,
  onStartBillForCustomer,
  onViewBillReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // View Customer History Drawer/Modal
  const [inspectCustomer, setInspectCustomer] = useState<Customer | null>(null);

  // Delete Customer Confirmation
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneModel, setPhoneModel] = useState('');
  const [notes, setNotes] = useState('');

  // Notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filter Customers
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term) ||
        (c.phone_model && c.phone_model.toLowerCase().includes(term)) ||
        (c.notes && c.notes.toLowerCase().includes(term))
    );
  }, [customers, searchTerm]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalCount = customers.length;
    const totalSpent = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
    const totalVisits = customers.reduce((sum, c) => sum + (c.bills_count || 0), 0);
    return { totalCount, totalSpent, totalVisits };
  }, [customers]);

  // Customer bills
  const customerBills = useMemo(() => {
    if (!inspectCustomer) return [];
    return bills.filter(
      (b) =>
        b.customer_id === inspectCustomer.id ||
        (b.customer_phone && b.customer_phone === inspectCustomer.phone)
    );
  }, [inspectCustomer, bills]);

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setPhoneModel('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setPhoneModel(c.phone_model || '');
    setNotes(c.notes || '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setNotification({ message: 'Customer Name and Phone Number are required.', type: 'error' });
      return;
    }

    const payload: Customer = {
      id: editingCustomer ? editingCustomer.id : `cust-${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      phone_model: phoneModel.trim() || undefined,
      notes: notes.trim() || undefined,
      total_spent: editingCustomer ? editingCustomer.total_spent : 0,
      bills_count: editingCustomer ? editingCustomer.bills_count : 0,
      last_visit: editingCustomer ? editingCustomer.last_visit : new Date().toISOString(),
      created_at: editingCustomer ? editingCustomer.created_at : new Date().toISOString(),
    };

    onSaveCustomer(payload);
    setIsModalOpen(false);
    setNotification({
      message: `Customer "${payload.name}" saved successfully!`,
      type: 'success',
    });
  };

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

      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111827] p-4 rounded-xl border border-white/5 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Registered Clients
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-white">
              {stats.totalCount}
            </div>
            <div className="text-[11px] text-slate-500">Clients in directory</div>
          </div>
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#111827] p-4 rounded-xl border border-white/5 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Customer Spend
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-emerald-400 truncate">
              {formatRupees(stats.totalSpent, settings.currency_symbol)}
            </div>
            <div className="text-[11px] text-slate-500">Cumulative revenue generated</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#111827] p-4 rounded-xl border border-white/5 shadow-md flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Total Service Invoices
            </div>
            <div className="mt-1 text-2xl font-bold font-mono text-cyan-400">
              {stats.totalVisits}
            </div>
            <div className="text-[11px] text-slate-500">Repairs & accessories billed</div>
          </div>
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Receipt className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Customers Table & Toolbar */}
      <div className="bg-[#111827] p-4 rounded-xl border border-white/5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-customer-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customer by name, phone, device..."
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

          <button
            id="btn-add-customer"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold rounded-lg text-xs transition shadow-md shadow-cyan-500/20 active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>

        {/* Customer Table */}
        <div className="overflow-x-auto rounded-lg border border-white/5">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0b0f17] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3 px-3">Customer Name</th>
                <th className="py-3 px-3">Phone Number</th>
                <th className="py-3 px-3">Device / Phone Model</th>
                <th className="py-3 px-3 text-center">Bills Count</th>
                <th className="py-3 px-3 text-right">Total Spent ({settings.currency_symbol})</th>
                <th className="py-3 px-3">Last Visit</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-[#111827]">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    No customers found matching search query.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => {
                  const lastVisitDate = customer.last_visit
                    ? new Date(customer.last_visit).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'N/A';

                  return (
                    <tr
                      key={customer.id}
                      className="hover:bg-cyan-500/[0.03] transition-colors group"
                    >
                      {/* Name & Notes */}
                      <td className="py-3 px-3 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span>{customer.name}</span>
                        </div>
                        {customer.notes && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs font-normal italic">
                            {customer.notes}
                          </div>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-3 font-mono text-cyan-400">
                        {customer.phone}
                      </td>

                      {/* Phone Model */}
                      <td className="py-3 px-3 text-slate-300">
                        {customer.phone_model ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                            <Smartphone className="w-3 h-3 text-slate-400" />
                            {customer.phone_model}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Bills Count */}
                      <td className="py-3 px-3 text-center font-mono font-semibold text-slate-200">
                        {customer.bills_count || 0}
                      </td>

                      {/* Total Spent */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                        {formatRupees(customer.total_spent || 0, settings.currency_symbol)}
                      </td>

                      {/* Last Visit */}
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        {lastVisitDate}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Create Bill Action */}
                          <button
                            onClick={() => onStartBillForCustomer(customer)}
                            className="px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500 hover:text-slate-950 text-cyan-400 text-xs font-medium transition flex items-center gap-1"
                            title="Start New Bill for Customer"
                          >
                            <Receipt className="w-3 h-3" />
                            <span>New Bill</span>
                          </button>

                          {/* View Customer History */}
                          <button
                            onClick={() => setInspectCustomer(customer)}
                            className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
                            title="View Purchase History"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Details */}
                          <button
                            onClick={() => handleOpenEditModal(customer)}
                            className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition"
                            title="Edit Customer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setCustomerToDelete(customer)}
                            className="p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition"
                            title="Delete Customer"
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

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0f17]/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#111827] border border-cyan-500/30 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0f131c]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  {editingCustomer ? 'Edit Customer Details' : 'Register New Customer'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Kasun Perera"
                  className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0771234567"
                  className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                  Device / Phone Model
                </label>
                <input
                  type="text"
                  value={phoneModel}
                  onChange={(e) => setPhoneModel(e.target.value)}
                  placeholder="e.g. iPhone 13 Pro"
                  className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                  Customer Notes / Service History
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. VIP client, prefers fast screen repairs, warranty valid till next month"
                  className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20"
                >
                  {editingCustomer ? 'Update Customer' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Purchase History Modal */}
      {inspectCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0f17]/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#111827] border border-cyan-500/30 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0f131c]">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>{inspectCustomer.name}</span>
                  <span className="text-xs font-mono text-cyan-400">({inspectCustomer.phone})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Device: {inspectCustomer.phone_model || 'Not specified'} • Total Spent: {formatRupees(inspectCustomer.total_spent || 0, settings.currency_symbol)}
                </p>
              </div>
              <button
                onClick={() => setInspectCustomer(null)}
                className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Invoice & Service History ({customerBills.length})
              </h4>

              {customerBills.length === 0 ? (
                <div className="py-8 text-center text-slate-500 border border-dashed border-white/10 rounded-lg">
                  <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="text-xs text-slate-400">No past bills recorded for this customer yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customerBills.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 bg-[#0b0f17] border border-white/10 rounded-lg flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-cyan-400">
                            {b.bill_number}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {new Date(b.created_at).toLocaleDateString('en-GB')}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                            {b.payment_method}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 mt-1">
                          {b.items.map((i) => `${i.item_name} [${i.box_number}] (x${i.quantity})`).join(', ')}
                        </div>
                        {b.issue_notes && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5">
                            Note: {b.issue_notes}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold font-mono text-emerald-400">
                          {formatRupees(b.net_total, settings.currency_symbol)}
                        </div>
                        <button
                          onClick={() => {
                            setInspectCustomer(null);
                            onViewBillReceipt(b);
                          }}
                          className="mt-1 px-2.5 py-1 rounded bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-400 text-xs font-mono transition"
                        >
                          View Receipt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-[#0f131c] border-t border-white/10 flex justify-end gap-2">
              <button
                onClick={() => {
                  const target = inspectCustomer;
                  setInspectCustomer(null);
                  onStartBillForCustomer(target);
                }}
                className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow"
              >
                Start New Bill for {inspectCustomer.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0f17]/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#111827] border border-red-500/30 rounded-xl shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Remove Customer Record?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to remove <span className="text-cyan-400 font-medium">"{customerToDelete.name}"</span> ({customerToDelete.phone})?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCustomerToDelete(null)}
                className="w-1/2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteCustomer(customerToDelete.id);
                  setCustomerToDelete(null);
                  setNotification({
                    message: `Customer "${customerToDelete.name}" deleted.`,
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

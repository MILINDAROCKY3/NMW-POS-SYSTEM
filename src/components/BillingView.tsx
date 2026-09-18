import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Printer, 
  CreditCard, 
  Banknote, 
  Building2, 
  Clock, 
  User, 
  Smartphone, 
  FileText, 
  Box, 
  Percent, 
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Tag,
  PackageCheck
} from 'lucide-react';
import { InventoryItem, Customer, Bill, BillItem, PaymentMethod, ShopSettings, AdminUser } from '../types';
import { formatRupees, generateNextBillNumber } from '../services/storage';

interface BillingViewProps {
  inventory: InventoryItem[];
  customers: Customer[];
  bills: Bill[];
  settings: ShopSettings;
  currentUser: AdminUser | null;
  onSaveBill: (bill: Bill, updatedInventory: InventoryItem[], updatedCustomers: Customer[]) => void;
  onTriggerPrint: (bill: Bill) => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  inventory,
  customers,
  bills,
  settings,
  currentUser,
  onSaveBill,
  onTriggerPrint,
}) => {
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Customer Information
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [phoneModel, setPhoneModel] = useState('');
  const [issueNotes, setIssueNotes] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Cart / Bill Items
  const [cart, setCart] = useState<BillItem[]>([]);

  // Financials
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');

  // Notification / Feedback
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Categories list derived from inventory
  const categories = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return ['All', ...Array.from(set)];
  }, [inventory]);

  // Filtered inventory for searching (name, item_code, box_number)
  const filteredInventory = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return inventory.filter((item) => {
      const matchCat = selectedCategory === 'All' || item.category === selectedCategory;
      if (!matchCat) return false;
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        item.item_code.toLowerCase().includes(term) ||
        item.box_number.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
      );
    });
  }, [inventory, searchTerm, selectedCategory]);

  // Customer Autocomplete suggestions (as requested: "custame kenekwa add kalama bil karana thana castamage name gahapuwama nama pennana oma")
  const customerSuggestions = useMemo(() => {
    if (!customerName.trim() && !customerPhone.trim()) return [];
    const queryName = customerName.trim().toLowerCase();
    const queryPhone = customerPhone.trim().toLowerCase();

    return customers.filter((c) => {
      const matchName = queryName && c.name.toLowerCase().includes(queryName);
      const matchPhone = queryPhone && c.phone.toLowerCase().includes(queryPhone);
      return matchName || matchPhone;
    }).slice(0, 5);
  }, [customers, customerName, customerPhone]);

  // Pick customer from autocomplete
  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    if (c.phone_model && !phoneModel) {
      setPhoneModel(c.phone_model);
    }
    if (c.notes && !issueNotes) {
      setIssueNotes(c.notes);
    }
    setShowCustomerDropdown(false);
  };

  // Add Item to Bill Cart
  const handleAddToCart = (item: InventoryItem) => {
    if (item.quantity <= 0) {
      setNotification({ message: `"${item.name}" is currently out of stock!`, type: 'error' });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.item_id === item.id);
      if (existing) {
        if (existing.quantity >= item.quantity) {
          setNotification({
            message: `Cannot add more than available stock (${item.quantity}) for this item.`,
            type: 'error',
          });
          return prev;
        }
        return prev.map((i) =>
          i.item_id === item.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                line_total: (i.quantity + 1) * i.unit_price,
              }
            : i
        );
      } else {
        const newItem: BillItem = {
          id: `bi-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          item_id: item.id,
          item_code: item.item_code,
          item_name: item.name,
          box_number: item.box_number || 'BOX-01',
          quantity: 1,
          unit_price: item.selling_price,
          line_total: item.selling_price,
        };
        return [...prev, newItem];
      }
    });
  };

  // Update Cart Item Quantity
  const handleUpdateQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.item_id === itemId) {
            const stockItem = inventory.find((i) => i.id === itemId);
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (stockItem && newQty > stockItem.quantity) {
              setNotification({
                message: `Exceeds available stock (${stockItem.quantity})!`,
                type: 'error',
              });
              return item;
            }
            return {
              ...item,
              quantity: newQty,
              line_total: newQty * item.unit_price,
            };
          }
          return item;
        })
        .filter(Boolean) as BillItem[]
    );
  };

  // Update Cart Item Unit Price (custom price override)
  const handleUpdatePrice = (itemId: string, newPrice: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.item_id === itemId) {
          const safePrice = isNaN(newPrice) || newPrice < 0 ? 0 : newPrice;
          return {
            ...item,
            unit_price: safePrice,
            line_total: item.quantity * safePrice,
          };
        }
        return item;
      })
    );
  };

  // Remove Item from Cart
  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.item_id !== itemId));
  };

  // Clear Cart
  const handleClearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setPaidAmount(0);
    setNotification(null);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.line_total, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (discountType === 'percentage') {
      const pct = Math.min(100, Math.max(0, discountValue));
      return (subtotal * pct) / 100;
    } else {
      return Math.min(subtotal, Math.max(0, discountValue));
    }
  }, [subtotal, discountType, discountValue]);

  const netTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  // Set paid amount default to netTotal when netTotal changes and paidAmount was 0 or equal to previous total
  useEffect(() => {
    if (subtotal > 0 && paidAmount === 0) {
      setPaidAmount(netTotal);
    }
  }, [netTotal]);

  const balance = useMemo(() => {
    return Math.max(0, paidAmount - netTotal);
  }, [paidAmount, netTotal]);

  // Quick Cash Tenders
  const handleQuickCash = (amount: number) => {
    setPaidAmount(amount);
  };

  // Save Bill Handler
  const handleSaveBill = (printImmediately: boolean = true) => {
    if (cart.length === 0) {
      setNotification({ message: 'Please add at least one item to the bill.', type: 'error' });
      return;
    }

    const finalCustName = customerName.trim() || 'Walking Customer';
    const finalCustPhone = customerPhone.trim() || 'N/A';

    const billNumber = generateNextBillNumber(bills);

    const newBill: Bill = {
      id: `bill-${Date.now()}`,
      bill_number: billNumber,
      customer_id: selectedCustomerId,
      customer_name: finalCustName,
      customer_phone: finalCustPhone,
      phone_model: phoneModel.trim() || undefined,
      issue_notes: issueNotes.trim() || undefined,
      items: cart,
      subtotal,
      discount: discountAmount,
      discount_type: discountType,
      net_total: netTotal,
      paid_amount: paidAmount,
      balance,
      payment_method: paymentMethod,
      status: 'Completed',
      created_at: new Date().toISOString(),
      created_by: currentUser?.username || 'NMWadmin',
    };

    // 1. Reduce inventory quantities
    const updatedInventory = inventory.map((invItem) => {
      const soldItem = cart.find((ci) => ci.item_id === invItem.id);
      if (soldItem) {
        return {
          ...invItem,
          quantity: Math.max(0, invItem.quantity - soldItem.quantity),
          updated_at: new Date().toISOString(),
        };
      }
      return invItem;
    });

    // 2. Update or Create Customer record
    let updatedCustomers = [...customers];
    if (finalCustPhone && finalCustPhone !== 'N/A') {
      const existingCustIdx = updatedCustomers.findIndex(
        (c) => c.phone.trim() === finalCustPhone || (selectedCustomerId && c.id === selectedCustomerId)
      );

      if (existingCustIdx >= 0) {
        const existing = updatedCustomers[existingCustIdx];
        updatedCustomers[existingCustIdx] = {
          ...existing,
          name: finalCustName,
          phone_model: phoneModel.trim() || existing.phone_model,
          notes: issueNotes.trim() || existing.notes,
          total_spent: existing.total_spent + netTotal,
          bills_count: existing.bills_count + 1,
          last_visit: new Date().toISOString(),
        };
      } else {
        const newCust: Customer = {
          id: `cust-${Date.now()}`,
          name: finalCustName,
          phone: finalCustPhone,
          phone_model: phoneModel.trim() || undefined,
          notes: issueNotes.trim() || undefined,
          total_spent: netTotal,
          bills_count: 1,
          last_visit: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        updatedCustomers.push(newCust);
      }
    }

    // Call save
    onSaveBill(newBill, updatedInventory, updatedCustomers);

    // Reset Form
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setPhoneModel('');
    setIssueNotes('');
    setSelectedCustomerId(undefined);
    setDiscountValue(0);
    setPaidAmount(0);

    setNotification({
      message: `Bill ${billNumber} generated successfully! Stock automatically updated.`,
      type: 'success',
    });

    if (printImmediately) {
      onTriggerPrint(newBill);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Notifications */}
      {notification && (
        <div
          className={`mb-4 p-3 rounded-lg flex items-center justify-between text-xs transition shadow-lg ${
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
          <button
            onClick={() => setNotification(null)}
            className="text-xs hover:underline opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Catalog / Product Search (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search Bar & Categories */}
          <div className="bg-[#111827] p-4 rounded-xl border border-white/5 shadow-lg space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-pos-item-search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search items by Name, Code, or BOX NUMBER (e.g. BOX-A01, Battery, iPhone)..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#0b0f17] border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-sans"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm shadow-cyan-500/20'
                      : 'bg-[#181c24] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-1">
            {filteredInventory.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-500 bg-[#111827] rounded-xl border border-dashed border-white/10">
                <Box className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-sm font-medium text-slate-400">No matching inventory items found</p>
                <p className="text-xs text-slate-600 mt-1">Try a different search term or box number</p>
              </div>
            ) : (
              filteredInventory.map((item) => {
                const isOutOfStock = item.quantity <= 0;
                const isLowStock = item.quantity <= item.low_stock_threshold;
                const cartQty = cart.find((c) => c.item_id === item.id)?.quantity || 0;

                return (
                  <div
                    key={item.id}
                    id={`pos-item-card-${item.id}`}
                    onClick={() => !isOutOfStock && handleAddToCart(item)}
                    className={`group relative p-3.5 rounded-xl border transition flex flex-col justify-between select-none ${
                      isOutOfStock
                        ? 'bg-[#181c24]/60 border-white/5 opacity-50 cursor-not-allowed'
                        : 'bg-[#111827] border-white/5 hover:border-cyan-500/40 hover:bg-[#181c24] cursor-pointer shadow-sm hover:shadow-cyan-500/10'
                    }`}
                  >
                    <div>
                      {/* Top Header: Code & Box Number Badge */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-mono font-medium text-slate-500 uppercase">
                          {item.item_code}
                        </span>

                        {/* BOX NUMBER (Explicit User Demand!) */}
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold">
                          <Box className="w-3 h-3 text-cyan-400" />
                          <span>{item.box_number || 'BOX-01'}</span>
                        </div>
                      </div>

                      {/* Product Name */}
                      <h4 className="text-xs font-semibold text-slate-100 group-hover:text-cyan-300 transition line-clamp-2 leading-snug">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">{item.category}</p>
                    </div>

                    {/* Pricing & Stock Status */}
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold font-mono text-cyan-400">
                          {formatRupees(item.selling_price, settings.currency_symbol)}
                        </div>
                        <div className="text-[10px] font-mono text-slate-500">
                          Stock: <span className={isLowStock ? 'text-amber-400 font-bold' : 'text-slate-400'}>{item.quantity}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {cartQty > 0 && (
                          <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-bold font-mono text-[11px] flex items-center justify-center shadow">
                            {cartQty}
                          </span>
                        )}
                        <button
                          disabled={isOutOfStock}
                          className="p-1.5 rounded-lg bg-white/5 group-hover:bg-cyan-500 group-hover:text-slate-950 text-slate-300 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Bill Register & Customer Details (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          {/* Customer & Repair Intake Details */}
          <div className="bg-[#111827] p-4 rounded-xl border border-white/5 shadow-lg space-y-3 relative">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Customer & Service Details
                </span>
              </div>
              {selectedCustomerId && (
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  Existing Client
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 relative">
              {/* Customer Name with Autocomplete */}
              <div className="relative">
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Customer Name *
                </label>
                <input
                  id="input-bill-customer-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="e.g. Kasun Perera"
                  className="w-full px-3 py-1.5 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />

                {/* Autocomplete dropdown */}
                {showCustomerDropdown && customerSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#181c24] border border-cyan-500/30 rounded-lg shadow-xl overflow-hidden divide-y divide-white/5">
                    {customerSuggestions.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="p-2 hover:bg-cyan-500/10 cursor-pointer text-left transition"
                      >
                        <div className="text-xs font-semibold text-slate-200">{c.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                          <span>{c.phone}</span>
                          {c.phone_model && <span className="text-cyan-400">{c.phone_model}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Customer Phone */}
              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Contact Phone *
                </label>
                <input
                  id="input-bill-customer-phone"
                  type="text"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  placeholder="e.g. 0771234567"
                  className="w-full px-3 py-1.5 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              {/* Phone Model */}
              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Device / Phone Model
                </label>
                <input
                  id="input-bill-phone-model"
                  type="text"
                  value={phoneModel}
                  onChange={(e) => setPhoneModel(e.target.value)}
                  placeholder="e.g. iPhone 13 Pro / Samsung A52"
                  className="w-full px-3 py-1.5 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Repair Issue / Notes */}
              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Issue / Repair Notes
                </label>
                <input
                  id="input-bill-issue-notes"
                  type="text"
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  placeholder="e.g. Screen replacement, battery"
                  className="w-full px-3 py-1.5 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Cart Items List */}
          <div className="bg-[#111827] rounded-xl border border-white/5 shadow-lg flex-1 flex flex-col overflow-hidden">
            <div className="p-3 bg-[#0f131c] border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Bill Items ({cart.length})
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  id="btn-clear-cart"
                  onClick={handleClearCart}
                  className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {/* Cart Table */}
            <div className="p-3 flex-1 overflow-y-auto max-h-[260px] divide-y divide-white/5">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <PackageCheck className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p className="text-xs text-slate-400">The cart is currently empty</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Click items on the left catalog to add to bill
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-200 truncate">
                          {item.item_name}
                        </span>
                        {/* Distinct Box Number Pill */}
                        <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold shrink-0">
                          {item.box_number}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-mono">
                        <span>{formatRupees(item.unit_price, settings.currency_symbol)}</span>
                        <span>x {item.quantity}</span>
                        <span className="text-slate-200 font-semibold">
                          = {formatRupees(item.line_total, settings.currency_symbol)}
                        </span>
                      </div>
                    </div>

                    {/* Quantity Stepper & Remove */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleUpdateQty(item.item_id, -1)}
                        className="w-6 h-6 rounded bg-[#1e293b] hover:bg-slate-700 text-slate-200 flex items-center justify-center transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-mono text-xs font-bold text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => handleUpdateQty(item.item_id, 1)}
                        className="w-6 h-6 rounded bg-[#1e293b] hover:bg-slate-700 text-slate-200 flex items-center justify-center transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleRemoveFromCart(item.item_id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition ml-1"
                        title="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Calculations & Tender Section */}
            <div className="p-4 bg-[#0f131c] border-t border-white/10 space-y-3">
              {/* Subtotal & Discount */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-slate-200">{formatRupees(subtotal, settings.currency_symbol)}</span>
                </div>

                {/* Discount Control */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/5">
                  <div className="flex items-center gap-1 text-slate-400">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Discount:</span>
                    <button
                      type="button"
                      onClick={() => setDiscountType(discountType === 'fixed' ? 'percentage' : 'fixed')}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-slate-300 hover:bg-cyan-500/20 hover:text-cyan-300 transition"
                    >
                      {discountType === 'fixed' ? settings.currency_symbol : '%'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      id="input-bill-discount"
                      type="number"
                      min="0"
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-20 px-2 py-1 bg-[#111827] border border-white/10 rounded text-right font-mono text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    <span className="text-[11px] font-mono text-emerald-400 w-24 text-right">
                      -{formatRupees(discountAmount, settings.currency_symbol)}
                    </span>
                  </div>
                </div>

                {/* NET TOTAL */}
                <div className="flex justify-between items-baseline pt-2 border-t border-white/10">
                  <span className="text-sm font-bold text-white uppercase tracking-wide">Net Total:</span>
                  <span className="text-xl font-bold font-mono text-cyan-400">
                    {formatRupees(netTotal, settings.currency_symbol)}
                  </span>
                </div>
              </div>

              {/* Payment Method Tabs */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['Cash', 'Card', 'Bank Transfer', 'Credit'] as PaymentMethod[]).map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1 ${
                        paymentMethod === pm
                          ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                          : 'bg-[#181c24] text-slate-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {pm === 'Cash' && <Banknote className="w-3.5 h-3.5" />}
                      {pm === 'Card' && <CreditCard className="w-3.5 h-3.5" />}
                      {pm === 'Bank Transfer' && <Building2 className="w-3.5 h-3.5" />}
                      {pm === 'Credit' && <Clock className="w-3.5 h-3.5" />}
                      <span className="truncate text-[11px]">{pm}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Cash Suggestions */}
              {paymentMethod === 'Cash' && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase">
                    <span>Quick Tender:</span>
                    <button
                      onClick={() => handleQuickCash(netTotal)}
                      className="text-cyan-400 hover:underline font-mono"
                    >
                      Exact ({formatRupees(netTotal, settings.currency_symbol)})
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    {[1000, 2000, 5000, 10000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => handleQuickCash(amt)}
                        className="flex-1 py-1 rounded bg-[#181c24] hover:bg-slate-700 text-slate-300 font-mono text-xs border border-white/5 transition"
                      >
                        {amt.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Paid Amount & Balance */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 uppercase mb-1">
                    Amount Paid ({settings.currency_symbol})
                  </label>
                  <input
                    id="input-bill-paid"
                    type="number"
                    min="0"
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-1.5 bg-[#111827] border border-white/10 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 uppercase mb-1">
                    Balance / Change
                  </label>
                  <div className="w-full px-3 py-1.5 bg-[#111827] border border-white/10 rounded-lg text-sm font-mono font-bold text-emerald-400">
                    {formatRupees(balance, settings.currency_symbol)}
                  </div>
                </div>
              </div>

              {/* Bill Action Buttons: Save & Print */}
              <div className="pt-2 flex gap-2">
                <button
                  id="btn-save-bill-only"
                  onClick={() => handleSaveBill(false)}
                  disabled={cart.length === 0}
                  className="w-1/3 py-2.5 px-3 bg-[#1e293b] hover:bg-slate-700 text-slate-200 font-semibold rounded-lg transition disabled:opacity-40 text-xs border border-white/10"
                >
                  Save Only
                </button>
                <button
                  id="btn-save-and-print"
                  onClick={() => handleSaveBill(true)}
                  disabled={cart.length === 0}
                  className="w-2/3 py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold rounded-lg transition shadow-lg shadow-cyan-500/20 active:scale-[0.98] disabled:opacity-40 text-xs flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Save & Print Bill</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

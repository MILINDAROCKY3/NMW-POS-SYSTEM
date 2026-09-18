import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Box, 
  AlertTriangle, 
  Package, 
  DollarSign, 
  Tag, 
  Filter, 
  Check, 
  X, 
  Sparkles,
  ArrowUpDown,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { InventoryItem, ShopSettings } from '../types';
import { formatRupees, generateNextItemCode } from '../services/storage';

interface InventoryViewProps {
  inventory: InventoryItem[];
  settings: ShopSettings;
  onSaveItem: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onQuickUpdate: (itemId: string, newPrice: number, newQty: number) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  inventory,
  settings,
  onSaveItem,
  onDeleteItem,
  onQuickUpdate,
}) => {
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Modal State for Add / Edit Item
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Quick in-line edit state
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlinePrice, setInlinePrice] = useState<number>(0);
  const [inlineQty, setInlineQty] = useState<number>(0);

  // Delete Confirmation Modal
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal Form State
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [boxNumber, setBoxNumber] = useState('BOX-A01');
  const [category, setCategory] = useState('Displays & LCD');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(3);

  // Categories list
  const categories = useMemo(() => {
    const defaultCats = [
      'Displays & LCD',
      'Batteries',
      'Charging Ports',
      'ICs & Chips',
      'Housings & Glass',
      'Tempered Glass',
      'Accessories',
      'Repair Services',
    ];
    const existing = inventory.map((i) => i.category).filter(Boolean);
    return Array.from(new Set([...defaultCats, ...existing]));
  }, [inventory]);

  // Filtered & Searched Inventory
  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return inventory.filter((item) => {
      const matchCat = categoryFilter === 'All' || item.category === categoryFilter;
      const matchLow = !onlyLowStock || item.quantity <= item.low_stock_threshold;
      if (!matchCat || !matchLow) return false;
      if (!term) return true;
      return (
        item.name.toLowerCase().includes(term) ||
        item.item_code.toLowerCase().includes(term) ||
        item.box_number.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
      );
    });
  }, [inventory, searchTerm, categoryFilter, onlyLowStock]);

  // Inventory Statistics
  const stats = useMemo(() => {
    const totalProducts = inventory.length;
    const totalQty = inventory.reduce((sum, i) => sum + i.quantity, 0);
    const lowStockCount = inventory.filter((i) => i.quantity <= i.low_stock_threshold).length;
    const totalValuation = inventory.reduce((sum, i) => sum + i.quantity * i.selling_price, 0);
    return { totalProducts, totalQty, lowStockCount, totalValuation };
  }, [inventory]);

  // Open Add Item Modal
  const handleOpenAddModal = () => {
    const nextCode = generateNextItemCode(inventory);
    setEditingItem(null);
    setItemCode(nextCode);
    setItemName('');
    setBoxNumber('BOX-A01');
    setCategory('Displays & LCD');
    setCostPrice(0);
    setSellingPrice(0);
    setQuantity(10);
    setLowStockThreshold(3);
    setIsModalOpen(true);
  };

  // Open Edit Item Modal
  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setItemCode(item.item_code);
    setItemName(item.name);
    setBoxNumber(item.box_number || 'BOX-A01');
    setCategory(item.category || 'Displays & LCD');
    setCostPrice(item.cost_price);
    setSellingPrice(item.selling_price);
    setQuantity(item.quantity);
    setLowStockThreshold(item.low_stock_threshold);
    setIsModalOpen(true);
  };

  // Auto regenerate item code
  const handleRegenerateCode = () => {
    const next = generateNextItemCode(inventory);
    setItemCode(next);
  };

  // Save Add/Edit Modal
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      setNotification({ message: 'Item name is required.', type: 'error' });
      return;
    }
    if (!boxNumber.trim()) {
      setNotification({ message: 'BOX NUMBER is required for workshop tracking.', type: 'error' });
      return;
    }

    const payload: InventoryItem = {
      id: editingItem ? editingItem.id : `itm-${Date.now()}`,
      item_code: itemCode.trim() || generateNextItemCode(inventory),
      name: itemName.trim(),
      box_number: boxNumber.trim().toUpperCase(),
      category: category.trim(),
      cost_price: Number(costPrice) || 0,
      selling_price: Number(sellingPrice) || 0,
      quantity: Number(quantity) || 0,
      low_stock_threshold: Number(lowStockThreshold) || 1,
      created_at: editingItem ? editingItem.created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onSaveItem(payload);
    setIsModalOpen(false);
    setNotification({
      message: `Item "${payload.name}" saved successfully in ${payload.box_number}!`,
      type: 'success',
    });
  };

  // Start Inline Quick Edit for Price & Quantity
  const handleStartInlineEdit = (item: InventoryItem) => {
    setInlineEditId(item.id);
    setInlinePrice(item.selling_price);
    setInlineQty(item.quantity);
  };

  // Save Inline Quick Edit
  const handleSaveInlineEdit = (item: InventoryItem) => {
    onQuickUpdate(item.id, inlinePrice, inlineQty);
    setInlineEditId(null);
    setNotification({
      message: `Updated ${item.name}: Price ${formatRupees(inlinePrice, settings.currency_symbol)}, Stock: ${inlineQty}`,
      type: 'success',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner / Notification */}
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

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111827] p-4 rounded-xl border border-white/5 shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total SKUs</span>
            <Package className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-white">
            {stats.totalProducts}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Catalogued inventory parts</div>
        </div>

        <div className="bg-[#111827] p-4 rounded-xl border border-white/5 shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">In-Stock Units</span>
            <Box className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-cyan-400">
            {stats.totalQty}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Total components in drawers</div>
        </div>

        <div className="bg-[#111827] p-4 rounded-xl border border-white/5 shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-400">
            {stats.lowStockCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">At or below re-order limit</div>
        </div>

        <div className="bg-[#111827] p-4 rounded-xl border border-white/5 shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Stock Valuation</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-bold font-mono text-emerald-400 truncate">
            {formatRupees(stats.totalValuation, settings.currency_symbol)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Retail inventory value</div>
        </div>
      </div>

      {/* Main Inventory Toolbar */}
      <div className="bg-[#111827] p-4 rounded-xl border border-white/5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-inventory-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, code, or BOX NUMBER..."
              className="w-full pl-9 pr-4 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
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

          {/* Action Filters & Add Button */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Category Select */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Low Stock Toggle */}
            <button
              onClick={() => setOnlyLowStock(!onlyLowStock)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border ${
                onlyLowStock
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-[#0b0f17] text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Low Stock Only</span>
            </button>

            {/* Add New Item Button */}
            <button
              id="btn-add-inventory-item"
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-bold rounded-lg text-xs transition shadow-md shadow-cyan-500/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Item</span>
            </button>
          </div>
        </div>

        {/* Inventory Data Table */}
        <div className="overflow-x-auto rounded-lg border border-white/5">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#0b0f17] text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-3 px-3">Item Code</th>
                <th className="py-3 px-3">Item Name</th>
                <th className="py-3 px-3 text-center">BOX NUMBER</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Selling Price ({settings.currency_symbol})</th>
                <th className="py-3 px-3 text-center">Stock Count</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 bg-[#111827]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Box className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    No inventory components match the current criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = item.quantity <= item.low_stock_threshold;
                  const isOut = item.quantity <= 0;
                  const isEditingInline = inlineEditId === item.id;

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-cyan-500/[0.03] transition-colors group"
                    >
                      {/* Item Code */}
                      <td className="py-3 px-3 font-mono font-semibold text-slate-300">
                        {item.item_code}
                      </td>

                      {/* Item Name */}
                      <td className="py-3 px-3 font-medium text-white max-w-xs">
                        <div className="truncate" title={item.name}>
                          {item.name}
                        </div>
                      </td>

                      {/* BOX NUMBER (Explicit Highlight) */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold">
                          <Box className="w-3 h-3 text-cyan-400" />
                          <span>{item.box_number || 'BOX-01'}</span>
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]">
                          {item.category}
                        </span>
                      </td>

                      {/* Selling Price (With Inline Edit Option) */}
                      <td className="py-3 px-3 text-right font-mono font-semibold">
                        {isEditingInline ? (
                          <input
                            type="number"
                            value={inlinePrice}
                            onChange={(e) => setInlinePrice(parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 bg-[#0b0f17] border border-cyan-500 rounded text-right text-cyan-400 font-mono text-xs focus:outline-none"
                          />
                        ) : (
                          <span className="text-cyan-400">
                            {formatRupees(item.selling_price, settings.currency_symbol)}
                          </span>
                        )}
                      </td>

                      {/* Stock Quantity (With Inline Edit Option) */}
                      <td className="py-3 px-3 text-center font-mono">
                        {isEditingInline ? (
                          <input
                            type="number"
                            value={inlineQty}
                            onChange={(e) => setInlineQty(parseInt(e.target.value, 10) || 0)}
                            className="w-16 px-2 py-1 bg-[#0b0f17] border border-cyan-500 rounded text-center text-white font-mono text-xs focus:outline-none"
                          />
                        ) : (
                          <span className={`font-bold ${isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-slate-200'}`}>
                            {item.quantity}
                          </span>
                        )}
                      </td>

                      {/* Stock Status Badge */}
                      <td className="py-3 px-3 text-center">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/20">
                            OUT OF STOCK
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            LOW STOCK ({item.quantity})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            IN STOCK
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isEditingInline ? (
                            <>
                              <button
                                onClick={() => handleSaveInlineEdit(item)}
                                className="p-1 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
                                title="Save Price & Quantity"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setInlineEditId(null)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 transition"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Quick Edit Price & Qty button ("price and quntity edit karanna puluwan wenna ona") */}
                              <button
                                onClick={() => handleStartInlineEdit(item)}
                                className="px-2 py-1 rounded bg-white/5 hover:bg-cyan-500/20 hover:text-cyan-300 text-slate-400 text-[11px] font-mono transition flex items-center gap-1"
                                title="Quick Edit Price & Quantity"
                              >
                                <ArrowUpDown className="w-3 h-3" />
                                <span>Quick</span>
                              </button>

                              {/* Full Edit Modal */}
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition"
                                title="Edit Full Details"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Delete Item */}
                              <button
                                onClick={() => setItemToDelete(item)}
                                className="p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
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

      {/* Add / Edit Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0f17]/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#111827] border border-cyan-500/30 rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0f131c]">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
                  </h3>
                  <p className="text-xs text-slate-400">Workshop Box & Price Configuration</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Auto Generated Item Code */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono">
                      Item Code *
                    </label>
                    <button
                      type="button"
                      onClick={handleRegenerateCode}
                      className="text-[10px] text-cyan-400 hover:underline flex items-center gap-0.5"
                    >
                      <Sparkles className="w-3 h-3" /> Auto
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={itemCode}
                    onChange={(e) => setItemCode(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* BOX NUMBER (Crucial prompt requirement!) */}
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                    BOX NUMBER (Shelf/Drawer) *
                  </label>
                  <input
                    type="text"
                    required
                    value={boxNumber}
                    onChange={(e) => setBoxNumber(e.target.value)}
                    placeholder="e.g. BOX-A01, BIN-12"
                    className="w-full px-3 py-2 bg-[#0b0f17] border border-cyan-500/40 rounded-lg text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Item Name */}
              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                  Item Description / Name *
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. iPhone 13 Pro OLED Display Assembly"
                  className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                  Category *
                </label>
                <div className="flex gap-2">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cost Price & Selling Price (Rs.) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                    Cost Price ({settings.currency_symbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPrice || ''}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                    Selling Price ({settings.currency_symbol}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={sellingPrice || ''}
                    onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-[#0b0f17] border border-cyan-500/40 rounded-lg text-xs text-cyan-400 font-mono font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Stock Quantity & Low Stock Limit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                    Available Stock (Quantity) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={quantity || ''}
                    onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                    placeholder="10"
                    className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-400 uppercase font-mono mb-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={lowStockThreshold || ''}
                    onChange={(e) => setLowStockThreshold(parseInt(e.target.value, 10) || 1)}
                    placeholder="3"
                    className="w-full px-3 py-2 bg-[#0b0f17] border border-white/10 rounded-lg text-xs text-amber-400 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Form Buttons */}
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
                  {editingItem ? 'Update Component' : 'Save Component'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0f17]/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#111827] border border-red-500/30 rounded-xl shadow-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Inventory Item?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to remove <span className="text-cyan-400 font-medium">"{itemToDelete.name}"</span> ({itemToDelete.item_code}) in {itemToDelete.box_number}?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setItemToDelete(null)}
                className="w-1/2 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteItem(itemToDelete.id);
                  setItemToDelete(null);
                  setNotification({
                    message: `Deleted "${itemToDelete.name}" from inventory.`,
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

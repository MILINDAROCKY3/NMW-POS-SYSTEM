import React from 'react';
import { Printer, X, CheckCircle2, ShieldCheck, Phone, MapPin } from 'lucide-react';
import { Bill, ShopSettings } from '../types';
import { formatRupees } from '../services/storage';

interface PrintReceiptModalProps {
  bill: Bill | null;
  settings: ShopSettings;
  onClose: () => void;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({ bill, settings, onClose }) => {
  if (!bill) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(bill.created_at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const formattedTime = new Date(bill.created_at).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b0f17]/85 backdrop-blur-md overflow-y-auto no-print">
      <div 
        id="receipt-modal-container"
        className="relative w-full max-w-lg bg-[#111827] border border-cyan-500/30 rounded-xl shadow-2xl overflow-hidden flex flex-col my-6"
      >
        {/* Modal Action Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0f131c]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Bill Receipt & Print Preview</h2>
              <p className="text-xs text-slate-400 font-mono">{bill.bill_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-print-bill"
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-slate-950 font-semibold rounded text-xs transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill</span>
            </button>
            <button
              id="btn-close-receipt"
              onClick={onClose}
              className="p-2 rounded hover:bg-white/10 text-slate-400 hover:text-white transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Ticket Receipt Body */}
        <div className="p-6 bg-slate-950/60 overflow-y-auto max-h-[75vh]">
          <div 
            id="printable-bill-sheet"
            className="printable-receipt bg-white text-slate-950 p-6 rounded-lg shadow-inner font-sans max-w-md mx-auto border border-slate-300"
          >
            {/* Receipt Header */}
            <div className="text-center pb-4 border-b-2 border-dashed border-slate-400">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-cyan-600 text-white font-bold text-lg mb-1">
                NMW
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 uppercase">
                {settings.shop_name}
              </h1>
              <p className="text-xs text-slate-600 font-medium">{settings.tagline}</p>
              <p className="text-xs text-slate-600 mt-1 flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3 inline" /> {settings.address}, {settings.city}
              </p>
              <p className="text-xs text-slate-700 font-mono mt-0.5">
                Tel: {settings.phone} {settings.alt_phone ? `| ${settings.alt_phone}` : ''}
              </p>
            </div>

            {/* Bill Meta Data */}
            <div className="grid grid-cols-2 text-xs py-3 border-b border-dashed border-slate-300 gap-y-1">
              <div>
                <span className="text-slate-500">Bill No:</span>{' '}
                <span className="font-mono font-bold text-slate-900">{bill.bill_number}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Date:</span>{' '}
                <span className="font-mono text-slate-800">{formattedDate} {formattedTime}</span>
              </div>
              <div>
                <span className="text-slate-500">Cashier:</span>{' '}
                <span className="text-slate-800">{bill.created_by}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Payment:</span>{' '}
                <span className="font-semibold text-slate-900">{bill.payment_method}</span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="py-2.5 border-b border-dashed border-slate-300 bg-slate-50/80 px-2.5 rounded my-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-800">Customer: {bill.customer_name}</span>
                <span className="font-mono text-slate-700">{bill.customer_phone}</span>
              </div>
              {bill.phone_model && (
                <div className="text-slate-600 mt-0.5">
                  <span className="font-medium text-slate-700">Device/Model:</span> {bill.phone_model}
                </div>
              )}
              {bill.issue_notes && (
                <div className="text-slate-600 mt-0.5 italic">
                  <span className="font-medium text-slate-700 not-italic">Notes/Issue:</span> {bill.issue_notes}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="py-2 border-b-2 border-dashed border-slate-400">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-600 uppercase text-[10px]">
                    <th className="py-1">Item Description</th>
                    <th className="py-1 text-center">Box</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Price</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {bill.items.map((item, idx) => (
                    <tr key={idx} className="text-slate-800">
                      <td className="py-1.5 pr-1">
                        <div className="font-medium leading-tight">{item.item_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{item.item_code}</div>
                      </td>
                      <td className="py-1.5 text-center font-mono font-bold text-cyan-800 text-[11px]">
                        {item.box_number || '-'}
                      </td>
                      <td className="py-1.5 text-center font-mono">{item.quantity}</td>
                      <td className="py-1.5 text-right font-mono">
                        {item.unit_price.toFixed(2)}
                      </td>
                      <td className="py-1.5 text-right font-mono font-semibold">
                        {item.line_total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Calculation */}
            <div className="py-3 border-b-2 border-dashed border-slate-400 text-xs space-y-1">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-mono">{formatRupees(bill.subtotal, settings.currency_symbol)}</span>
              </div>
              {bill.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount:</span>
                  <span className="font-mono">
                    -{formatRupees(bill.discount, settings.currency_symbol)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-slate-900 pt-1 border-t border-slate-300">
                <span>NET TOTAL:</span>
                <span className="font-mono text-cyan-900">
                  {formatRupees(bill.net_total, settings.currency_symbol)}
                </span>
              </div>
              <div className="flex justify-between text-slate-700 pt-1">
                <span>Amount Paid:</span>
                <span className="font-mono">{formatRupees(bill.paid_amount, settings.currency_symbol)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-800">
                <span>Balance / Change:</span>
                <span className="font-mono">{formatRupees(bill.balance, settings.currency_symbol)}</span>
              </div>
            </div>

            {/* Barcode & Footer Notice */}
            <div className="pt-4 text-center space-y-2">
              <div className="font-mono tracking-[0.25em] text-slate-700 text-base select-none">
                |||| || | |||| || || | ||| ||||
              </div>
              <div className="text-[10px] font-mono text-slate-500">{bill.bill_number}</div>
              
              <div className="text-[10px] text-slate-600 leading-tight border-t border-slate-200 pt-2">
                <p className="font-medium text-slate-800">{settings.receipt_footer}</p>
                <p className="text-slate-500 mt-0.5">{settings.warranty_terms}</p>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                System Developed with Precision Dark Tech POS
              </p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Buttons */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#0f131c] border-t border-white/10">
          <div className="text-xs text-slate-400">
            Click <span className="text-cyan-400 font-medium">Print Bill</span> for thermal printer or A4/PDF output.
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

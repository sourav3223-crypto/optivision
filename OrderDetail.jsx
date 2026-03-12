import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, CreditCard, Check } from 'lucide-react';
import api from '../services/api';
import { StatusBadge, Modal, Spinner } from '../components/ui';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const STATUS_FLOW = ['CREATED', 'LENS_ORDERED', 'GRINDING', 'FITTING', 'READY', 'DELIVERED'];
const NEXT_MAP = { CREATED:'LENS_ORDERED', LENS_ORDERED:'GRINDING', GRINDING:'FITTING', FITTING:'READY', READY:'DELIVERED' };

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', method: 'CASH', note: '' });
  const [saving, setSaving] = useState(false);

  const load = () => api.get(`/orders/${id}`).then(r => setOrder(r.data.data)).finally(() => setLoading(false));
  useEffect(() => { load(); }, [id]);

  const advanceStatus = async () => {
    const next = NEXT_MAP[order.status];
    if (!next) return;
    try { await api.patch(`/orders/${id}/status`, { status: next }); toast.success(`→ ${next.replace('_', ' ')}`); load(); }
    catch { toast.error('Failed to update status'); }
  };

  const savePayment = async () => {
    if (!payForm.amount || Number(payForm.amount) <= 0) return toast.error('Enter valid amount');
    setSaving(true);
    try { await api.post(`/orders/${id}/payment`, payForm); toast.success('Payment recorded'); setPayModal(false); load(); }
    catch { toast.error('Failed to record payment'); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size={28} /></div>;
  if (!order) return <div className="text-center text-red-500 py-16">Order not found</div>;

  const curIdx = STATUS_FLOW.indexOf(order.status);
  const nextStatus = NEXT_MAP[order.status];

  return (
    <div>
      <button onClick={() => navigate('/orders')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-5 font-medium no-print">
        <ArrowLeft size={15} /> Back to Orders
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="font-mono font-bold text-xl text-primary-700">{order.orderNumber}</h1>
            <StatusBadge status={order.status} />
            <StatusBadge status={order.paymentStatus} />
          </div>
          <p className="text-sm text-slate-500">
            {format(new Date(order.createdAt), 'MMM d, yyyy · h:mm a')} · by {order.staff?.name}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap no-print">
          <button onClick={() => window.print()} className="btn-secondary btn-md"><Printer size={15} /> Print</button>
          {order.balanceAmount > 0 && (
            <button onClick={() => { setPayForm({ amount: String(order.balanceAmount), method: 'CASH', note: '' }); setPayModal(true); }}
              className="btn-success btn-md"><CreditCard size={15} /> Collect {fmt(order.balanceAmount)}</button>
          )}
          {nextStatus && (
            <button onClick={advanceStatus} className="btn-primary btn-md">→ {nextStatus.replace('_', ' ')}</button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Progress timeline */}
          {order.status !== 'CANCELLED' && (
            <div className="card p-5 no-print">
              <h3 className="font-bold text-slate-800 mb-4 text-sm">Order Progress</h3>
              <div className="flex items-start">
                {STATUS_FLOW.map((s, i) => {
                  const done = i <= curIdx;
                  const cur = i === curIdx;
                  return (
                    <div key={s} className="flex items-center flex-1">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all flex-shrink-0
                          ${done ? (cur ? 'bg-primary-600 text-white ring-4 ring-primary-100' : 'bg-emerald-500 text-white') : 'bg-slate-100 text-slate-400'}`}>
                          {done && !cur ? <Check size={12} /> : i + 1}
                        </div>
                        <div className={`text-[10px] font-semibold text-center leading-tight ${cur ? 'text-primary-600' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {s.replace('_', '\n')}
                        </div>
                      </div>
                      {i < STATUS_FLOW.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-1 mb-5 ${i < curIdx ? 'bg-emerald-400' : 'bg-slate-100'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Items table */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold text-slate-800 text-sm">Order Items</h3></div>
            <table className="tbl">
              <thead><tr><th>Item</th><th>Type</th><th className="text-right">Qty</th><th className="text-right">Unit Price</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {order.items.map(item => (
                  <tr key={item.id}>
                    <td className="font-semibold text-slate-800">{item.name}</td>
                    <td><span className="badge-gray badge capitalize">{item.itemType}</span></td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right text-slate-500">{fmt(item.unitPrice)}</td>
                    <td className="text-right font-semibold">{fmt(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Bill summary */}
            <div className="px-5 py-4 border-t border-slate-100 space-y-2 bg-slate-50/50">
              {[
                ['Subtotal', fmt(order.subtotal)],
                order.discountAmount > 0 ? ['Discount', `−${fmt(order.discountAmount)}`] : null,
                [`GST ${order.taxPct}%`, fmt(order.taxAmount)],
              ].filter(Boolean).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm text-slate-600"><span>{k}</span><span>{v}</span></div>
              ))}
              <div className="flex justify-between font-bold text-base border-t border-slate-200 pt-2">
                <span>Total</span><span>{fmt(order.totalAmount)}</span>
              </div>
              {order.advanceAmount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600 font-semibold">
                  <span>Advance Paid</span><span>{fmt(order.advanceAmount)}</span>
                </div>
              )}
              {order.balanceAmount > 0 && (
                <div className="flex justify-between text-sm text-red-600 font-bold">
                  <span>Balance Due</span><span>{fmt(order.balanceAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Prescription */}
          {order.prescription && (
            <div className="card p-5">
              <h3 className="font-bold text-slate-800 mb-3 text-sm">Prescription</h3>
              <table className="w-full text-sm border border-slate-100 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-primary-50">
                    <th className="px-4 py-2 text-left text-xs text-slate-500">Field</th>
                    <th className="px-4 py-2 text-center text-xs text-primary-700">Right Eye (OD)</th>
                    <th className="px-4 py-2 text-center text-xs text-primary-700 border-l border-primary-100">Left Eye (OS)</th>
                  </tr>
                </thead>
                <tbody>
                  {[['SPH', 'rightSph', 'leftSph'], ['CYL', 'rightCyl', 'leftCyl'], ['AXIS', 'rightAxis', 'leftAxis'], ['ADD', 'rightAdd', 'leftAdd'], ['PD', 'rightPd', 'leftPd']].map(([l, r, le]) => (
                    <tr key={l} className="border-t border-slate-100">
                      <td className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50">{l}</td>
                      <td className="px-4 py-2 text-center font-mono text-sm">{order.prescription[r] ?? (l === 'PD' ? order.prescription.pd : null) ?? '—'}</td>
                      <td className="px-4 py-2 text-center font-mono text-sm border-l border-slate-100">{order.prescription[le] ?? (l === 'PD' ? order.prescription.pd : null) ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {order.prescription.doctorName && <p className="text-xs text-slate-400 mt-2">Dr. {order.prescription.doctorName}</p>}
            </div>
          )}

          {/* Payment history */}
          {order.payments?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold text-slate-800 text-sm">Payment History</h3></div>
              <table className="tbl">
                <thead><tr><th>Date</th><th>Method</th><th>Reference</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  {order.payments.map(p => (
                    <tr key={p.id}>
                      <td className="text-xs text-slate-500">{format(new Date(p.paidAt), 'MMM d, yyyy h:mm a')}</td>
                      <td><span className="badge-blue badge">{p.method}</span></td>
                      <td className="text-xs text-slate-400">{p.reference || p.note || '—'}</td>
                      <td className="text-right font-semibold text-emerald-600">{fmt(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Customer */}
          <div className="card p-5">
            <h3 className="font-bold text-slate-800 mb-3 text-sm">Customer</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)' }}>
                {order.customer?.name?.[0]}
              </div>
              <div>
                <div className="font-semibold text-slate-800 text-sm">{order.customer?.name}</div>
                <div className="text-xs text-slate-500">{order.customer?.phone}</div>
              </div>
            </div>
            {order.customer?.email && <div className="text-xs text-slate-500 mb-1">📧 {order.customer.email}</div>}
            {order.customer?.address && <div className="text-xs text-slate-500">📍 {order.customer.address}</div>}
          </div>

          {/* Order Info */}
          <div className="card p-5">
            <h3 className="font-bold text-slate-800 mb-3 text-sm">Order Info</h3>
            <div className="space-y-2 text-sm">
              {[
                ['Payment', order.paymentMethod],
                ['Created', format(new Date(order.createdAt), 'MMM d, yyyy')],
                order.deliveryDate ? ['Delivery', format(new Date(order.deliveryDate), 'MMM d, yyyy')] : null,
                order.deliveredAt ? ['Delivered', format(new Date(order.deliveredAt), 'MMM d, yyyy')] : null,
              ].filter(Boolean).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-medium text-slate-800">{v}</span>
                </div>
              ))}
            </div>
            {order.notes && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800">
                📝 {order.notes}
              </div>
            )}
          </div>

          {/* Status log */}
          {order.statusLogs?.length > 0 && (
            <div className="card p-5 no-print">
              <h3 className="font-bold text-slate-800 mb-3 text-sm">Status Timeline</h3>
              <div className="space-y-2.5">
                {order.statusLogs.map((log, i) => (
                  <div key={log.id} className="flex items-start gap-2.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${i === 0 ? 'bg-primary-600' : 'bg-slate-300'}`} />
                    <div>
                      <div className="text-xs font-semibold text-slate-700">{log.status.replace('_', ' ')}</div>
                      <div className="text-xs text-slate-400">{format(new Date(log.changedAt), 'MMM d, h:mm a')}</div>
                      {log.note && <div className="text-xs text-slate-500 mt-0.5">{log.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment modal */}
      <Modal open={payModal} onClose={() => setPayModal(false)} title="Record Payment"
        footer={<>
          <button className="btn-secondary btn-md" onClick={() => setPayModal(false)}>Cancel</button>
          <button className="btn-success btn-md" onClick={savePayment} disabled={saving}>{saving ? 'Saving…' : 'Record Payment'}</button>
        </>}>
        <div className="space-y-4">
          <div>
            <label className="field-label">Amount ₹</label>
            <input className="field-input" type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} />
          </div>
          <div>
            <label className="field-label">Method</label>
            <div className="grid grid-cols-3 gap-2">
              {['CASH', 'UPI', 'CARD'].map(m => (
                <button key={m} onClick={() => setPayForm(f => ({ ...f, method: m }))}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${payForm.method === m ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                  {m === 'CASH' ? '💵' : m === 'UPI' ? '📱' : '💳'} {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label">Note / Reference</label>
            <input className="field-input" value={payForm.note} onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} placeholder="UPI ref / cheque no." />
          </div>
        </div>
      </Modal>
    </div>
  );
}

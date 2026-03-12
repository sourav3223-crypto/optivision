import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import api from '../services/api';
import { PageHeader, StatusBadge, Spinner, Empty, SearchInput } from '../components/ui';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const fmt = n => `₹${Number(n||0).toLocaleString('en-IN')}`;
const STATUSES = ['','CREATED','LENS_ORDERED','GRINDING','FITTING','READY','DELIVERED','CANCELLED'];
const STATUS_LABELS = { '':'All', CREATED:'Created', LENS_ORDERED:'Lens Ordered', GRINDING:'Grinding', FITTING:'Fitting', READY:'Ready', DELIVERED:'Delivered', CANCELLED:'Cancelled' };

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = async (q = '', s = '', p = 1) => {
    setLoading(true);
    try {
      const r = await api.get('/orders', { params: { search: q, status: s, page: p, limit: 20 } });
      setOrders(r.data.data);
      setTotal(r.data.pagination.total);
    } catch (e) { toast.error('Failed'); }
    setLoading(false);
  };

  useEffect(() => { load(search, statusFilter, page); }, []);
  useEffect(() => { const t = setTimeout(() => load(search, statusFilter, 1), 350); return () => clearTimeout(t); }, [search, statusFilter]);

  const advanceStatus = async (id, status) => {
    const NEXT = { CREATED:'LENS_ORDERED', LENS_ORDERED:'GRINDING', GRINDING:'FITTING', FITTING:'READY', READY:'DELIVERED' };
    const next = NEXT[status];
    if (!next) return;
    try {
      await api.patch(`/orders/${id}/status`, { status: next });
      toast.success(`→ ${next.replace('_',' ')}`);
      load(search, statusFilter, page);
    } catch (e) { toast.error('Error'); }
  };

  return (
    <div>
      <PageHeader title="Orders" subtitle={`${total} total orders`}
        action={<button className="btn-primary btn-md" onClick={() => navigate('/orders/new')}><Plus size={15}/> New Order</button>}/>

      {/* Status tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${statusFilter === s ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-primary-300'}`}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by order #, customer name…" className="max-w-sm"/>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={28}/></div>
      ) : orders.length === 0 ? (
        <div className="card"><Empty icon="📋" title="No orders found" desc="Create a new order to get started"/></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead>
              <tr>
                <th>Order #</th><th>Customer</th><th>Frame / Lens</th><th>Amount</th>
                <th>Payment</th><th>Status</th><th>Delivery</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => {
                const NEXT = { CREATED:'LENS_ORDERED', LENS_ORDERED:'GRINDING', GRINDING:'FITTING', FITTING:'READY', READY:'DELIVERED' };
                const nextStatus = NEXT[o.status];
                return (
                  <tr key={o.id} className="cursor-pointer" onClick={() => navigate(`/orders/${o.id}`)}>
                    <td><span className="font-mono text-primary-600 font-semibold text-xs">{o.orderNumber}</span></td>
                    <td>
                      <div className="font-semibold text-slate-800 text-sm">{o.customer?.name}</div>
                      <div className="text-xs text-slate-400">{o.customer?.phone}</div>
                    </td>
                    <td className="max-w-[180px]">
                      <div className="text-xs text-slate-600 truncate">{o.frameDetails}</div>
                      <div className="text-xs text-slate-400 truncate">{o.lensDetails}</div>
                    </td>
                    <td>
                      <div className="font-semibold text-slate-800">{fmt(o.totalAmount)}</div>
                      {o.balanceAmount > 0 && <div className="text-xs text-red-500">Due: {fmt(o.balanceAmount)}</div>}
                    </td>
                    <td><StatusBadge status={o.paymentStatus}/></td>
                    <td><StatusBadge status={o.status}/></td>
                    <td className="text-xs text-slate-500">{o.deliveryDate ? format(new Date(o.deliveryDate),'MMM d') : '—'}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        <button className="btn-ghost btn-xs" onClick={() => navigate(`/orders/${o.id}`)}>View</button>
                        {nextStatus && (
                          <button className="btn-success btn-xs" onClick={() => advanceStatus(o.id, o.status)}>
                            → {nextStatus.replace('_',' ')}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

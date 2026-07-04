import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Batches() {
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ product_id: '', quantity: 1, expiration_date: '' });

  const load = () => {
    setLoading(true);
    const params = activeTab === 'expiring' ? { expiring: 'true' } : {};
    Promise.all([
      api.getBatches(params),
      api.getProducts()
    ]).then(([b, p]) => {
      setBatches(b);
      setProducts(p);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [activeTab]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.createBatch({ ...form, product_id: Number(form.product_id), quantity: Number(form.quantity) });
      setShowForm(false);
      setForm({ product_id: '', quantity: 1, expiration_date: '' });
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExpire = async (id) => {
    if (!confirm('Mark this batch as expired? Stock will be removed.')) return;
    await api.expireBatch(id).catch(err => alert(err.message));
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this batch permanently? Stock will be removed.')) return;
    await api.deleteBatch(id).catch(err => alert(err.message));
    load();
  };

  const today = new Date();
  const in7Days = new Date(today.getTime() + 7 * 86400000);

  const getStatus = (expDate) => {
    const d = new Date(expDate);
    if (d < today) return { label: 'Expired', class: 'bg-red-100 text-red-800' };
    if (d <= in7Days) return { label: 'Expiring Soon', class: 'bg-amber-100 text-amber-800' };
    return { label: 'Good', class: 'bg-green-100 text-green-800' };
  };

  const getDaysLeft = (expDate) => {
    const diff = Math.ceil((new Date(expDate) - today) / 86400000);
    if (diff < 0) return `${Math.abs(diff)}d ago`;
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `${diff} days`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Batches & Expiration</h2>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-fresh-600 text-white rounded-lg hover:bg-fresh-700 text-sm font-medium">
          {showForm ? 'Cancel' : '+ New Batch'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <h3 className="font-semibold">Add New Batch</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">Product</label>
              <select required value={form.product_id} onChange={e => setForm({...form, product_id: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Select...</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Quantity</label>
              <input required type="number" min="1" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm mb-1">Expiration Date</label>
              <input required type="date" value={form.expiration_date} onChange={e => setForm({...form, expiration_date: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <button type="submit" className="px-4 py-2 bg-fresh-600 text-white rounded-lg text-sm font-medium">Add Batch</button>
        </form>
      )}

      <div className="flex gap-2">
        <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'all' ? 'bg-fresh-600 text-white' : 'bg-gray-100 text-gray-700'}`}>All Batches</button>
        <button onClick={() => setActiveTab('expiring')} className={`px-4 py-2 rounded-lg text-sm font-medium ${activeTab === 'expiring' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Expiring Soon</button>
      </div>

      {loading ? (<div className="text-center py-12 text-gray-500">Loading...</div>) : batches.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No batches found</div>
      ) : (
        <div className="grid gap-3">
          {batches.map(b => {
            const status = getStatus(b.expiration_date);
            return (
              <div key={b.id} className={`card border-l-4 ${status.label === 'Expired' ? 'border-l-red-500' : status.label === 'Expiring Soon' ? 'border-l-amber-500' : 'border-l-green-500'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{b.product_name}</h3>
                      <span className={`badge ${status.class}`}>{status.label}</span>
                    </div>
                    <p className="text-xs text-gray-500">SKU: {b.sku} | {getDaysLeft(b.expiration_date)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold">{b.quantity}</div>
                      <div className="text-xs text-gray-500">Units</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-medium">{b.expiration_date}</div>
                      <div className="text-xs text-gray-500">Expires</div>
                    </div>
                    <div className="flex gap-1">
                      {status.label !== 'Expired' && b.quantity > 0 && (
                        <button onClick={() => handleExpire(b.id)} className="px-3 py-1 text-xs bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200">Expire</button>
                      )}
                      <button onClick={() => handleDelete(b.id)} className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded-lg hover:bg-red-200">Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
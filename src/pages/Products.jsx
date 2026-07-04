import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';

const emptyProduct = { sku: '', name: '', category: '', unit: 'each', current_stock: 0, min_stock: 10, price: 0 };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [detail, setDetail] = useState(null);

  const loadProducts = useCallback(() => {
    const params = {};
    if (search) params.search = search;
    if (categoryFilter) params.category = categoryFilter;
    api.getProducts(params).then(setProducts).catch(() => {});
  }, [search, categoryFilter]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getProducts().then(setProducts),
      api.getCategories().then(setCategories),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.updateProduct(editId, form);
      } else {
        await api.createProduct(form);
      }
      setShowForm(false);
      setEditId(null);
      setForm(emptyProduct);
      loadProducts();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product and all associated data?')) return;
    await api.deleteProduct(id);
    loadProducts();
    setDetail(null);
  };

  const openEdit = (p) => {
    setForm({ sku: p.sku, name: p.name, category: p.category || '', unit: p.unit, current_stock: p.current_stock, min_stock: p.min_stock, price: p.price });
    setEditId(p.id);
    setShowForm(true);
    setDetail(null);
  };

  const viewDetail = async (id) => {
    try {
      const d = await api.getProduct(id);
      setDetail(d);
    } catch (err) {
      alert(err.message);
    }
  };

  if (detail) {
    return (
      <div className="space-y-4">
        <button onClick={() => setDetail(null)} className="text-fresh-600 hover:underline">&larr; Back to Products</button>
        <div className="card">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">{detail.name}</h2>
              <p className="text-gray-500 text-sm">SKU: {detail.sku} | Category: {detail.category || 'N/A'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(detail)} className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">Edit</button>
              <button onClick={() => handleDelete(detail.id)} className="px-3 py-1 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100">Delete</button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div><span className="text-gray-500 text-sm">Stock</span><p className="text-lg font-bold">{detail.current_stock} {detail.unit}</p></div>
            <div><span className="text-gray-500 text-sm">Min Stock</span><p className="text-lg font-bold">{detail.min_stock}</p></div>
            <div><span className="text-gray-500 text-sm">Price</span><p className="text-lg font-bold">${Number(detail.price).toFixed(2)}</p></div>
            <div><span className="text-gray-500 text-sm">Status</span><p className="text-lg font-bold">{detail.current_stock < detail.min_stock ? '⚠️ Low' : '✅ OK'}</p></div>
          </div>
        </div>

        {detail.batches && detail.batches.length > 0 && (
          <div className="card">
            <h3 className="font-semibold mb-3">Batches ({detail.batches.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Qty</th><th className="pb-2">Expiration</th><th className="pb-2">Received</th><th className="pb-2">Status</th></tr></thead>
                <tbody>
                  {detail.batches.map(b => {
                    const expiring = new Date(b.expiration_date) <= new Date(Date.now() + 7*86400000) && new Date(b.expiration_date) >= new Date();
                    const expired = new Date(b.expiration_date) < new Date();
                    return (
                      <tr key={b.id} className="border-b last:border-0">
                        <td className="py-2">{b.quantity} {detail.unit}</td>
                        <td className="py-2">{b.expiration_date}</td>
                        <td className="py-2">{b.received_date}</td>
                        <td className="py-2">
                          {b.quantity === 0 ? <span className="badge bg-gray-100 text-gray-600">Depleted</span> :
                           expired ? <span className="badge bg-red-100 text-red-800">Expired</span> :
                           expiring ? <span className="badge bg-amber-100 text-amber-800">Expiring Soon</span> :
                           <span className="badge bg-green-100 text-green-800">Good</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {detail.movements && detail.movements.length > 0 && (
          <div className="card">
            <h3 className="font-semibold mb-3">Recent Movements</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-gray-500 border-b"><th className="pb-2">Type</th><th className="pb-2">Qty</th><th className="pb-2">Notes</th><th className="pb-2">Date</th></tr></thead>
                <tbody>
                  {detail.movements.map(m => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-2"><span className={`badge ${m.type === 'in' ? 'bg-green-100 text-green-800' : m.type === 'out' ? 'bg-blue-100 text-blue-800' : m.type === 'expired' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{m.type}</span></td>
                      <td className="py-2">{m.quantity}</td>
                      <td className="py-2 text-gray-500">{m.notes || '-'}</td>
                      <td className="py-2 text-gray-500">{new Date(m.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Products</h2>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyProduct); }} className="tablet-btn bg-fresh-600 hover:bg-fresh-700">
          {showForm ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h3 className="font-semibold">{editId ? 'Edit Product' : 'Add New Product'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
              <input required value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fresh-500 focus:border-fresh-500" placeholder="e.g. MILK-001" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fresh-500 focus:border-fresh-500" placeholder="Product name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-fresh-500 focus:border-fresh-500" placeholder="e.g. Dairy" list="categories" />
              <datalist id="categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full px-3 py-2 border rounded-lg">
                <option value="each">Each</option>
                <option value="lb">Pound (lb)</option>
                <option value="oz">Ounce (oz)</option>
                <option value="gallon">Gallon</option>
                <option value="half-gallon">Half Gallon</option>
                <option value="quart">Quart</option>
                <option value="container">Container</option>
                <option value="bottle">Bottle</option>
                <option value="case">Case</option>
                <option value="loaf">Loaf</option>
                <option value="dozen">Dozen</option>
                <option value="head">Head</option>
                <option value="package">Package</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
              <input type="number" min="0" value={form.current_stock} onChange={e => setForm({...form, current_stock: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
              <input type="number" min="0" value={form.min_stock} onChange={e => setForm({...form, min_stock: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
              <input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm({...form, price: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>
          <button type="submit" className="tablet-btn bg-fresh-600 hover:bg-fresh-700">{editId ? 'Update' : 'Create'} Product</button>
        </form>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or SKU..."
          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-fresh-500"
        />
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="px-4 py-2 border rounded-lg">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Products Table */}
      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 bg-gray-50 border-b">
              <th className="p-3 font-medium">SKU</th>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium hidden md:table-cell">Category</th>
              <th className="p-3 font-medium">Stock</th>
              <th className="p-3 font-medium hidden sm:table-cell">Min</th>
              <th className="p-3 font-medium hidden sm:table-cell">Price</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-3 font-mono text-xs">{p.sku}</td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-gray-500 hidden md:table-cell">{p.category || '-'}</td>
                <td className="p-3">
                  <span className={p.current_stock < p.min_stock ? 'text-red-600 font-bold' : ''}>{p.current_stock}</span>
                </td>
                <td className="p-3 text-gray-500 hidden sm:table-cell">{p.min_stock}</td>
                <td className="p-3 hidden sm:table-cell">${Number(p.price).toFixed(2)}</td>
                <td className="p-3">
                  {p.current_stock < p.min_stock ? (
                    <span className="badge bg-red-100 text-red-800">Low</span>
                  ) : (
                    <span className="badge bg-green-100 text-green-800">OK</span>
                  )}
                </td>
                <td className="p-3">
                  <button onClick={() => viewDetail(p.id)} className="text-fresh-600 hover:underline text-xs">View</button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan="8" className="p-8 text-center text-gray-400">No products found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
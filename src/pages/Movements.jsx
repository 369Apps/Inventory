import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Movements() {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = () => {
    setLoading(true);
    api.getMovements()
      .then(setMovements)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? movements : movements.filter(m => m.type === filter);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800">Stock Movements</h2>

      <div className="flex gap-2">
        {['all', 'in', 'out', 'expired', 'adjustment'].map(t => (
          <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${filter === t ? 'bg-fresh-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{t}</button>
        ))}
      </div>

      {loading ? <div className="text-center py-12 text-gray-500">Loading...</div> : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 bg-gray-50 border-b">
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Product</th>
                <th className="p-3 font-medium">Type</th>
                <th className="p-3 font-medium">Quantity</th>
                <th className="p-3 font-medium hidden sm:table-cell">SKU</th>
                <th className="p-3 font-medium hidden md:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-3 text-gray-500 whitespace-nowrap">{new Date(m.created_at).toLocaleDateString()}</td>
                  <td className="p-3 font-medium">{m.product_name}</td>
                  <td className="p-3">
                    <span className={`badge ${
                      m.type === 'in' ? 'bg-green-100 text-green-800' :
                      m.type === 'out' ? 'bg-blue-100 text-blue-800' :
                      m.type === 'expired' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>{m.type}</span>
                  </td>
                  <td className="p-3 font-bold">{m.quantity}</td>
                  <td className="p-3 text-gray-500 font-mono text-xs hidden sm:table-cell">{m.sku}</td>
                  <td className="p-3 text-gray-500 hidden md:table-cell">{m.notes || '-'}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-400">No movements found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
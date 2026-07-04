import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Reorders() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ordered, setOrdered] = useState({});

  const load = () => {
    setLoading(true);
    api.getReorders()
      .then(setSuggestions)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleMarkOrdered = async (id) => {
    try {
      const res = await api.markOrdered(id);
      setOrdered(prev => ({ ...prev, [id]: res.ordered }));
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const totalReorder = suggestions.reduce((sum, p) => sum + (p.min_stock - p.current_stock), 0);
  const estimatedCost = suggestions.reduce((sum, p) => sum + (p.min_stock - p.current_stock) * p.price, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Reorders</h2>
      </div>

      {suggestions.length > 0 && (
        <div className="card bg-amber-50 border-amber-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><div className="text-sm text-amber-700">Items to Reorder</div><div className="text-2xl font-bold text-amber-800">{suggestions.length}</div></div>
            <div><div className="text-sm text-amber-700">Total Units Needed</div><div className="text-2xl font-bold text-amber-800">{totalReorder}</div></div>
            <div><div className="text-sm text-amber-700">Est. Cost</div><div className="text-2xl font-bold text-amber-800">${estimatedCost.toFixed(2)}</div></div>
            <div><div className="text-sm text-amber-700">Stockout Risk</div><div className="text-2xl font-bold text-amber-800">{suggestions.filter(p => p.current_stock === 0).length} items</div></div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : suggestions.length === 0 ? (
        <div className="card text-center py-8">
          <div className="text-4xl mb-3">✅</div>
          <p className="text-gray-500">All products are well-stocked!</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {suggestions.map(p => (
            <div key={p.id} className={`card ${p.current_stock === 0 ? 'border-red-300 bg-red-50' : 'border-amber-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{p.name}</h3>
                    {p.current_stock === 0 && <span className="badge bg-red-100 text-red-800">Out of Stock</span>}
                  </div>
                  <p className="text-xs text-gray-500">{p.sku} | {p.category || 'N/A'} | Min: {p.min_stock}</p>
                </div>
                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Current</div>
                    <div className={`text-lg font-bold ${p.current_stock === 0 ? 'text-red-600' : 'text-amber-600'}`}>{p.current_stock}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">To Order</div>
                    <div className="text-lg font-bold text-fresh-600">{p.reorder_qty}</div>
                  </div>
                  <button
                    onClick={() => handleMarkOrdered(p.id)}
                    disabled={ordered[p.id]}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                      ordered[p.id] ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-fresh-600 text-white hover:bg-fresh-700'
                    }`}
                  >
                    {ordered[p.id] ? `✓ Ordered ${ordered[p.id]}` : 'Mark Ordered'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getDashboard()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading dashboard...</div>;
  if (error) return <div className="text-center py-12 text-red-500">Error: {error.message}</div>;
  if (!data) return null;

  const stats = [
    { label: 'Total Products', value: data.totalProducts, color: 'bg-blue-50 text-blue-700', icon: '📦' },
    { label: 'Low Stock Items', value: data.lowStock, color: 'bg-amber-50 text-amber-700', icon: '⚠️' },
    { label: 'Expiring Soon', value: data.expiringSoon, color: 'bg-red-50 text-red-700', icon: '⏰' },
    { label: 'Inventory Value', value: `$${Number(data.totalValue).toFixed(2)}`, color: 'bg-green-50 text-green-700', icon: '💰' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className={`card ${s.color}`}>
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm mt-1 opacity-80">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">⚠️ Low Stock Alerts</h3>
            <Link to="/movements" className="text-sm text-fresh-600 hover:underline">View All</Link>
          </div>
          {data.lowStockProducts.length === 0 ? (
            <p className="text-gray-400 text-sm">No low stock items</p>
          ) : (
            <div className="space-y-2">
              {data.lowStockProducts.map(p => (
                <Link key={p.id} to={`/products/${p.id}`} className="block p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium text-gray-800">{p.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{p.sku}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-600">{p.current_stock} {p.unit}</div>
                      <div className="text-xs text-gray-500">Min: {p.min_stock}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Expiring Soon */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">⏰ Expiring Within 7 Days</h3>
            <Link to="/batches" className="text-sm text-fresh-600 hover:underline">View All</Link>
          </div>
          {data.expiringBatches.length === 0 ? (
            <p className="text-gray-400 text-sm">No items expiring soon</p>
          ) : (
            <div className="space-y-2">
              {data.expiringBatches.map(b => (
                <div key={b.id} className="p-3 bg-red-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium text-gray-800">{b.product_name}</span>
                      <span className="text-xs text-gray-500 ml-2">{b.sku}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-red-600">{b.quantity} left</div>
                      <div className="text-xs text-gray-500">Exp: {b.expiration_date}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">📋 Recent Activity</h3>
        {data.recentMovements.length === 0 ? (
          <p className="text-gray-400 text-sm">No recent activity</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 font-medium">Product</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Qty</th>
                  <th className="pb-2 font-medium hidden sm:table-cell">Notes</th>
                  <th className="pb-2 font-medium hidden sm:table-cell">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentMovements.map(m => (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2">{m.product_name}</td>
                    <td className="py-2">
                      <span className={`badge ${
                        m.type === 'in' ? 'bg-green-100 text-green-800' :
                        m.type === 'out' ? 'bg-blue-100 text-blue-800' :
                        m.type === 'expired' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>{m.type}</span>
                    </td>
                    <td className="py-2">{m.quantity}</td>
                    <td className="py-2 text-gray-500 hidden sm:table-cell">{m.notes || '-'}</td>
                    <td className="py-2 text-gray-500 hidden sm:table-cell">{new Date(m.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
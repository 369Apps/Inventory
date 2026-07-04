import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/products', label: 'Products', icon: '📦' },
  { to: '/batches', label: 'Batches', icon: '⏰' },
  { to: '/reorders', label: 'Reorders', icon: '🔄' },
  { to: '/movements', label: 'Movements', icon: '📋' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navLink = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
      isActive ? 'bg-fresh-700 text-white' : 'text-fresh-200 hover:bg-fresh-700 hover:text-white'
    }`;

  return (
    <div className="min-h-screen flex flex-col sm:flex-row">
      {/* Mobile header bar */}
      <div className="sm:hidden bg-fresh-800 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🥦</span>
          <span className="font-bold text-lg">FreshFlow</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1">
          <span className="text-2xl">{sidebarOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        ${sidebarOpen ? 'block' : 'hidden'} sm:block
        bg-fresh-800 text-white w-full sm:w-56 sm:min-h-screen flex-shrink-0
      `}>
        <div className="hidden sm:flex items-center gap-2 px-5 py-5 border-b border-fresh-700">
          <span className="text-2xl">🥦</span>
          <div>
            <div className="font-bold text-lg">FreshFlow</div>
            <div className="text-xs text-fresh-300">Inventory</div>
          </div>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={navLink}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="hidden sm:block absolute bottom-0 left-0 right-0 p-4 text-xs text-fresh-400">
          FreshFlow v1.0
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="sm:hidden fixed inset-0 bg-black/50 z-10" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className="flex-1 bg-gray-50 min-h-screen overflow-auto">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
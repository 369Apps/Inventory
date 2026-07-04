import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Batches from './pages/Batches';
import Reorders from './pages/Reorders';
import Movements from './pages/Movements';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<Products />} />
        <Route path="/batches" element={<Batches />} />
        <Route path="/reorders" element={<Reorders />} />
        <Route path="/movements" element={<Movements />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
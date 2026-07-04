const API_BASE = '/api';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Products
  getProducts: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/products${qs ? '?' + qs : ''}`);
  },
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  getCategories: () => request('/categories'),

  // Batches
  getBatches: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/batches${qs ? '?' + qs : ''}`);
  },
  createBatch: (data) => request('/batches', { method: 'POST', body: JSON.stringify(data) }),
  deleteBatch: (id) => request(`/batches/${id}`, { method: 'DELETE' }),
  expireBatch: (id) => request(`/batches/${id}/expire`, { method: 'POST' }),
  getProductBatches: (id) => request(`/products/${id}/batches`),

  // Reorders
  getReorders: () => request('/reorders'),
  markOrdered: (id) => request(`/reorders/${id}`, { method: 'PUT' }),

  // Stock
  stockIn: (data) => request('/stock/in', { method: 'POST', body: JSON.stringify(data) }),
  stockOut: (data) => request('/stock/out', { method: 'POST', body: JSON.stringify(data) }),
  stockExpire: (data) => request('/stock/expire', { method: 'POST', body: JSON.stringify(data) }),

  // Movements
  getMovements: () => request('/movements'),
  createMovement: (data) => request('/movements', { method: 'POST', body: JSON.stringify(data) }),
};
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the Vite build output
app.use(express.static(path.join(__dirname, '..', 'dist')));

// ===================== API ROUTES =====================

// Dashboard stats
app.get('/api/dashboard', (req, res) => {
  const db = getDb();
  try {
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
    const lowStock = db.prepare("SELECT COUNT(*) as count FROM products WHERE current_stock < min_stock").get();
    const totalValue = db.prepare('SELECT SUM(current_stock * price) as total FROM products').get();
    
    const expiringSoon = db.prepare(`
      SELECT COUNT(*) as count FROM batches 
      WHERE expiration_date >= date('now') 
      AND expiration_date <= date('now', '+7 days')
      AND quantity > 0
    `).get();

    const recentMovements = db.prepare(`
      SELECT sm.*, p.name as product_name, p.sku 
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      ORDER BY sm.created_at DESC LIMIT 10
    `).all();

    const expiringBatches = db.prepare(`
      SELECT b.*, p.name as product_name, p.sku 
      FROM batches b
      JOIN products p ON p.id = b.product_id
      WHERE b.expiration_date >= date('now')
      AND b.expiration_date <= date('now', '+7 days')
      AND b.quantity > 0
      ORDER BY b.expiration_date ASC
      LIMIT 10
    `).all();

    const lowStockProducts = db.prepare(`
      SELECT * FROM products WHERE current_stock < min_stock ORDER BY (min_stock - current_stock) DESC LIMIT 10
    `).all();

    res.json({
      totalProducts: totalProducts.count,
      lowStock: lowStock.count,
      expiringSoon: expiringSoon.count,
      totalValue: totalValue.total || 0,
      recentMovements,
      expiringBatches,
      lowStockProducts,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Products CRUD
app.get('/api/products', (req, res) => {
  const db = getDb();
  try {
    const { search, category, low_stock } = req.query;
    let query = `
      SELECT p.*, 
        (SELECT COUNT(*) FROM batches WHERE product_id = p.id) as batch_count
      FROM products p
    `;
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(p.name LIKE ? OR p.sku LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
      conditions.push('p.category = ?');
      params.push(category);
    }
    if (low_stock === 'true') {
      conditions.push('p.current_stock < p.min_stock');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY p.name ASC';

    const products = db.prepare(query).all(...params);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', (req, res) => {
  const db = getDb();
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    const batches = db.prepare('SELECT * FROM batches WHERE product_id = ? ORDER BY expiration_date ASC').all(req.params.id);
    const movements = db.prepare(`
      SELECT sm.*, p.name as product_name FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      WHERE sm.product_id = ? ORDER BY sm.created_at DESC LIMIT 20
    `).all(req.params.id);
    
    res.json({ ...product, batches, movements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', (req, res) => {
  const db = getDb();
  try {
    const { sku, name, category, unit, current_stock, min_stock, price } = req.body;
    const result = db.prepare(`
      INSERT INTO products (sku, name, category, unit, current_stock, min_stock, price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sku, name, category || null, unit || 'each', current_stock || 0, min_stock || 10, price || 0);
    
    res.json({ id: result.lastInsertRowid, ...req.body });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  const db = getDb();
  try {
    const { name, category, unit, current_stock, min_stock, price } = req.body;
    db.prepare(`
      UPDATE products SET name=?, category=?, unit=?, current_stock=?, min_stock=?, price=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(name, category, unit, current_stock, min_stock, price, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  const db = getDb();
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get categories
app.get('/api/categories', (req, res) => {
  const db = getDb();
  try {
    const categories = db.prepare('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category').all();
    res.json(categories.map(c => c.category));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batches
app.get('/api/batches', (req, res) => {
  const db = getDb();
  try {
    const { product_id, expiring } = req.query;
    let query = `
      SELECT b.*, p.name as product_name, p.sku 
      FROM batches b
      JOIN products p ON p.id = b.product_id
      WHERE b.quantity > 0
    `;
    const params = [];
    
    if (product_id) {
      query += ' AND b.product_id = ?';
      params.push(product_id);
    }
    if (expiring === 'true') {
      query += " AND b.expiration_date >= date('now') AND b.expiration_date <= date('now', '+7 days')";
    }
    query += ' ORDER BY b.expiration_date ASC';
    
    res.json(db.prepare(query).all(...params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/batches', (req, res) => {
  const db = getDb();
  try {
    const { product_id, quantity, expiration_date, received_date } = req.body;
    const result = db.prepare(`
      INSERT INTO batches (product_id, quantity, expiration_date, received_date)
      VALUES (?, ?, ?, ?)
    `).run(product_id, quantity, expiration_date, received_date || new Date().toISOString().split('T')[0]);
    
    // Update product stock
    db.prepare('UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, product_id);
    
    // Log movement
    db.prepare('INSERT INTO stock_movements (product_id, batch_id, type, quantity, notes) VALUES (?, ?, ?, ?, ?)').run(product_id, result.lastInsertRowid, 'in', quantity, 'Batch received');
    
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete batch
app.delete('/api/batches/:id', (req, res) => {
  const db = getDb();
  try {
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    
    // Remove stock
    if (batch.quantity > 0) {
      db.prepare('UPDATE products SET current_stock = MAX(0, current_stock - ?) WHERE id = ?').run(batch.quantity, batch.product_id);
    }
    db.prepare('DELETE FROM batches WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get batches for a product
app.get('/api/products/:id/batches', (req, res) => {
  const db = getDb();
  try {
    const product = db.prepare('SELECT id, name, sku FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    const batches = db.prepare('SELECT * FROM batches WHERE product_id = ? ORDER BY expiration_date ASC').all(req.params.id);
    res.json({ ...product, batches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark batch as expired
app.post('/api/batches/:id/expire', (req, res) => {
  const db = getDb();
  try {
    const batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(req.params.id);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    
    const qty = batch.quantity;
    db.prepare('UPDATE batches SET quantity = 0 WHERE id = ?').run(req.params.id);
    db.prepare('UPDATE products SET current_stock = MAX(0, current_stock - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(qty, batch.product_id);
    db.prepare('INSERT INTO stock_movements (product_id, batch_id, type, quantity, notes) VALUES (?, ?, ?, ?, ?)').run(batch.product_id, req.params.id, 'expired', qty, 'Marked as expired');
    
    res.json({ success: true, removed: qty });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stock-specific endpoints
app.post('/api/stock/in', (req, res) => {
  const db = getDb();
  try {
    const { product_id, quantity, notes } = req.body;
    const result = db.prepare(`INSERT INTO stock_movements (product_id, type, quantity, notes) VALUES (?, ?, ?, ?)`).run(product_id, 'in', quantity, notes || 'Stock added');
    db.prepare('UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, product_id);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stock/out', (req, res) => {
  const db = getDb();
  try {
    const { product_id, quantity, notes } = req.body;
    const result = db.prepare(`INSERT INTO stock_movements (product_id, type, quantity, notes) VALUES (?, ?, ?, ?)`).run(product_id, 'out', quantity, notes || 'Stock removed');
    db.prepare('UPDATE products SET current_stock = MAX(0, current_stock - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, product_id);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/stock/expire', (req, res) => {
  const db = getDb();
  try {
    const { product_id, quantity, notes } = req.body;
    const result = db.prepare(`INSERT INTO stock_movements (product_id, type, quantity, notes) VALUES (?, ?, ?, ?)`).run(product_id, 'expired', quantity, notes || 'Marked as expired');
    db.prepare('UPDATE products SET current_stock = MAX(0, current_stock - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, product_id);
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Stock movements
app.get('/api/movements', (req, res) => {
  const db = getDb();
  try {
    const movements = db.prepare(`
      SELECT sm.*, p.name as product_name, p.sku 
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      ORDER BY sm.created_at DESC LIMIT 50
    `).all();
    res.json(movements);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/movements', (req, res) => {
  const db = getDb();
  try {
    const { product_id, type, quantity, notes } = req.body;
    const result = db.prepare(`
      INSERT INTO stock_movements (product_id, type, quantity, notes)
      VALUES (?, ?, ?, ?)
    `).run(product_id, type, quantity, notes || '');
    
    // Update stock
    if (type === 'in') {
      db.prepare('UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, product_id);
    } else if (type === 'out' || type === 'expired') {
      db.prepare('UPDATE products SET current_stock = MAX(0, current_stock - ?), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(quantity, product_id);
    }
    
    res.json({ id: result.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reorder suggestions
app.get('/api/reorders', (req, res) => {
  const db = getDb();
  try {
    const suggestions = db.prepare(`
      SELECT *, (min_stock - current_stock) as reorder_qty
      FROM products 
      WHERE current_stock < min_stock
      ORDER BY (min_stock - current_stock) DESC
    `).all();
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark reorder as ordered (adds stock)
app.put('/api/reorders/:id', (req, res) => {
  const db = getDb();
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    const reorderQty = product.min_stock - product.current_stock;
    const orderQty = Math.max(reorderQty, 1); // Order at least 1
    
    // Add stock
    db.prepare('UPDATE products SET current_stock = current_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(orderQty, req.params.id);
    
    // Log movement
    db.prepare('INSERT INTO stock_movements (product_id, type, quantity, notes) VALUES (?, ?, ?, ?)').run(req.params.id, 'in', orderQty, 'Reorder placed');
    
    res.json({ success: true, ordered: orderQty });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reorder', (req, res) => {
  const db = getDb();
  try {
    const suggestions = db.prepare(`
      SELECT *, (min_stock - current_stock) as reorder_qty
      FROM products 
      WHERE current_stock < min_stock
      ORDER BY (min_stock - current_stock) DESC
    `).all();
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Barcode lookup
app.get('/api/barcode/:sku', (req, res) => {
  const db = getDb();
  try {
    const product = db.prepare('SELECT * FROM products WHERE sku = ?').get(req.params.sku);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    
    const batches = db.prepare('SELECT * FROM batches WHERE product_id = ? AND quantity > 0 ORDER BY expiration_date ASC').all(product.id);
    res.json({ ...product, batches });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== SPA FALLBACK =====================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FreshFlow Inventory running on http://0.0.0.0:${PORT}`);
});
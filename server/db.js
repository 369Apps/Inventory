import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'freshflow.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
    seedData();
  }
  return db;
}

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      unit TEXT DEFAULT 'each',
      current_stock REAL DEFAULT 0,
      min_stock REAL DEFAULT 10,
      price REAL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      expiration_date TEXT NOT NULL,
      received_date TEXT DEFAULT (date('now')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      batch_id INTEGER,
      type TEXT NOT NULL CHECK(type IN ('in', 'out', 'expired', 'adjustment')),
      quantity REAL NOT NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL
    );
  `);
}

function seedData() {
  const count = db.prepare('SELECT COUNT(*) as c FROM products').get();
  if (count.c > 0) return;

  const insertProduct = db.prepare(`
    INSERT INTO products (sku, name, category, unit, current_stock, min_stock, price)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertBatch = db.prepare(`
    INSERT INTO batches (product_id, quantity, expiration_date, received_date)
    VALUES (?, ?, ?, ?)
  `);

  const insertMovement = db.prepare(`
    INSERT INTO stock_movements (product_id, type, quantity, notes)
    VALUES (?, ?, ?, ?)
  `);

  const products = [
    ['MILK-001', 'Whole Milk (Gallon)', 'Dairy', 'gallon', 45, 20, 4.99],
    ['MILK-002', 'Almond Milk (Half Gal)', 'Dairy', 'half-gallon', 12, 15, 3.49],
    ['BRD-001', 'Sourdough Bread', 'Bakery', 'loaf', 24, 10, 5.99],
    ['BRD-002', 'Wheat Bread', 'Bakery', 'loaf', 8, 10, 4.49],
    ['EGG-001', 'Eggs (Dozen)', 'Dairy', 'dozen', 60, 24, 3.99],
    ['VEG-001', 'Romaine Lettuce', 'Produce', 'head', 30, 20, 2.49],
    ['VEG-002', 'Tomatoes (lb)', 'Produce', 'lb', 8, 15, 1.99],
    ['FRT-001', 'Bananas (lb)', 'Produce', 'lb', 40, 20, 0.69],
    ['FRT-002', 'Strawberries (16oz)', 'Produce', 'container', 5, 12, 4.99],
    ['MT-001', 'Ground Beef (lb)', 'Meat', 'lb', 18, 10, 6.99],
    ['MT-002', 'Chicken Breast (lb)', 'Meat', 'lb', 22, 10, 7.99],
    ['DELI-001', 'Cheddar Cheese (8oz)', 'Deli', 'package', 14, 8, 4.49],
    ['DELI-002', 'Turkey Slices (lb)', 'Deli', 'lb', 6, 8, 8.99],
    ['BEV-001', 'Orange Juice (64oz)', 'Beverages', 'bottle', 20, 12, 5.49],
    ['BEV-002', 'Sparkling Water (12pk)', 'Beverages', 'case', 15, 10, 4.99],
  ];

  const today = new Date();
  const seedTransaction = db.transaction(() => {
    for (const [sku, name, category, unit, stock, min, price] of products) {
      const info = insertProduct.run(sku, name, category, unit, stock, min, price);
      const productId = info.lastInsertRowid;

      // Create 1-3 batches with varying expiration dates
      const batchCount = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < batchCount; i++) {
        const batchQty = Math.round(stock / batchCount);
        const expDays = 3 + Math.floor(Math.random() * 30);
        const expDate = new Date(today);
        expDate.setDate(expDate.getDate() + expDays);
        const recDate = new Date(today);
        recDate.setDate(recDate.getDate() - Math.floor(Math.random() * 14));

        insertBatch.run(productId, batchQty, expDate.toISOString().split('T')[0], recDate.toISOString().split('T')[0]);

        insertMovement.run(productId, 'in', batchQty, 'Initial stock - batch received');
      }
    }
  });

  seedTransaction();
  console.log('Database seeded with sample products, batches, and movements.');
}
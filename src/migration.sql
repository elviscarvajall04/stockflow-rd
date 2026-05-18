-- ============================================
-- StockFlow RD — Migración: ITBIS, NCF, Config
-- ============================================

-- Payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true
);
INSERT INTO payment_methods (name) VALUES
  ('efectivo'), ('tarjeta'), ('transferencia')
ON CONFLICT DO NOTHING;

-- Company settings
CREATE TABLE IF NOT EXISTS company_settings (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(200) NOT NULL DEFAULT 'Mi Empresa',
  commercial_name VARCHAR(200) DEFAULT '',
  rnc VARCHAR(20) NOT NULL DEFAULT '',
  phone VARCHAR(20) DEFAULT '',
  email VARCHAR(100) DEFAULT '',
  address TEXT DEFAULT '',
  logo_url TEXT DEFAULT '',
  default_itbis DECIMAL(5,2) DEFAULT 18.00,
  currency VARCHAR(10) DEFAULT 'RD$',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Solo insertar default si no hay ninguna fila
INSERT INTO company_settings (company_name, rnc)
SELECT 'Mi Empresa', ''
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

-- NCF sequences
CREATE TABLE IF NOT EXISTS ncf_sequences (
  id SERIAL PRIMARY KEY,
  type VARCHAR(10) NOT NULL UNIQUE,
  prefix VARCHAR(5) NOT NULL,
  current_number INTEGER NOT NULL DEFAULT 0,
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO ncf_sequences (type, prefix, current_number) VALUES
  ('B01', 'B01', 0), ('B02', 'B02', 0)
ON CONFLICT DO NOTHING;

-- ITBIS column on products
ALTER TABLE products ADD COLUMN IF NOT EXISTS itbis DECIMAL(5,2) DEFAULT 18.00;

-- Fiscal columns on sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS itbis_total DECIMAL(10,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS ncf VARCHAR(20) DEFAULT '';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS ncf_type VARCHAR(10) DEFAULT 'B02';
ALTER TABLE sales ADD COLUMN IF NOT EXISTS canceled BOOLEAN DEFAULT false;

-- ============================================
-- StockFlow RD — Migración: Compras + Proveedores
-- ============================================

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  rnc VARCHAR(20) DEFAULT '',
  phone VARCHAR(20) DEFAULT '',
  email VARCHAR(100) DEFAULT '',
  address TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchases (
  id SERIAL PRIMARY KEY,
  supplier_id INTEGER REFERENCES suppliers(id),
  user_id INTEGER REFERENCES users(id),
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  ncf VARCHAR(20) DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id SERIAL PRIMARY KEY,
  purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  quantity INTEGER NOT NULL,
  cost_price DECIMAL(10,2) NOT NULL
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id);

ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type VARCHAR(10) DEFAULT 'final';

-- Inventory movements (Kardex)
CREATE TABLE IF NOT EXISTS inventory_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  type VARCHAR(10) NOT NULL CHECK (type IN ('entry', 'exit', 'adjustment')),
  quantity INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  unit_cost DECIMAL(10,2) DEFAULT 0,
  reference_type VARCHAR(20) NOT NULL,
  reference_id INTEGER,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(created_at);

ALTER TABLE purchase_items ADD COLUMN IF NOT EXISTS applies_itbis BOOLEAN DEFAULT true;

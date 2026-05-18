-- ============================================
-- StockFlow RD — Core Schema (idempotent)
-- ============================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       VARCHAR(50) DEFAULT 'employee',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  email       VARCHAR(100),
  phone       VARCHAR(20),
  address     TEXT,
  client_type VARCHAR(10) DEFAULT 'final',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  price       DECIMAL(10,2) NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0,
  itbis       DECIMAL(5,2) DEFAULT 18.00,
  category_id INTEGER,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id        SERIAL PRIMARY KEY,
  name      VARCHAR(50) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true
);

-- Company settings
CREATE TABLE IF NOT EXISTS company_settings (
  id              SERIAL PRIMARY KEY,
  company_name    VARCHAR(200) NOT NULL DEFAULT 'Mi Empresa',
  commercial_name VARCHAR(200) DEFAULT '',
  rnc             VARCHAR(20) NOT NULL DEFAULT '',
  phone           VARCHAR(20) DEFAULT '',
  email           VARCHAR(100) DEFAULT '',
  address         TEXT DEFAULT '',
  logo_url        TEXT DEFAULT '',
  default_itbis   DECIMAL(5,2) DEFAULT 18.00,
  currency        VARCHAR(10) DEFAULT 'RD$',
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NCF sequences
CREATE TABLE IF NOT EXISTS ncf_sequences (
  id             SERIAL PRIMARY KEY,
  type           VARCHAR(10) NOT NULL UNIQUE,
  prefix         VARCHAR(5) NOT NULL,
  current_number INTEGER NOT NULL DEFAULT 0,
  valid_from     DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until    DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  rnc        VARCHAR(20) DEFAULT '',
  phone      VARCHAR(20) DEFAULT '',
  email      VARCHAR(100) DEFAULT '',
  address    TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
  id          SERIAL PRIMARY KEY,
  supplier_id INTEGER REFERENCES suppliers(id),
  user_id     INTEGER REFERENCES users(id),
  total       DECIMAL(10,2) NOT NULL DEFAULT 0,
  ncf         VARCHAR(20) DEFAULT '',
  notes       TEXT DEFAULT '',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Purchase items
CREATE TABLE IF NOT EXISTS purchase_items (
  id            SERIAL PRIMARY KEY,
  purchase_id   INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
  product_id    INTEGER REFERENCES products(id),
  quantity      INTEGER NOT NULL,
  cost_price    DECIMAL(10,2) NOT NULL,
  applies_itbis BOOLEAN DEFAULT true
);

-- Sales
CREATE TABLE IF NOT EXISTS sales (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id),
  client_id         INTEGER REFERENCES clients(id),
  total             DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal          DECIMAL(10,2) DEFAULT 0,
  itbis_total       DECIMAL(10,2) DEFAULT 0,
  ncf               VARCHAR(20) DEFAULT '',
  ncf_type          VARCHAR(10) DEFAULT 'B02',
  canceled          BOOLEAN DEFAULT false,
  payment_method    VARCHAR(50) DEFAULT 'efectivo',
  payment_method_id INTEGER REFERENCES payment_methods(id),
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sale items
CREATE TABLE IF NOT EXISTS sale_items (
  id         SERIAL PRIMARY KEY,
  sale_id    INTEGER NOT NULL REFERENCES sales(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL,
  price      DECIMAL(10,2) NOT NULL
);

-- Inventory movements (Kardex)
CREATE TABLE IF NOT EXISTS inventory_movements (
  id             SERIAL PRIMARY KEY,
  product_id     INTEGER NOT NULL REFERENCES products(id),
  type           VARCHAR(10) NOT NULL CHECK (type IN ('entry', 'exit', 'adjustment')),
  quantity       INTEGER NOT NULL,
  balance_after  INTEGER NOT NULL,
  unit_cost      DECIMAL(10,2) DEFAULT 0,
  reference_type VARCHAR(20) NOT NULL,
  reference_id   INTEGER,
  notes          TEXT DEFAULT '',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Foreign key: products.category_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'products_category_id_fkey'
  ) THEN
    ALTER TABLE products ADD CONSTRAINT products_category_id_fkey
      FOREIGN KEY (category_id) REFERENCES categories(id);
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_client ON sales(client_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);

-- Default data
INSERT INTO payment_methods (name) VALUES
  ('efectivo'), ('tarjeta'), ('transferencia')
ON CONFLICT DO NOTHING;

INSERT INTO ncf_sequences (type, prefix, current_number) VALUES
  ('B01', 'B01', 0), ('B02', 'B02', 0)
ON CONFLICT DO NOTHING;

INSERT INTO company_settings (company_name, rnc)
SELECT 'Mi Empresa', ''
WHERE NOT EXISTS (SELECT 1 FROM company_settings);

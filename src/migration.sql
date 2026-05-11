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

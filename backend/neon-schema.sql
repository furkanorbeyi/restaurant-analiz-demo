-- Neon PostgreSQL Schema for Restaurant Analytics
-- Run this in Neon SQL Editor after creating your database

-- Users table (if not using Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(10, 2) NOT NULL,
  menu_group TEXT NOT NULL,
  service_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_menu_group ON orders(menu_group);
CREATE INDEX IF NOT EXISTS idx_orders_item_name ON orders(item_name);

-- Row Level Security (optional, if you want RLS in Neon)
-- Note: Neon doesn't have built-in auth like Supabase, so RLS requires custom auth
-- For now, we'll rely on backend service-level security

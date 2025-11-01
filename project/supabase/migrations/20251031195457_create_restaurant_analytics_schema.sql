/*
  # Restaurant & Food Service Analytics Database Schema

  1. New Tables
    - `menu_items`
      - `id` (uuid, primary key)
      - `name` (text, item name like Pizza, Hamburger)
      - `menu_group` (text, category like Main Course, Dessert)
      - `created_at` (timestamptz)
    
    - `orders`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `menu_item_id` (uuid, references menu_items)
      - `menu_group` (text, for quick filtering)
      - `service_type` (text, e.g., Paket Servis, Yerinde Tüketim)
      - `item_name` (text, denormalized for performance)
      - `amount` (numeric, monetary value)
      - `order_date` (date)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for reading menu items (public data)

  3. Sample Data
    - Insert sample menu items for immediate use
*/

CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  menu_group text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  menu_item_id uuid REFERENCES menu_items(id),
  menu_group text NOT NULL,
  service_type text NOT NULL,
  item_name text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  order_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read menu items"
  ON menu_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own orders"
  ON orders FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO menu_items (name, menu_group) VALUES
  ('Pizza Margherita', 'Ana Yemek'),
  ('Pizza Pepperoni', 'Ana Yemek'),
  ('Hamburger Klasik', 'Ana Yemek'),
  ('Cheeseburger', 'Ana Yemek'),
  ('Tavuk Burger', 'Ana Yemek'),
  ('Makarna Carbonara', 'Ana Yemek'),
  ('Makarna Bolognese', 'Ana Yemek'),
  ('Sezar Salata', 'Salata'),
  ('Akdeniz Salata', 'Salata'),
  ('Patates Kızartması', 'Yan Ürün'),
  ('Soğan Halkası', 'Yan Ürün'),
  ('Tiramisu', 'Tatlı'),
  ('Cheesecake', 'Tatlı'),
  ('Brownie', 'Tatlı'),
  ('Kola', 'İçecek'),
  ('Limonata', 'İçecek'),
  ('Ayran', 'İçecek'),
  ('Çay', 'İçecek')
ON CONFLICT DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_menu_group ON orders(menu_group);
import urllib.request
import json

SUPABASE_URL = "https://qwxsnqeigqrslewqdjco.supabase.co"
ANON_KEY = "sb_publishable_p1hgv-jDE3SBZ5_MoaU_5Q_UYEsMl8h"

headers = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# SQL to create all tables
sql_statements = [
    """CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('passenger','driver','admin','staff')),
    name VARCHAR(50),
    avatar VARCHAR(255),
    car_plate VARCHAR(20),
    car_model VARCHAR(50),
    rating NUMERIC(2,1) DEFAULT 5.0,
    total_orders INTEGER DEFAULT 0,
    online BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);""",

    """CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    order_no VARCHAR(30) UNIQUE NOT NULL,
    passenger_id BIGINT REFERENCES users(id),
    driver_id BIGINT REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','ongoing','completed','cancelled')),
    from_addr TEXT NOT NULL,
    to_addr TEXT NOT NULL,
    from_lat NUMERIC(10,7),
    from_lng NUMERIC(10,7),
    to_lat NUMERIC(10,7),
    to_lng NUMERIC(10,7),
    distance NUMERIC(8,1),
    price NUMERIC(8,2),
    rating NUMERIC(2,1),
    review TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);""",

    """-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users: anyone can read, insert (for registration), update own
CREATE POLICY "Public read users" ON users FOR SELECT USING (true);
CREATE POLICY "Public insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Update own user" ON users FOR UPDATE USING (true);

-- Orders: anyone can read, insert, update
CREATE POLICY "Public read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Public insert orders" ON orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update orders" ON orders FOR UPDATE USING (true);

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- Insert test accounts
INSERT INTO users (phone, password, role, name) VALUES
('13800000001', '123456', 'passenger', '测试乘客'),
('13900000001', '123456', 'driver', '测试司机'),
('13700000001', '123456', 'admin', '管理员'),
('13700000002', '123456', 'staff', '客服小王')
ON CONFLICT (phone) DO NOTHING;"""
]

for i, sql in enumerate(sql_statements):
    body = json.dumps({"query": sql}).encode('utf-8')
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/rpc",
        data=body,
        headers=headers,
        method='POST'
    )
    try:
        resp = urllib.request.urlopen(req)
        print(f"SQL {i+1}: OK (status {resp.status})")
    except urllib.error.HTTPError as e:
        print(f"SQL {i+1}: Error {e.code}")
        print(e.read().decode('utf-8')[:500])
    except Exception as e:
        print(f"SQL {i+1}: {e}")

print("\nDone!")

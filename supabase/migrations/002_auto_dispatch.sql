-- 自动派单功能：司机位置表 + 订单派单字段

-- 1. 司机实时位置表
CREATE TABLE IF NOT EXISTS driver_locations (
  id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_locations_coords ON driver_locations(lat, lng);

-- 2. orders 表新增派单相关字段
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_to BIGINT REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dispatch_expires_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS auto_dispatched BOOLEAN DEFAULT FALSE;

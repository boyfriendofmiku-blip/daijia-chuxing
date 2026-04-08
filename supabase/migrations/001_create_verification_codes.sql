-- ================================================
-- 代驾出行 - 短信验证码表
-- 用于存储注册/登录时发送的验证码
-- ================================================

CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('register', 'login')),
  role TEXT DEFAULT 'passenger' CHECK (role IN ('passenger', 'driver', NULL)),
  used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引，加速查询
CREATE INDEX IF NOT EXISTS idx_vc_phone_type ON verification_codes(phone, type);
CREATE INDEX IF NOT EXISTS idx_vc_expires ON verification_codes(expires_at);

-- RLS 策略：任何人可读写（Edge Function 用 service_role 访问）
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

-- 允许所有人读写（Edge Function 后台处理即可）
CREATE POLICY "allow_all_vc" ON verification_codes
  FOR ALL USING (true) WITH CHECK (true);

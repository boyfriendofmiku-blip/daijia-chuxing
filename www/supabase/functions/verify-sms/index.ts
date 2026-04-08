/**
 * verify-sms Edge Function
 * 验证用户输入的验证码是否正确、是否过期
 *
 * 调用: POST /functions/v1/verify-sms
 * Body: { phone: "13800000001", code: "123456", type: "register"|"login" }
 *
 * 返回: { valid: true } | { valid: false, error: "错误原因" }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers });

  try {
    const { phone, code, type = 'register' } = await req.json();

    if (!phone || !code || !type) {
      return new Response(JSON.stringify({ valid: false, error: '参数不完整' }), { status: 400, headers });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    // 查找该手机号+type 最新一条未使用验证码
    const { data, error } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('phone', phone)
      .eq('type', type)
      .eq('used', false)
      .eq('code', code)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ valid: false, error: '验证码错误或已失效' }), { headers });
    }

    // 检查是否过期
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    if (now > expiresAt) {
      return new Response(JSON.stringify({ valid: false, error: '验证码已过期，请重新获取' }), { headers });
    }

    // 标记为已使用
    await supabase.from('verification_codes')
      .update({ used: true })
      .eq('id', data.id);

    return new Response(JSON.stringify({
      valid: true,
      role: data.role, // 注册时返回 role，前端可直接用
    }), { headers });

  } catch (err) {
    console.error('verify-sms error:', err);
    return new Response(JSON.stringify({ valid: false, error: err.message || '服务器异常' }), {
      status: 500, headers,
    });
  }
});

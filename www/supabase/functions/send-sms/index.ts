/**
 * send-sms Edge Function
 * 生成验证码 → 存入 Supabase → 调用腾讯云 SMS API 发送
 *
 * 调用: POST /functions/v1/send-sms
 * Body: { phone: "13800000001", type: "register"|"login", role: "passenger"|"driver" }
 *
 * 必需的环境变量（Supabase → Project Settings → Edge Functions → Secrets）:
 *   TENCENT_SMS_SECRET_ID    - 腾讯云 SecretId
 *   TENCENT_SMS_SECRET_KEY   - 腾讯云 SecretKey
 *   TENCENT_SMS_APP_ID       - 腾讯云 SMS SDK AppId
 *   TENCENT_SMS_TEMPLATE_ID  - 腾讯云短信模板ID
 *   TENCENT_SMS_SIGN_NAME    - 短信签名（如"代驾出行"）
 *   DEV_MODE = "true"        - 开发模式：不真实发短信，验证码打印到日志
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SMS_EXPIRY_MINUTES = 5;

// ============================================================
// 腾讯云 TC3-HMAC-SHA256 签名
// ============================================================
async function sha256Hex(data) {
  const d = data instanceof Uint8Array ? data : new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest('SHA-256', d);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key, msg) {
  const k = key instanceof Uint8Array ? key : new TextEncoder().encode(key);
  const sk = await crypto.subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', sk, new TextEncoder().encode(msg));
  return new Uint8Array(sig);
}

async function sendTencentSMS({ phone, code }) {
  const secretId = Deno.env.get('TENCENT_SMS_SECRET_ID');
  const secretKey = Deno.env.get('TENCENT_SMS_SECRET_KEY');
  const appId = Deno.env.get('TENCENT_SMS_APP_ID');
  const templateId = Deno.env.get('TENCENT_SMS_TEMPLATE_ID');
  const signName = Deno.env.get('TENCENT_SMS_SIGN_NAME') || '代驾出行';

  if (!secretId || !secretKey || !appId || !templateId) {
    throw new Error('腾讯云短信环境变量未配置完整');
  }

  const host = 'sms.tencentcloudapi.com';
  const service = 'sms';
  const version = '2021-01-11';
  const action = 'SendSms';
  const region = 'ap-guangzhou';
  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({
    SmsSdkAppId: appId,
    SignName: signName,
    TemplateId: templateId,
    TemplateParamSet: [code, String(SMS_EXPIRY_MINUTES)],
    PhoneNumberSet: ['+86' + phone],
  });

  const hashedPayload = await sha256Hex(body);
  const signedHeaders = 'content-type;host;x-api-clienttype;x-content-sha256;x-timestamp';
  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-api-clienttype:10\nx-content-sha256:${hashedPayload}\nx-timestamp:${timestamp}\n`;
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}${signedHeaders}\n${hashedPayload}`;
  const hashedCanonical = await sha256Hex(canonicalRequest);
  const credentialScope = `${new Date().toISOString().slice(0, 10)}/${service}/tc3_request`;
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${hashedCanonical}`;

  const k1 = await hmacSha256(secretKey, new Date().toISOString().slice(0, 10));
  const k2 = await hmacSha256(k1, service);
  const k3 = await hmacSha256(k2, 'tc3_request');
  const k4 = await new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', k3, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(stringToSign)));
  const signature = Array.from(k4).map(b => b.toString(16).padStart(2, '0')).join('');

  const auth = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${host}/?Action=${action}&Version=${version}&Region=${region}`, {
    method: 'POST',
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/json',
      'X-Api-ClientType': '10',
      'X-Content-Sha256': hashedPayload,
      'X-Timestamp': String(timestamp),
      'X-Api-Key': secretKey,
    },
    body,
  });

  const result = await res.json();
  console.log('腾讯云SMS响应:', JSON.stringify(result));

  if (res.ok && result.Response?.SendStatusSet?.[0]?.Code === 'Ok') {
    return { success: true };
  }
  const errMsg = result.Response?.SendStatusSet?.[0]?.Message || JSON.stringify(result);
  throw new Error('腾讯云SMS错误: ' + errMsg);
}

// ============================================================
Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return new Response(null, { headers });

  try {
    const { phone, type = 'register', role = 'passenger' } = await req.json();

    // 参数校验
    if (!phone || !/^1\d{10}$/.test(phone)) {
      return new Response(JSON.stringify({ error: '请输入正确的11位手机号' }), { status: 400, headers });
    }
    if (!['register', 'login'].includes(type)) {
      return new Response(JSON.stringify({ error: 'type 必须是 register 或 login' }), { status: 400, headers });
    }

    // 连接 Supabase（service_role 跳过 RLS）
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    // 同一手机+type 的旧验证码作废
    await supabase.from('verification_codes')
      .update({ used: true })
      .eq('phone', phone).eq('type', type).eq('used', false);

    // 生成6位验证码
    const code = String(100000 + Math.floor(Math.random() * 900000));
    const expiresAt = new Date(Date.now() + SMS_EXPIRY_MINUTES * 60 * 1000).toISOString();

    const { error: dbErr } = await supabase.from('verification_codes')
      .insert({ phone, code, type, role, expires_at: expiresAt });

    if (dbErr) throw new Error('验证码存储失败: ' + dbErr.message);

    const devMode = Deno.env.get('DEV_MODE') === 'true';

    if (devMode) {
      // 开发模式：只打印验证码，不发真实短信
      console.log('\n========== [DEV] 短信验证码 ==========');
      console.log(`  手机号 : ${phone}`);
      console.log(`  验证码 : ${code}`);
      console.log(`  有效期 : ${SMS_EXPIRY_MINUTES} 分钟`);
      console.log(`  类型   : ${type} / ${role}`);
      console.log('========================================\n');
      return new Response(JSON.stringify({
        success: true,
        dev_mode: true,
        code, // 前端可取用于测试
        message: `【开发模式】验证码 ${code}（见Edge日志）`,
      }), { headers });
    }

    // 正式发短信
    try {
      await sendTencentSMS({ phone, code });
      return new Response(JSON.stringify({ success: true, message: '验证码已发送，请查收' }), { headers });
    } catch (smsErr) {
      console.error('短信发送失败:', smsErr.message);
      return new Response(JSON.stringify({
        error: `短信发送失败: ${smsErr.message}，请稍后重试`,
      }), { status: 500, headers });
    }

  } catch (err) {
    console.error('send-sms error:', err);
    return new Response(JSON.stringify({ error: err.message || '服务器异常' }), {
      status: 500, headers,
    });
  }
});

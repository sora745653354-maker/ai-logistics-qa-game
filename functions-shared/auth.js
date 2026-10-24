const enc = new TextEncoder();

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export function cookie(request, name) {
  const prefix = `${name}=`;
  const item = (request.headers.get('cookie') || '').split(';').map(value => value.trim()).find(value => value.startsWith(prefix));
  try { return item ? decodeURIComponent(item.slice(prefix.length)) : ''; }
  catch { return ''; }
}

export function setCookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

export function randomToken(size = 32) {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(size)));
}

async function signingKey(secret) {
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters.');
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSession(payload, secret) {
  const body = toBase64Url(enc.encode(JSON.stringify(payload)));
  const key = await signingKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifySession(token, secret) {
  try {
    const [body, signature, extra] = token.split('.');
    if (!body || !signature || extra) return null;
    const key = await signingKey(secret);
    const valid = await crypto.subtle.verify('HMAC', key, fromBase64Url(signature), enc.encode(body));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
    if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000) || !payload.user?.open_id) return null;
    return payload;
  } catch {
    return null;
  }
}

export function configError(env) {
  if (!env.FEISHU_APP_ID || !env.FEISHU_APP_SECRET || !env.FEISHU_REDIRECT_URI) return '飞书应用配置尚未完成，请联系管理员。';
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) return '登录会话密钥尚未配置，请联系管理员。';
  try {
    const redirect = new URL(env.FEISHU_REDIRECT_URI);
    if (redirect.protocol !== 'https:' || !redirect.pathname.endsWith('/api/auth/callback')) return '回调地址配置无效，请联系管理员。';
  } catch {
    return '回调地址配置无效，请联系管理员。';
  }
  return '';
}

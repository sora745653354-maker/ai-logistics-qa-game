import { cookie, json, verifySession } from '../../../functions-shared/auth.js';

export async function onRequestGet({ request, env }) {
  const payload = await verifySession(cookie(request, 'ai_lab_session'), env.SESSION_SECRET);
  if (!payload) return json({ error: '需要登录' }, 401);
  return json({ user: payload.user, is_admin: Boolean(env.ADMIN_FEISHU_OPEN_ID && payload.user.open_id === env.ADMIN_FEISHU_OPEN_ID) });
}

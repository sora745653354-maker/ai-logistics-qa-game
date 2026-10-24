import { cookie, json, verifySession } from '../../../functions-shared/auth.js';

export async function onRequestGet({ request, env }) {
  const session = await verifySession(cookie(request, 'ai_lab_session'), env.SESSION_SECRET);
  if (!session?.user?.open_id) return json({ error: '需要登录' }, 401);
  if (!env.ADMIN_FEISHU_OPEN_ID || session.user.open_id !== env.ADMIN_FEISHU_OPEN_ID) {
    return json({ error: '无权查看用户访问记录' }, 403);
  }
  if (!env.LEADERBOARD_DB) return json({ error: '访问记录数据库尚未配置' }, 503);

  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get('limit') || 200);
  const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(500, requestedLimit)) : 200;
  try {
    const result = await env.LEADERBOARD_DB.prepare(`
      SELECT name, avatar_url, visited_at
      FROM visit_logs
      ORDER BY visited_at DESC
      LIMIT ?
    `).bind(limit).all();
    return json({ visits: result.results || [] });
  } catch {
    return json({ error: '读取用户访问记录失败' }, 503);
  }
}

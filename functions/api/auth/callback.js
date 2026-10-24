import { clearCookie, configError, cookie, json, setCookie, signSession } from '../../../functions-shared/auth.js';

const noStoreRedirect = (url, headers = {}) => new Response(null, {
  status: 302,
  headers: { location: url, 'cache-control': 'no-store', ...headers },
});

async function feishuJson(url, init) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
  const result = await response.json();
  if (!response.ok || (typeof result.code === 'number' && result.code !== 0)) throw new Error('飞书授权校验失败');
  return result;
}

export async function onRequestGet({ request, env }) {
  const error = configError(env);
  const clearState = { 'set-cookie': clearCookie('ai_lab_oauth_state') };
  if (error) return json({ error }, 503, clearState);

  const origin = new URL(env.FEISHU_REDIRECT_URI).origin;
  if (new URL(request.url).origin !== origin) return json({ error: '回调域名不匹配' }, 400, clearState);
  const incoming = new URL(request.url);
  const code = incoming.searchParams.get('code');
  const returnedState = incoming.searchParams.get('state');
  const expectedState = cookie(request, 'ai_lab_oauth_state');
  if (!code || !returnedState || !expectedState || returnedState !== expectedState) {
    return noStoreRedirect(`${origin}/?auth_error=state`, clearState);
  }

  try {
    const appTokenResult = await feishuJson('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ app_id: env.FEISHU_APP_ID, app_secret: env.FEISHU_APP_SECRET }),
    });
    const appToken = appTokenResult.app_access_token || appTokenResult.data?.app_access_token;
    if (!appToken) throw new Error('飞书授权校验失败');

    const userTokenResult = await feishuJson('https://open.feishu.cn/open-apis/authen/v1/access_token', {
      method: 'POST', headers: { authorization: `Bearer ${appToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ grant_type: 'authorization_code', code, app_id: env.FEISHU_APP_ID, app_secret: env.FEISHU_APP_SECRET }),
    });
    const userToken = userTokenResult.data?.access_token || userTokenResult.access_token;
    if (!userToken) throw new Error('飞书未返回用户授权凭证');

    const infoResult = await feishuJson('https://open.feishu.cn/open-apis/authen/v1/user_info', {
      headers: { authorization: `Bearer ${userToken}` },
    });
    const info = infoResult.data || infoResult;
    const openId = info.open_id;
    if (!openId) throw new Error('飞书未返回有效用户身份');
    const user = { open_id: openId, name: String(info.name || info.en_name || '飞书用户').slice(0, 40), avatar_url: info.avatar_url || '' };
    const now = Math.floor(Date.now() / 1000);
    const session = await signSession({ user, iat: now, exp: now + 28800 }, env.SESSION_SECRET);
    const response = noStoreRedirect(`${origin}/`, { 'set-cookie': setCookie('ai_lab_session', session, 28800) });
    response.headers.append('set-cookie', clearCookie('ai_lab_oauth_state'));
    return response;
  } catch {
    return noStoreRedirect(`${origin}/?auth_error=failed`, clearState);
  }
}

import { configError, json, randomToken, setCookie } from '../../../functions-shared/auth.js';

export async function onRequestGet({ env }) {
  const error = configError(env);
  if (error) return json({ error }, 503);
  const state = randomToken();
  const authorize = new URL('https://passport.feishu.cn/suite/passport/oauth/authorize');
  authorize.searchParams.set('client_id', env.FEISHU_APP_ID);
  authorize.searchParams.set('redirect_uri', env.FEISHU_REDIRECT_URI);
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('state', state);
  return json({ goto: authorize.href }, 200, { 'set-cookie': setCookie('ai_lab_oauth_state', state, 300) });
}

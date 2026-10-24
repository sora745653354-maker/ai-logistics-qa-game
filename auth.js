(() => {
  'use strict';

  const screen = document.querySelector('#auth-screen');
  const status = document.querySelector('#auth-status');
  const qr = document.querySelector('#feishu-qr');
  const retry = document.querySelector('#auth-retry');
  const sdkUrl = 'https://sf3-cn.feishucdn.com/obj/static/lark/passport/qrcode/LarkSSOSDKWebQRCode-1.0.2.js';

  function setStatus(message, isError = false) {
    status.textContent = message;
    status.classList.toggle('is-error', isError);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error('页面资源加载失败，请刷新页面重试。'));
      document.body.append(script);
    });
  }

  async function loadSdk() {
    if (window.QRLogin) return;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = sdkUrl;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error('无法加载飞书扫码组件，请检查网络后重试。'));
      document.head.append(script);
    });
  }

  async function startQr() {
    retry.hidden = true;
    qr.innerHTML = '<span class="qr-placeholder">正在生成安全二维码…</span>';
    setStatus('正在生成安全二维码');
    try {
      const response = await fetch('/api/auth/start', { credentials: 'same-origin', cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '飞书登录配置尚未完成。');
      await loadSdk();
      qr.innerHTML = '';
      const qrLogin = window.QRLogin({ id: 'feishu-qr', goto: result.goto, width: '260', height: '260' });
      const onMessage = event => {
        if (!qrLogin.matchOrigin(event.origin)) return;

        // Feishu SDK 1.0.2 sends the temporary code as event.data directly.
        // Some SDK responses wrap it in an object or query string, so accept those too.
        const data = event.data;
        let tmpCode = typeof data === 'string' ? data : data?.tmp_code || data?.tmpCode;
        if (typeof tmpCode === 'string') {
          tmpCode = tmpCode.match(/(?:^|[?&])tmp_code=([^&"\s]+)/)?.[1] || tmpCode;
        }
        if (typeof tmpCode !== 'string' || !tmpCode.trim() || tmpCode.length > 4096) return;

        window.removeEventListener('message', onMessage);
        const redirect = new URL(result.goto);
        redirect.searchParams.set('tmp_code', tmpCode);
        setStatus('扫码成功，请在飞书中确认登录');
        window.location.assign(redirect.href);
      };
      window.addEventListener('message', onMessage);
      setStatus('请使用飞书 App 扫描二维码并确认');
    } catch (error) {
      qr.innerHTML = '<span class="qr-placeholder qr-error">飞书登录暂不可用</span>';
      setStatus(error.message || '连接失败，请稍后重试。', true);
      retry.hidden = false;
    }
  }

  async function initialize() {
    const authError = new URLSearchParams(location.search).get('auth_error');
    if (authError) setStatus(authError === 'state' ? '登录请求已失效，请刷新二维码后重试。' : '飞书登录未完成，请重新扫码并确认授权。', true);
    try {
      const response = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' });
      const result = await response.json();
      if (response.ok && result.user) {
        window.FEISHU_USER = result.user;
        screen.hidden = true;
        document.body.classList.add('authenticated');
        await loadScript('questions.js');
        await loadScript('core.js');
        await loadScript('app.js');
        document.querySelector('#profile-name').textContent = result.user.name;
        document.querySelector('.profile-button .avatar').textContent = (result.user.name || '飞').slice(0, 1);
        return;
      }
      await startQr();
      if (authError && retry.hidden) setStatus(authError === 'state' ? '登录请求已失效，请刷新二维码后重试。' : '飞书登录未完成，请重新扫码并确认授权。', true);
    } catch {
      screen.hidden = false;
      document.body.classList.remove('authenticated');
      qr.innerHTML = '<span class="qr-placeholder qr-error">登录服务不可用</span>';
      setStatus('登录或页面资源加载失败，请刷新页面重试。', true);
      retry.hidden = false;
    }
  }

  retry.addEventListener('click', startQr);
  initialize();
})();

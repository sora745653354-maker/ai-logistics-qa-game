(() => {
  'use strict';

  const root = document.querySelector('#ai-assistant');
  const toggle = document.querySelector('#assistant-toggle');
  const panel = document.querySelector('#assistant-panel');
  const close = document.querySelector('#assistant-close');
  const form = document.querySelector('#assistant-form');
  const input = document.querySelector('#assistant-input');
  const send = document.querySelector('#assistant-send');
  const messagesEl = document.querySelector('#assistant-messages');
  const hint = document.querySelector('#assistant-hint');
  const messages = [];
  let pending = false;

  function appendMessage(role, text, extraClass = '') {
    const bubble = document.createElement('div');
    bubble.className = `assistant-message ${role}${extraClass ? ` ${extraClass}` : ''}`;
    bubble.textContent = text;
    messagesEl.append(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return bubble;
  }

  function openPanel() {
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    window.setTimeout(() => input.focus(), 50);
  }

  function closePanel() {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  }

  async function ask(question) {
    const content = question.trim();
    if (!content || pending) return;
    if (content.length > 1200) {
      hint.textContent = '问题最多 1200 个字符，请精简后发送。';
      return;
    }
    messages.push({ role: 'user', content });
    appendMessage('user', content);
    input.value = '';
    hint.textContent = '看板娘正在整理思路…';
    pending = true;
    send.disabled = true;
    const thinking = appendMessage('assistant', '让我想一想…', 'thinking');
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: messages.slice(-10) }),
      });
      const result = await response.json();
      thinking.remove();
      if (!response.ok) {
        appendMessage('assistant', result.error || '暂时无法回答，请稍后再试。');
        hint.textContent = '每位登录用户每天可提问 20 次';
        messages.pop();
      } else {
        messages.push({ role: 'assistant', content: result.answer });
        appendMessage('assistant', result.answer);
        hint.textContent = `今天还可以提问 ${result.remaining} 次 · 请先移除业务敏感信息`;
      }
    } catch {
      thinking.remove();
      appendMessage('assistant', '网络连接有点不稳定，请稍后再试。');
      hint.textContent = '每位登录用户每天可提问 20 次';
      messages.pop();
    } finally {
      pending = false;
      send.disabled = false;
      input.focus();
    }
  }

  toggle.addEventListener('click', () => panel.hidden ? openPanel() : closePanel());
  close.addEventListener('click', closePanel);
  form.addEventListener('submit', event => {
    event.preventDefault();
    ask(input.value);
  });
  document.querySelectorAll('[data-assistant-prompt]').forEach(button => {
    button.addEventListener('click', () => ask(button.dataset.assistantPrompt));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) closePanel();
  });

  root.hidden = false;
})();

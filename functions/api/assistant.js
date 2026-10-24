import { cookie, json, verifySession } from '../../functions-shared/auth.js';

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const DAILY_LIMIT = 20;
const MAX_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 1200;

const SYSTEM_PROMPT = `你是“BabyCare看板娘”，是 AI 物流实验室里亲切、耐心的中文学习助手。面向没有 AI 基础的物流同事，帮助他们理解提示词、生成式 AI、To B 物流（订单、履约、仓配、异常、SLA、客户服务）和 To C 物流（消费者查询、派送、逆向、体验）场景。用通俗中文回答，先给结论，再给可直接使用的步骤或示例；问题不清楚时先问一个关键澄清问题。提示词是给 AI 的自然语言任务指令，不只是关键词；用户问提示词写法时，优先用“任务 + 背景 + 约束 + 输出格式”讲解并给一条可复制模板。物流示例中的未知信息用【待填】或【待核实】标注；不得暗示你能查询系统，也不得编造物流状态、运价或时效。不要声称可以读取公司系统、实时订单或本网站的私人数据；不要编造公司政策、客户事实、运价、时效或实时状态。处理真实业务材料时提醒用户先去掉客户姓名、电话、地址、订单号等敏感信息。回答尽量简洁、实用，并说明 AI 生成内容需要人工核验。`;

async function userKey(openId) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(openId));
  return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

function validateOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const source = new URL(origin);
    const target = new URL(request.url);
    return source.protocol === 'https:' && source.origin === target.origin;
  } catch {
    return false;
  }
}

export async function onRequestPost({ request, env }) {
  if (!validateOrigin(request)) return json({ error: '请求来源无效，请刷新页面后重试。' }, 403);

  const session = await verifySession(cookie(request, 'ai_lab_session'), env.SESSION_SECRET);
  if (!session?.user?.open_id) return json({ error: '登录状态已失效，请重新登录。' }, 401);
  if (!env.AI) return json({ error: '助手服务尚未启用，请联系管理员。' }, 503);
  if (!env.LEADERBOARD_DB) return json({ error: '助手服务暂不可用，请稍后再试。' }, 503);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: '消息格式无效。' }, 400); }

  if (!Array.isArray(body?.messages) || body.messages.length < 1 || body.messages.length > MAX_MESSAGES) {
    return json({ error: '对话内容无效，请开启新对话后重试。' }, 400);
  }
  const messages = [];
  let totalChars = 0;
  for (const item of body.messages) {
    if (!item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string') {
      return json({ error: '消息格式无效。' }, 400);
    }
    const content = item.content.trim();
    if (!content || content.length > MAX_MESSAGE_CHARS) return json({ error: '每条消息最多 1200 个字符。' }, 400);
    totalChars += content.length;
    if (totalChars > 5000) return json({ error: '这段对话太长了，请开启新对话后继续。' }, 400);
    messages.push({ role: item.role, content });
  }
  if (messages.at(-1).role !== 'user') return json({ error: '请先发送一个问题。' }, 400);

  const day = new Date().toISOString().slice(0, 10);
  let usage;
  try {
    const key = await userKey(session.user.open_id);
    usage = await env.LEADERBOARD_DB.prepare(
      `INSERT INTO assistant_usage (user_key, usage_day, requests)
       VALUES (?, ?, 1)
       ON CONFLICT(user_key, usage_day) DO UPDATE SET requests = requests + 1
       WHERE requests < ${DAILY_LIMIT}
       RETURNING requests`,
    ).bind(key, day).first();
    if (!usage) return json({ error: '今天的提问次数已用完（每日 20 次），明天再来继续聊吧。' }, 429);
  } catch {
    return json({ error: '助手服务暂不可用，请稍后再试。' }, 503);
  }

  try {
    const result = await env.AI.run(MODEL, {
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      max_tokens: 512,
      temperature: 0.6,
    });
    const choice = result?.choices?.[0];
    const message = choice?.message;
    const content = message?.content;
    console.log('BabyCare AI response shape', JSON.stringify({
      type: typeof result,
      keys: result && typeof result === 'object' ? Object.keys(result) : [],
      hasResponse: typeof result?.response === 'string',
      choiceCount: Array.isArray(result?.choices) ? result.choices.length : 0,
      choiceKeys: choice && typeof choice === 'object' ? Object.keys(choice) : [],
      messageKeys: message && typeof message === 'object' ? Object.keys(message) : [],
      contentType: typeof content,
      contentIsArray: Array.isArray(content),
      textType: typeof choice?.text,
      finishReason: choice?.finish_reason,
    }));
    const answer = typeof result?.response === 'string'
      ? result.response
      : typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? content.map(part => typeof part === 'string' ? part : part?.text).filter(text => typeof text === 'string').join('\n')
          : choice?.text;
    if (typeof answer !== 'string' || !answer.trim()) throw new Error('empty model response');
    return json({ answer: answer.trim(), remaining: DAILY_LIMIT - usage.requests });
  } catch (error) {
    console.error('BabyCare AI model call failed', error instanceof Error ? error.name : 'UnknownError', error instanceof Error ? error.message : String(error));
    return json({ error: '看板娘暂时没接上信号，请稍后重试。' }, 502);
  }
}

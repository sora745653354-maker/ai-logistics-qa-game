import { cookie, json, verifySession } from '../../functions-shared/auth.js';

const levels = { easy: 100, normal: 150, hard: 200 };
const topics = new Set(['all', 'ai', 'b2b', 'b2c']);
const maxScore = base => base * 6 + 120;

async function authenticatedUser(request, env) {
  const session = await verifySession(cookie(request, 'ai_lab_session'), env.SESSION_SECRET);
  return session?.user || null;
}

function database(env) {
  return env.LEADERBOARD_DB || null;
}

function validRun(record) {
  const base = levels[record?.level];
  return Boolean(
    base && topics.has(record.topic) &&
    Number.isInteger(record.score) && record.score >= 0 && record.score <= maxScore(base) &&
    Number.isInteger(record.duration) && record.duration >= 1 && record.duration <= 86400 &&
    Number.isInteger(record.correct) && record.correct >= 0 && record.correct <= 6 &&
    (record.correct === 0 ? record.score === 0 : record.score <= record.correct * base + 120) &&
    (record.total === undefined || record.total === 6)
  );
}

function runDate(value, now, allowLegacyDate) {
  if (!allowLegacyDate || !Number.isFinite(value) || value <= 0) return now;
  return Math.min(Math.floor(value), now);
}

async function saveBest(db, user, record, allowLegacyDate = false) {
  const now = Date.now();
  return db.prepare(`
    INSERT INTO leaderboard (open_id, name, level, topic, score, duration, correct, total, achieved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 6, ?)
    ON CONFLICT (open_id, level, topic) DO UPDATE SET
      name = excluded.name,
      score = excluded.score,
      duration = excluded.duration,
      correct = excluded.correct,
      achieved_at = excluded.achieved_at
    WHERE excluded.score > leaderboard.score
      OR (excluded.score = leaderboard.score AND excluded.duration < leaderboard.duration)
      OR (excluded.score = leaderboard.score AND excluded.duration = leaderboard.duration AND excluded.achieved_at < leaderboard.achieved_at)
  `).bind(
    user.open_id,
    String(user.name || '飞书用户').slice(0, 40),
    record.level,
    record.topic,
    record.score,
    record.duration,
    record.correct,
    runDate(record.date, now, allowLegacyDate),
  );
}

export async function onRequestGet({ request, env }) {
  const user = await authenticatedUser(request, env);
  if (!user) return json({ error: '需要登录' }, 401);
  const db = database(env);
  if (!db) return json({ error: '共享排行榜尚未配置，请联系管理员。' }, 503);

  const url = new URL(request.url);
  const level = url.searchParams.get('level');
  const topic = url.searchParams.get('topic');
  if (!levels[level] || !topics.has(topic)) return json({ error: '排行榜筛选条件无效' }, 400);

  try {
    const result = await db.prepare(`
      SELECT name, level, topic, score, duration, correct, total, achieved_at AS date
      FROM leaderboard
      WHERE level = ? AND topic = ?
      ORDER BY score DESC, duration ASC, achieved_at ASC
      LIMIT 20
    `).bind(level, topic).all();
    return json({ records: result.results || [] });
  } catch {
    return json({ error: '读取共享排行榜失败，请稍后重试。' }, 503);
  }
}

export async function onRequestPost({ request, env }) {
  const user = await authenticatedUser(request, env);
  if (!user) return json({ error: '需要登录' }, 401);
  const db = database(env);
  if (!db) return json({ error: '共享排行榜尚未配置，请联系管理员。' }, 503);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: '提交内容格式无效' }, 400); }

  const migration = body?.migration === true;
  const records = Array.isArray(body?.records) ? body.records : [body?.record || body];
  if (!records.length || records.length > 200 || records.some(record => !validRun(record))) {
    return json({ error: '成绩数据无效，请刷新页面后重试。' }, 400);
  }

  try {
    for (let i = 0; i < records.length; i += 100) {
      const statements = await Promise.all(records.slice(i, i + 100).map(record => saveBest(db, user, record, migration)));
      await db.batch(statements);
    }
    return json({ saved: records.length });
  } catch {
    return json({ error: '保存共享成绩失败，请稍后重试。' }, 503);
  }
}

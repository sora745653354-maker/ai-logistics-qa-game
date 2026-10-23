(function (root) {
  const LEVELS = {
    easy: { name: 'easy', display: 'Easy', label: '初识 AI', base: 100, subtitle: '认识概念 · 学会提问', detail: '从一句好提示词开始，认识物流里的 AI。', time: '约 3 分钟', icon: 'sprout' },
    normal: { name: 'normal', display: 'Normal', label: '场景实战', base: 150, subtitle: '应用方法 · 处理场景', detail: '把 AI 用到异常跟进、客户沟通和数据整理。', time: '约 5 分钟', icon: 'layers' },
    hard: { name: 'hard', display: 'Hard', label: '进阶挑战', base: 200, subtitle: '综合判断 · 解决问题', detail: '面对复杂业务，辨别数据、规则与执行边界。', time: '约 7 分钟', icon: 'bolt' }
  };
  const TOPICS = { all: '综合练习', ai: 'AI 与提示词', b2b: '物流 To B', b2c: '物流 To C' };
  const shuffle = array => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    return copy;
  };
  const prepare = q => {
    const order = shuffle(q.options.map((_, i) => i));
    return { ...q, options: order.map(i => q.options[i]), answer: order.indexOf(q.answer) };
  };
  function pick(bank, level, topic = 'all', count = 6) {
    let selected;
    if (topic === 'all') {
      const each = ['ai', 'b2b', 'b2c'].map(t => shuffle(bank.filter(q => q.level === level && q.topic === t)));
      selected = [];
      for (let i = 0; selected.length < count && each.some(a => a.length); i++) {
        const bucket = each[i % 3]; if (bucket.length) selected.push(bucket.pop());
      }
      selected = shuffle(selected);
    } else selected = shuffle(bank.filter(q => q.level === level && q.topic === topic)).slice(0, count);
    return selected.map(prepare);
  }
  function score(base, streak, correct) {
    return correct ? base + Math.min(Math.max(streak - 1, 0), 3) * 10 : 0;
  }
  const maxScore = (base, count) => Array.from({ length: count }, (_, i) => score(base, i + 1, true)).reduce((a, b) => a + b, 0);
  function rank(records, level, topic) {
    const best = new Map();
    records.filter(r => r.level === level && r.topic === topic && !r.practice).forEach(r => {
      const key = r.name.trim().toLocaleLowerCase(); const prev = best.get(key);
      if (!prev || r.score > prev.score || (r.score === prev.score && r.duration < prev.duration)) best.set(key, r);
    });
    return [...best.values()].sort((a, b) => b.score - a.score || a.duration - b.duration || a.date - b.date).slice(0, 20);
  }
  root.GameCore = { LEVELS, TOPICS, shuffle, prepare, pick, score, maxScore, rank };
})(typeof window !== 'undefined' ? window : globalThis);

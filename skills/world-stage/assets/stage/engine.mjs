// Pure world projection shared by the browser and the acceptance checks.
export const copy = value => structuredClone(value);
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
export function setPath(target, path, value) {
  const parts = path.split('.');
  if (parts.some(p => forbidden.has(p))) throw new Error('Unsafe state path');
  let cursor = target;
  for (const part of parts.slice(0, -1)) cursor = cursor[part] ??= {};
  cursor[parts.at(-1)] = copy(value);
}
export function applyRecord(state, record) {
  for (const [key, delta] of Object.entries(record.resourceDelta || {})) state.resources[key] = (state.resources[key] || 0) + Number(delta);
  for (let [path, value] of Object.entries(record.stateDelta || {})) {
    if (path.startsWith('actor-')) path = `actors.${path}`;
    setPath(state, path, Array.isArray(value) ? value.at(-1) : value);
  }
  const after = record.data?.after;
  if (after && typeof after === 'object') {
    for (const [key, value] of Object.entries(after)) {
      if (key === 'resources') Object.assign(state.resources, copy(value));
      else if (key === 'actor' && record.actorIds?.[0]) Object.assign(state.actors[record.actorIds[0]], copy(value));
      else if (key.startsWith('actor-') && key.includes('.')) setPath(state, `actors.${key}`, value);
      else if (typeof value === 'number' && key !== 'seed') state.resources[key] = value;
    }
  }
  if (record.type === 'actor.moved' && state.actors[record.actorIds?.[0]] && record.spaceId) state.actors[record.actorIds[0]].locationId = record.spaceId;
  if (record.gameTime) Object.assign(state.clock, record.gameTime);
  return state;
}
export const tickOf = record => Number(record.gameTime?.tick || 0);
export function recordsAt(bundle, tick, branch) {
  const core = bundle.records.filter(r => tickOf(r) <= tick);
  return [...core, ...(branch?.records || []).filter(r => tickOf(r) <= tick)];
}
export function frameAt(bundle, tick, branch) {
  const state = copy(bundle.initial);
  for (const r of recordsAt(bundle, tick, branch)) if (r.type !== 'world.initialized') applyRecord(state, r);
  return state;
}
export function sessionsAt(bundle, tick) {
  const sources = new Set(bundle.records.filter(r => tickOf(r) <= tick).map(r => r.recordId));
  return (bundle.dialogues || []).filter(s => s.tick <= tick && s.sourceRecordIds.every(id => sources.has(id)));
}
export function memoriesAt(bundle, tick, actorId) {
  const sources = new Set(bundle.records.filter(r => tickOf(r) <= tick).map(r => r.recordId));
  return (bundle.memories || []).filter(m => m.actorId === actorId && m.tick <= tick && m.sourceRecordIds.every(id => sources.has(id)));
}
export function routeBetween(scene, from, to) {
  if (from === to) return [scene.spaces[from]?.point].filter(Boolean);
  const queue = [[from, []]], seen = new Set();
  while (queue.length) {
    const [id, path] = queue.shift();
    if (seen.has(id)) continue;
    seen.add(id);
    for (const edge of scene.routes || []) {
      const next = edge.from === id ? edge.to : edge.to === id ? edge.from : null;
      if (!next || seen.has(next)) continue;
      const points = edge.from === id ? edge.points : [...edge.points].reverse();
      const result = path.concat(points.slice(path.length ? 1 : 0));
      if (next === to) return result;
      queue.push([next, result]);
    }
  }
  return [];
}
export function pointOnPath(points, progress) {
  if (!points.length) return null;
  if (points.length === 1) return points[0];
  const lengths = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  let distance = Math.max(0, Math.min(1, progress)) * lengths.reduce((a,b) => a+b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i]) { const t = lengths[i] ? distance / lengths[i] : 0; return points[i].map((v,j) => v + (points[i+1][j]-v)*t); }
    distance -= lengths[i];
  }
  return points.at(-1);
}
export function makeIntervention(bundle, frame, {type, text = '', resource, amount, actorId, locationId}, branchId, ordinal) {
  const data = { text: text.trim(), before: {}, after: {} };
  const record = { recordId: `${branchId}-${ordinal}`, type: `intervention.${type}`, actorIds: [], gameTime: copy(frame.clock), provider: 'user', ruleVersion: 'stage-intervention-v1', causedBy: 'world-console', data };
  if (type === 'resource') {
    const rule = bundle.setting.resources?.[resource];
    if (!rule || !Number.isFinite(amount) || amount === 0) throw new Error('请选择资源并输入非零数量。');
    const before = Number(frame.resources[resource] || 0), after = before + amount;
    if (after < (rule.min ?? 0) || after > (rule.max ?? Infinity)) throw new Error(`资源必须在 ${rule.min ?? 0}–${rule.max ?? '∞'} 之间；当前 ${before}。`);
    record.resourceDelta = {[resource]: amount};
    data.before.resources = {[resource]: before}; data.after.resources = {[resource]: after};
  } else if (type === 'move') {
    if (!frame.actors[actorId] || !bundle.scene.spaces[locationId]) throw new Error('角色或目的地不存在。');
    const before = frame.actors[actorId].locationId;
    if (before === locationId) throw new Error('角色已经在这里。');
    if (!routeBetween(bundle.scene, before, locationId).length) throw new Error('没有可通行路线。');
    record.actorIds = [actorId]; record.spaceId = locationId;
    record.stateDelta = {[`actors.${actorId}.locationId`]: [before, locationId]};
  } else if (type === 'broadcast') {
    if (!data.text || data.text.length > 500) throw new Error('广播内容需要 1–500 字。');
    record.actorIds = Object.keys(frame.actors);
  } else throw new Error('不支持的干预类型。');
  return record;
}
// This is a local knowledge lookup, not an LLM impersonation.
export function sandboxReply(bundle, tick, actorId, question, frame) {
  const actor = bundle.actors.find(a => a.id === actorId);
  if (!actor) throw new Error('Unknown actor');
  const memories = memoriesAt(bundle, tick, actorId), profile = actor.profile || {};
  const known = sessionsAt(bundle, tick).filter(s => s.actorIds.includes(actorId));
  if (/水|资源|water|power|电|blue|蓝盐/i.test(question)) return {text: `这条时间线当前有 ${frame.resources.water ?? 0} 份净水、${frame.resources.power ?? 0} 份电力。${profile.drives?.[0] || ''}`, sources: ['当前时间线快照'], kind: 'snapshot'};
  if (/记|发生|经历|memory|happened|remember/i.test(question)) return {text: memories.length ? memories.map(m => m.text).join('\n\n') : '在这个时间点，我还没有记录新的经历。', sources: memories.flatMap(m => m.sourceRecordIds), kind: 'memory'};
  if (/目标|想|why|goal|want|计划/i.test(question)) return {text: (profile.drives || []).join('；') || profile.premise, sources: ['角色档案'], kind: 'profile'};
  if (/谁|介绍|who|yourself/i.test(question)) return {text: profile.premise || actor.name, sources: ['角色档案'], kind: 'profile'};
  const turn = known.flatMap(s => s.turns).filter(t => t.actorId === actorId).at(-1);
  return {text: turn ? `我的最近原话是：“${turn.text}”\n\n这里可以查询经历、目标和资源；自由生成的回答需交给 Codex。` : '我可以告诉你我的目标、已发生的经历和当前资源。自由生成的回答需交给 Codex。', sources: known.at(-1)?.sourceRecordIds || ['角色档案'], kind: 'retrieval'};
}
export function validateBundle(bundle) {
  const actorIds = new Set(bundle.actors.map(a => a.id));
  const recordIds = new Set(bundle.records.map(r => r.recordId));
  for (const id of Object.keys(bundle.initial.actors)) if (!actorIds.has(id)) throw new Error(`Missing actor: ${id}`);
  for (const space of bundle.spaces) if (!bundle.scene.spaces[space.id]) throw new Error(`Missing visual anchor: ${space.id}`);
  for (const s of bundle.dialogues || []) {
    if (!s.sourceRecordIds.length || s.sourceRecordIds.some(id => !recordIds.has(id))) throw new Error(`Unsourced dialogue: ${s.id}`);
    if (s.actorIds.some(id => !actorIds.has(id)) || s.turns.some(t => !s.actorIds.includes(t.actorId))) throw new Error(`Unknown dialogue participant: ${s.id}`);
    if (s.sourceRecordIds.some(id => tickOf(bundle.records.find(r => r.recordId === id)) > s.tick)) throw new Error(`Future dialogue source: ${s.id}`);
  }
  for (const m of bundle.memories || []) if (!actorIds.has(m.actorId) || !m.sourceRecordIds.length || m.sourceRecordIds.some(id => !recordIds.has(id) || tickOf(bundle.records.find(r => r.recordId === id)) > m.tick)) throw new Error(`Unsourced memory: ${m.id}`);
  return true;
}

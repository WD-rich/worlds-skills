import {frameAt, sessionsAt, memoriesAt, routeBetween, pointOnPath, makeIntervention, sandboxReply, validateBundle} from './engine.mjs';

const $ = id => document.getElementById(id);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const shortId = value => String(value || '').split('-').slice(-1)[0];
const qs = new URLSearchParams(location.search);
const state = {
  bundle: null,
  frame: null,
  branch: null,
  tick: 0,
  selectedActor: null,
  selectedSpace: null,
  tab: 'history',
  zoom: 1,
  pan: [0, 0],
  playing: false,
  timer: null,
  speed: 1,
  showPaths: false,
  panelCollapsed: false,
  drag: null,
  stageSize: [1, 1],
  cameraScale: 1,
  chat: [],
  follow: null,
  transition: null,
  imageCache: new Map(),
  imageErrors: new Set(),
};

const fallbackColors = ['#c98c5b', '#6eb2a4', '#bd9b63', '#91a8bf'];
async function getBundle() {
  const path = qs.get('world') || 'world.json';
  const response = await fetch(path);
  if (!response.ok) throw new Error(`无法载入 ${path}`);
  const bundle = await response.json();
  validateBundle(bundle);
  return bundle;
}

const tickMax = () => Math.max(
  0,
  ...state.bundle.records.map(r => Number(r.gameTime?.tick || 0)),
  ...(state.branch?.records || []).map(r => Number(r.gameTime?.tick || 0)),
);
const actor = id => state.bundle.actors.find(a => a.id === id);
const space = id => state.bundle.spaces.find(s => s.id === id);
const scene = () => state.bundle.scene;
const style = () => state.bundle.visuals?.style || {};
const animationManifest = () => state.bundle.visuals?.animationManifest || {};
const spacePoint = id => scene().spaces[id]?.point || [50, 50];
const actorName = id => actor(id)?.name || id;
const actorCall = id => actor(id)?.callsign || shortId(id);
const now = () => frameAt(state.bundle, state.tick, state.branch);
const records = () => [...state.bundle.records, ...(state.branch?.records || [])]
  .filter(r => Number(r.gameTime?.tick || 0) <= state.tick)
  .sort((a, b) => Number(a.gameTime?.tick || 0) - Number(b.gameTime?.tick || 0));
const recordById = id => [...state.bundle.records, ...(state.branch?.records || [])].find(r => r.recordId === id);
const sourceLinks = ids => (ids || []).map(id => `<span class="source-link" data-record="${esc(id)}" role="button" tabindex="0">↗ ${esc(id)}</span>`).join(' ');
function fmtTime(value) { return value || '—'; }
function notify(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}
function actorImage(id) { return scene().actors?.[id]?.image || ''; }
function mapSize() { return scene().map.size || [1, 1]; }
function pctToPixels(point) { const [w, h] = mapSize(); return [point[0] / 100 * w, point[1] / 100 * h]; }
function pointToStyle(point) { return `left:${point[0]}%;top:${point[1]}%`; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function easeInOut(value) { return value < 0.5 ? 2 * value * value : 1 - ((-2 * value + 2) ** 2) / 2; }

function scaleCamera() {
  const rect = $('stage').getBoundingClientRect();
  const [width, height] = mapSize();
  state.stageSize = [rect.width, rect.height];
  state.cameraScale = Math.min(rect.width / width, rect.height / height) * state.zoom;
  const camera = $('camera');
  camera.style.width = `${width}px`;
  camera.style.height = `${height}px`;
  camera.style.transform = `translate(${state.pan[0]}px,${state.pan[1]}px) scale(${state.cameraScale})`;
  const canvas = $('sceneCanvas');
  if (canvas && (canvas.width !== width || canvas.height !== height)) {
    canvas.width = width;
    canvas.height = height;
  }
}
function currentScale() { return state.cameraScale; }

function pathSvg() {
  const paths = (scene().routes || []).map(edge => `<polyline points="${edge.points.map(p => `${p[0] / 100 * mapSize()[0]},${p[1] / 100 * mapSize()[1]}`).join(' ')}"/>`);
  $('routeLayer').innerHTML = paths.join('');
}

function frameAtTick(tick) { return frameAt(state.bundle, tick, state.branch); }
function transitionAlpha(timestamp = performance.now()) {
  if (!state.transition) return 1;
  return easeInOut(clamp((timestamp - state.transition.started) / state.transition.duration, 0, 1));
}
function isMovingInTransition(id) {
  const from = state.transition?.fromFrame?.actors?.[id];
  const to = state.transition?.toFrame?.actors?.[id];
  return Boolean(from && to && from.locationId !== to.locationId);
}
function visualPointForActor(id, timestamp = performance.now()) {
  const target = state.frame?.actors?.[id];
  if (!target) return [50, 50];
  const from = state.transition?.fromFrame?.actors?.[id];
  if (!from || from.locationId === target.locationId) return spacePoint(target.locationId);
  const route = routeBetween(scene(), from.locationId, target.locationId);
  return pointOnPath(route, transitionAlpha(timestamp)) || spacePoint(target.locationId);
}
function visualDirectionForActor(id, timestamp = performance.now()) {
  const from = state.transition?.fromFrame?.actors?.[id];
  const to = state.frame?.actors?.[id];
  if (!from || !to || from.locationId === to.locationId) return 1;
  const a = spacePoint(from.locationId);
  const b = visualPointForActor(id, timestamp);
  return b[0] < a[0] ? -1 : 1;
}
function eventAtCurrentTick(types, id) {
  return records().some(record => Number(record.gameTime?.tick || 0) === state.tick && types.includes(record.type) && (!id || record.actorIds?.includes(id)));
}
function visualActionForActor(id) {
  if (isMovingInTransition(id)) return 'walk';
  const sessions = sessionsAt(state.bundle, state.tick).filter(s => s.actorIds?.includes(id) && s.tick === state.tick);
  if (sessions.length || eventAtCurrentTick(['signal.emitted', 'signal.decoded'], id)) return 'talk';
  if (eventAtCurrentTick(['exchange.completed', 'resource.decision', 'intervention.resource'], id)) return 'interact';
  return 'idle';
}

function renderSpaces() {
  const layer = $('spaceLayer');
  layer.innerHTML = state.bundle.spaces.map(s => {
    const p = spacePoint(s.id);
    const count = Object.values(state.frame.actors).filter(a => a.locationId === s.id).length;
    return `<button class="space-label${state.selectedSpace === s.id ? ' selected' : ''}" data-space="${esc(s.id)}" style="${pointToStyle(p)}">${esc(s.name)}${count ? ` <small>${count}</small>` : ''}</button>`;
  }).join('');
  layer.querySelectorAll('[data-space]').forEach(el => el.addEventListener('click', () => selectSpace(el.dataset.space)));
}

function renderInteractables() {
  const layer = $('interactableLayer');
  const items = scene().interactables || [];
  layer.innerHTML = items.map(item => `<span class="interactable interactable-${esc(item.kind || 'generic')}" style="${pointToStyle(item.point)}"><i></i><b>${esc(item.label)}</b></span>`).join('');
}

function renderActors() {
  const layer = $('actorLayer');
  const byLocation = {};
  for (const [id, value] of Object.entries(state.frame.actors)) (byLocation[value.locationId] ||= []).push(id);
  const timestamp = performance.now();
  layer.innerHTML = Object.entries(state.frame.actors).map(([id, value], index) => {
    const profile = actor(id) || {};
    const action = visualActionForActor(id);
    const group = byLocation[value.locationId] || [];
    const n = group.indexOf(id);
    const spread = isMovingInTransition(id) ? 0 : (n - (group.length - 1) / 2) * 3.1;
    const point = visualPointForActor(id, timestamp);
    const image = actorImage(id);
    const classes = [
      'actor',
      profile.kind?.includes('drone') ? 'drone' : '',
      `action-${action}`,
      state.selectedActor === id ? 'selected' : '',
      image ? 'canvas-proxy' : '',
    ].filter(Boolean).join(' ');
    const fallback = `<span class="fallback-sprite" style="--actor-color:${fallbackColors[index % fallbackColors.length]}"></span>`;
    return `<button class="${classes}" data-actor="${esc(id)}" style="left:${point[0] + spread}%;top:${point[1]}%" aria-label="${esc(profile.name)}，${esc(value.activity || action)}" data-action="${action}">${image ? `<img class="sprite" src="${esc(image)}" alt="" draggable="false">` : fallback}<span class="actor-ring"></span><span class="actor-name"><i></i>${esc(profile.name || id)}</span><span class="actor-state">${esc(action)}</span></button>`;
  }).join('');
  layer.querySelectorAll('[data-actor]').forEach(el => el.addEventListener('click', () => selectActor(el.dataset.actor)));
}

function renderBubbles() {
  const layer = $('bubbleLayer');
  const sessions = sessionsAt(state.bundle, state.tick).slice(-1);
  const positions = {};
  const timestamp = performance.now();
  layer.innerHTML = sessions.flatMap(session => session.turns.map((turn, turnIndex) => {
    const p = visualPointForActor(turn.actorId, timestamp);
    positions[turn.actorId] = (positions[turn.actorId] || 0) + 1;
    const offset = [(positions[turn.actorId] - 1) * 4, -19 - Math.min(turnIndex, 2) * 4];
    const left = clamp(p[0] + offset[0], 9, 91);
    const top = clamp(p[1] + offset[1], 5, 72);
    return `<button class="speech" data-record="${esc(session.sourceRecordIds.at(-1))}" style="left:${left}%;top:${top}%"><strong>${esc(actorName(turn.actorId))}</strong><span class="speech-text">${esc(turn.text)}</span><small>${esc(session.title)} · ${esc(session.kind || '对话')} · ${sourceLinks(session.sourceRecordIds)}</small></button>`;
  })).join('');
  layer.querySelectorAll('[data-record]').forEach(el => el.addEventListener('click', () => showRecord(el.dataset.record)));
}

function renderHeader() {
  const clock = state.frame.clock || {};
  const cue = scene().timeline?.find(item => item.tick === state.tick) || {};
  $('worldTitle').textContent = state.bundle.setting.title || '世界舞台';
  $('worldSubtitle').textContent = state.bundle.setting.subtitle || state.bundle.setting.elevatorPitch || '';
  $('clock').textContent = `第 ${clock.day || 1} 天 · ${fmtTime(clock.time)}`;
  $('weather').textContent = clock.period || '世界时钟';
  $('chapterLabel').textContent = cue.label || `TIMELINE · T${state.tick}`;
  $('chapterTitle').textContent = cue.title || state.bundle.setting.title || '世界舞台';
  $('sceneStatus').textContent = `OFFLINE REPLAY · PROCEDURAL MOTION · T${state.tick}${state.imageErrors.size ? ` · ${state.imageErrors.size} ASSET ERROR` : ''}`;
  $('runStatus').textContent = state.playing ? '运行中' : (state.branch ? '分支回放' : '已暂停');
  $('runStatus').classList.toggle('playing', state.playing);
  $('modeBadge').textContent = state.branch ? `分支回放 · ${state.branch.title}` : '离线存档回放';
  $('tickLabel').textContent = state.tick ? `第 ${state.tick} 步 · ${fmtTime(clock.time)}` : '初始时刻';
  $('recordCount').textContent = `${records().length} 条事件`;
  $('endTime').textContent = fmtTime(state.bundle.records.at(-1)?.gameTime?.time);
  $('scaleLabel').textContent = `${state.bundle.spaces.length} 个空间 · ${state.bundle.actors.length} 个角色`;
}

function renderDialogueDock() {
  const session = sessionsAt(state.bundle, state.tick).at(-1);
  const turn = session?.turns.at(-1);
  $('dialogueLabel').textContent = session ? `${session.title} · ${session.kind || '正式对话'}` : '世界状态 · 初始快照';
  $('dialogueText').textContent = turn?.text || state.bundle.setting.elevatorPitch || '世界刚刚苏醒，等待第一条事件。';
}

function renderResources() {
  const labels = {water: ['💧', '净水'], power: ['ϟ', '电力'], 'blue-salt': ['◆', '蓝盐'], scrap: ['▧', '废料'], 'signal-heat': ['⌁', '热痕'], 'filter-output': ['✚', '滤水']};
  $('resources').innerHTML = Object.entries(state.frame.resources).map(([key, value]) => {
    const label = labels[key] || ['•', key];
    return `<button class="resource-chip" data-resource="${esc(key)}"><i>${label[0]}</i><span>${label[1]}</span><b>${value}</b></button>`;
  }).join('');
  $('resources').querySelectorAll('[data-resource]').forEach(el => el.addEventListener('click', () => resourceModal(el.dataset.resource)));
}

function renderSidebar() {
  $('actorCount').textContent = `${state.bundle.actors.length} 位居民`;
  $('actorList').innerHTML = state.bundle.actors.map(actorProfile => {
    const runtime = state.frame.actors[actorProfile.id] || actorProfile.state;
    const image = actorImage(actorProfile.id);
    return `<button class="actor-row${state.selectedActor === actorProfile.id ? ' selected' : ''}" data-actor="${esc(actorProfile.id)}"><span class="avatar">${image ? `<img src="${esc(image)}" alt="">` : ''}</span><span><strong>${esc(actorProfile.name)} · ${esc(actorProfile.callsign)}</strong><small>${esc(space(runtime.locationId)?.name || runtime.locationId)} · ${esc(runtime.activity || '待命')}</small></span><i class="activity-dot${runtime.condition === 'critical' || runtime.condition === 'strained' ? ' warn' : ''}"></i></button>`;
  }).join('');
  $('actorList').querySelectorAll('[data-actor]').forEach(el => el.addEventListener('click', () => selectActor(el.dataset.actor)));
  renderProfile();
}

function renderProfile() {
  const profile = actor(state.selectedActor) || state.bundle.actors[0];
  const runtime = state.frame.actors[profile.id] || profile.state || {};
  const image = actorImage(profile.id);
  const action = visualActionForActor(profile.id);
  $('profile').innerHTML = `<div class="profile-head"><div class="portrait">${image ? `<img src="${esc(image)}" alt="${esc(profile.name)}">` : ''}</div><div><h3>${esc(profile.name)}</h3><span class="callsign">${esc(profile.callsign)} · ${esc(profile.role)}</span></div><div class="profile-actions"><button data-follow="${esc(profile.id)}" class="${state.follow === profile.id ? 'follow-active' : ''}">${state.follow === profile.id ? '跟随中' : '跟随'}</button><button data-focus="${esc(runtime.locationId)}">定位</button></div></div><p class="profile-premise">${esc(profile.profile?.premise || '')}</p><div class="location-line">⌖ ${esc(space(runtime.locationId)?.name || runtime.locationId)} · ${esc(runtime.activity || '待命')} · ${esc(action)}</div><div class="needs">${Object.entries(runtime.needs || {}).map(([key, value]) => `<span class="need"><span>${esc(key)}</span><span class="bar"><i style="width:${clamp(value, 0, 100)}%"></i></span><b>${value}</b></span>`).join('')}</div><div class="block-label"><span>库存</span><span>${(runtime.inventory || []).length} 项</span></div><div class="inventory">${(runtime.inventory || []).map(value => `<span>${esc(value)}</span>`).join('') || '<span class="empty">空</span>'}</div>`;
  $('profile').querySelector('[data-follow]')?.addEventListener('click', () => { state.follow = state.follow === profile.id ? null : profile.id; notify(state.follow ? '镜头将跟随该角色' : '已停止跟随'); renderProfile(); });
  $('profile').querySelector('[data-focus]')?.addEventListener('click', () => focusSpace(runtime.locationId));
  renderDetail();
}

function renderDetail() {
  const profile = actor(state.selectedActor) || state.bundle.actors[0];
  let body = '';
  if (state.tab === 'history') {
    const relevant = records().filter(record => record.actorIds?.includes(profile.id)).slice().reverse();
    body = relevant.length ? relevant.map(record => `<article class="event-item"><div class="event-meta"><em>T${record.gameTime.tick} · ${fmtTime(record.gameTime.time)}</em><span>${esc(record.type)}</span></div><p>${esc(eventDescription(record))}</p><button class="source-link" data-record="${esc(record.recordId)}">↗ 查看原始记录</button></article>`).join('') : '<p class="empty">这个时间点还没有该角色的事件。</p>';
  } else if (state.tab === 'memory') {
    const items = memoriesAt(state.bundle, state.tick, profile.id);
    body = items.length ? items.map(memory => `<article class="event-item"><div class="event-meta"><em>T${memory.tick}</em><span>${esc(memory.kind)}</span></div><p>${esc(memory.text)}</p>${sourceLinks(memory.sourceRecordIds)}</article>`).join('') : '<p class="empty">没有满足来源和时间条件的记忆。</p>';
  } else {
    const relations = profile.relationships || [];
    body = relations.length ? relations.map(relation => `<div class="relation"><div class="flex"><strong>${esc(actorName(relation.targetId))}</strong><small>${esc(relation.type)}</small></div><span class="relation-score${relation.score < 0 ? ' negative' : ''}">${relation.score > 0 ? '+' : ''}${relation.score}</span></div>`).join('') : '<p class="empty">暂无关系记录。</p>';
  }
  $('detailBody').innerHTML = body;
  $('detailBody').querySelectorAll('[data-record]').forEach(el => el.addEventListener('click', () => showRecord(el.dataset.record)));
}

function eventDescription(record) {
  const data = record.data || {};
  if (record.type === 'actor.moved') return `移动到 ${space(record.spaceId)?.name || record.spaceId}：${data.reason || '路线安全'}`;
  if (record.type === 'signal.emitted') return `广播 ${data.messageClass || '信号'}，热痕增加 ${record.resourceDelta?.['signal-heat'] || 0}`;
  if (record.type === 'signal.decoded') return `解码信号，可信度 ${data.confidence ?? '—'}`;
  if (record.type === 'exchange.completed') return `交换 ${data.given || '物资'} → ${data.received || '物资'}`;
  if (record.type === 'resource.decision') return `选择 ${data.chosen || '资源方案'}，被拒绝意图 ${data.rejectedIntents?.length || 0} 条`;
  if (record.type.startsWith('intervention.')) return data.text || '上帝干预';
  return record.type;
}

function renderTimeline() {
  const max = tickMax();
  $('timelineRange').max = max;
  $('timelineRange').value = state.tick;
  $('tickMarkers').innerHTML = Array.from({length: max + 1}, (_, index) => `<button class="${index === state.tick ? 'active' : ''}" data-tick="${index}">T${index}</button>`).join('');
  $('tickMarkers').querySelectorAll('[data-tick]').forEach(el => el.addEventListener('click', () => setTick(Number(el.dataset.tick))));
}

function renderMini() {
  $('miniImage').src = state.bundle.scene.map.image;
  $('miniActors').innerHTML = Object.entries(state.frame.actors).map(([id]) => `<i class="mini-actor" data-actor="${esc(id)}" style="${pointToStyle(spacePoint(state.frame.actors[id].locationId))}"></i>`).join('');
  const width = Math.min(92, 56 / state.zoom);
  const height = Math.min(90, 54 / state.zoom);
  $('miniView').style.width = `${width}%`;
  $('miniView').style.height = `${height}%`;
  $('miniView').style.left = `${50 - width / 2}%`;
  $('miniView').style.top = `${50 - height / 2}%`;
}

function render() {
  state.frame = now();
  const mapImage = $('mapImage');
  const mapRef = scene().map?.image || '';
  if (mapImage && mapImage.getAttribute('src') !== mapRef) {
    mapImage.src = mapRef;
    mapImage.alt = scene().map?.alt || '世界地图';
  }
  pathSvg();
  renderHeader();
  renderResources();
  renderSpaces();
  renderInteractables();
  renderActors();
  renderBubbles();
  renderDialogueDock();
  renderSidebar();
  renderTimeline();
  renderMini();
  scaleCamera();
  $('workspace').classList.toggle('collapsed', state.panelCollapsed);
  $('stage').classList.toggle('show-paths', state.showPaths);
  $('zoomValue').textContent = `${Math.round(state.zoom * 100)}%`;
  $('pathsBtn').setAttribute('aria-pressed', String(state.showPaths));
  $('playBtn').textContent = state.playing ? 'Ⅱ' : '▶';
  $('playTop').textContent = state.playing ? 'Ⅱ 暂停' : '▶ 播放';
  drawSceneCanvas(performance.now());
}

function setTick(value) {
  const next = clamp(Number(value), 0, tickMax());
  if (next === state.tick) return;
  const previous = state.tick;
  state.transition = Math.abs(next - previous) === 1 && !prefersReducedMotion.matches ? {
    from: previous,
    to: next,
    fromFrame: frameAtTick(previous),
    toFrame: frameAtTick(next),
    started: performance.now(),
    duration: Number(style().motion?.transitionMs || 720),
  } : null;
  state.tick = next;
  render();
  if (state.follow) focusActor(state.follow);
}

function togglePlay() {
  state.playing = !state.playing;
  clearInterval(state.timer);
  if (state.playing) {
    state.timer = setInterval(() => {
      if (state.tick >= tickMax()) {
        state.playing = false;
        clearInterval(state.timer);
        render();
        return;
      }
      setTick(state.tick + 1);
    }, Math.max(720, 1450 / state.speed));
  }
  render();
}
function selectActor(id) { state.selectedActor = id; renderActors(); renderSidebar(); notify(`${actorName(id)} · ${space(state.frame.actors[id]?.locationId)?.name || ''}`); }
function selectSpace(id) { state.selectedSpace = id; renderSpaces(); const selected = space(id); if (selected) notify(`${selected.name} · ${selected.description}`); }
function focusSpace(id) { const point = spacePoint(id); state.pan = [(50 - point[0]) * state.stageSize[0] / 100, (50 - point[1]) * state.stageSize[1] / 100]; scaleCamera(); }
function focusActor(id) { const runtime = state.frame.actors[id]; if (runtime) focusSpace(runtime.locationId); }

function showRecord(id) {
  const record = recordById(id);
  if (!record) return;
  openModal('事件记录', `${record.recordId} · T${record.gameTime.tick} · ${record.type}`, `<div class="record-card"><header><span>${esc(record.causedBy || 'record')}</span><span>${esc(record.provider || 'unknown')}</span></header><p>${esc(eventDescription(record))}</p><code>${esc(JSON.stringify(record.data || {}, null, 2))}</code></div>`);
}
function resourceModal(resource) {
  const value = state.frame.resources[resource] ?? 0;
  const rule = state.bundle.setting.resources?.[resource] || {};
  openModal('资源账本', `${resource} · 当前快照`, `<table class="resource-table"><tr><th>资源</th><th>当前</th><th>边界</th></tr><tr><td>${esc(resource)}</td><td>${value}</td><td>${rule.min ?? 0} – ${rule.max ?? '∞'}</td></tr></table><p class="hint">资源数值由事件流投影而来。要改变它，请从“上帝干预”提交可审计记录。</p>`);
}
function openModal(title, eyebrow, body) { $('modalTitle').textContent = title; $('modalEyebrow').textContent = eyebrow; $('modalBody').innerHTML = body; if (!$('modal').open) $('modal').showModal(); }
function closeModal() { if ($('modal').open) $('modal').close(); }

function interventionModal() {
  const actorOptions = state.bundle.actors.map(profile => `<option value="${esc(profile.id)}">${esc(profile.name)}</option>`).join('');
  const spaceOptions = state.bundle.spaces.map(selected => `<option value="${esc(selected.id)}">${esc(selected.name)}</option>`).join('');
  const resourceOptions = Object.keys(state.bundle.setting.resources || {}).map(key => `<option value="${esc(key)}">${esc(key)}</option>`).join('');
  openModal('上帝干预', 'WORLD CONSOLE', `<p>每次干预先经过边界检查，成功后只追加一条本地分支记录。主时间线不会被覆盖。</p><form id="interventionForm" class="form-grid"><label>操作<select name="type" id="interventionType"><option value="resource">调整资源</option><option value="move">移动角色</option><option value="broadcast">广播事件</option></select></label><label class="resource-field">资源<select name="resource">${resourceOptions}</select></label><label class="resource-field">数量<input name="amount" type="number" value="1" step="1"></label><label class="move-field" hidden>角色<select name="actorId">${actorOptions}</select></label><label class="move-field" hidden>目的地<select name="locationId">${spaceOptions}</select></label><label class="broadcast-field" hidden>广播内容<textarea name="text" placeholder="例如：过滤器外的路线暂时开放"></textarea></label><div id="interventionError" class="error-text"></div><div class="form-actions"><button type="button" class="button" id="cancelModal">取消</button><button class="button primary" type="submit">提交分支事件</button></div></form>`);
  const form = $('interventionForm');
  const type = $('interventionType');
  const refresh = () => ['resource', 'move', 'broadcast'].forEach(kind => document.querySelectorAll(`.${kind}-field`).forEach(element => { element.hidden = type.value !== kind; }));
  type.addEventListener('change', refresh);
  refresh();
  $('cancelModal').addEventListener('click', closeModal);
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(form));
      const record = makeIntervention(state.bundle, state.frame, {...data, amount: Number(data.amount)}, state.branch?.id || 'branch-local', (state.branch?.records?.length || 0) + 1);
      createBranchWithRecord(record);
      closeModal();
      notify('已提交到本地时间线分支');
    } catch (error) {
      $('interventionError').textContent = error.message;
    }
  });
}

function chatModal() {
  const options = state.bundle.actors.map(profile => `<option value="${esc(profile.id)}">${esc(profile.name)} · ${esc(profile.callsign)}</option>`).join('');
  openModal('沙盒对话', 'SANDBOX CHAT', `<p>沙盒只检索当前快照、角色档案和已发生的记忆，不会把自由回答写入世界事实。</p><div class="chat-messages" id="chatMessages">${state.chat.map(message => `<div class="chat-bubble ${message.role}">${esc(message.text)}${message.sources?.length ? `<small>来源：${esc(message.sources.join(' · '))}</small>` : ''}</div>`).join('') || '<p class="empty">选择角色，问一个关于目标、经历或资源的问题。</p>'}</div><div class="form-grid"><label>角色<select id="chatActor">${options}</select></label><div class="chat-presets"><button type="button" data-chat="你现在最想完成什么？">目标</button><button type="button" data-chat="你记得发生过什么？">经历</button><button type="button" data-chat="当前资源够用吗？">资源</button></div><label>提问<textarea id="chatInput" placeholder="问角色一个可从当前世界数据回答的问题"></textarea></label><div class="form-actions"><button type="button" class="button" id="cancelModal">关闭</button><button type="button" class="button primary" id="sendChat">发送</button></div></div>`);
  document.querySelectorAll('[data-chat]').forEach(button => button.addEventListener('click', () => { $('chatInput').value = button.dataset.chat; }));
  $('cancelModal').addEventListener('click', closeModal);
  $('sendChat').addEventListener('click', () => {
    const question = $('chatInput').value.trim();
    if (!question) return;
    const id = $('chatActor').value;
    const answer = sandboxReply(state.bundle, state.tick, id, question, state.frame);
    state.chat.push({role: 'user', text: question});
    state.chat.push({role: 'assistant', text: answer.text, sources: answer.sources});
    closeModal();
    chatModal();
  });
}

function branchModal() {
  openModal('新时间线', 'TIMELINE KEEPER', `<p>从当前快照建立一个隔离分支。分支记录与主时间线分开保存，可以随时切回。</p><form id="branchForm" class="form-grid"><label>分支名称<input name="title" value="未命名试验线" maxlength="40"></label><label>分支说明<textarea name="description" placeholder="这条分支想测试什么？"></textarea></label><div class="form-actions"><button type="button" class="button" id="cancelModal">取消</button><button class="button primary" type="submit">建立分支</button></div></form>`);
  $('cancelModal').addEventListener('click', closeModal);
  $('branchForm').addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    state.branch = {id: `branch-${Date.now()}`, title: data.title, description: data.description, baseTick: state.tick, records: []};
    syncBranchOptions();
    closeModal();
    render();
    notify('已建立隔离时间线');
  });
}
function syncBranchOptions() {
  $('branchSelect').innerHTML = state.branch ? `<option value="${esc(state.branch.id)}">${esc(state.branch.title)} · ${state.branch.records.length} 条修改</option><option value="main">主时间线 · 5 步存档</option>` : '<option value="main">主时间线 · 5 步存档</option>';
  $('branchSelect').value = state.branch?.id || 'main';
}
function createBranchWithRecord(record) {
  if (!state.branch) state.branch = {id: `branch-${Date.now()}`, title: '上帝干预试验线', description: '由世界控制台建立', baseTick: state.tick, records: []};
  state.branch.records.push(record);
  state.tick = Math.max(state.tick, Number(record.gameTime.tick));
  syncBranchOptions();
  render();
}
function exportBundle() {
  const blob = new Blob([JSON.stringify({worldId: state.bundle.setting.worldId, branch: state.branch, frame: state.frame, records: records()}, null, 2)], {type: 'application/json'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${state.bundle.setting.worldId}-${state.branch?.id || 'main'}-stage.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  notify('已导出当前时间线快照');
}

function loadImage(src) {
  if (!src) return null;
  if (state.imageCache.has(src)) return state.imageCache.get(src);
  const image = new Image();
  image.decoding = 'async';
  image.src = src;
  image.addEventListener('error', () => { state.imageErrors.add(src); renderHeader(); });
  image.addEventListener('load', () => drawSceneCanvas(performance.now()));
  state.imageCache.set(src, image);
  return image;
}
function drawFallback(ctx, x, y, color, direction, action, frameWidth, frameHeight) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(direction, 1);
  const bob = action === 'walk' ? -Math.abs(Math.sin(performance.now() / 90)) * 5 : 0;
  ctx.translate(0, bob);
  ctx.fillStyle = color;
  ctx.fillRect(-18, -104, 36, 52);
  ctx.fillStyle = '#dec39b';
  ctx.fillRect(-14, -124, 28, 24);
  ctx.fillStyle = '#30383a';
  ctx.fillRect(-16, -54, 14, 28);
  ctx.fillRect(2, -54, 14, 28);
  ctx.restore();
}
function drawPulse(ctx, x, y, color, radius, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
function drawSceneCanvas(timestamp) {
  const canvas = $('sceneCanvas');
  if (!canvas || !state.bundle || !state.frame) return;
  const ctx = canvas.getContext('2d');
  const [width, height] = mapSize();
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  ctx.clearRect(0, 0, width, height);
  const visualStyle = style();
  const sceneData = scene();
  const map = $('mapImage');
  if (map?.complete && map.naturalWidth) ctx.drawImage(map, 0, 0, width, height);
  else {
    ctx.fillStyle = visualStyle.palette?.night || '#1b1b26';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#ffffff16';
    for (let x = 0; x < width; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
    for (let y = 0; y < height; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
  }
  const actionEntries = Object.entries(state.frame.actors).map(([id, value]) => ({id, value, point: visualPointForActor(id, timestamp)})).sort((a, b) => a.point[1] - b.point[1]);
  for (const {id, value, point} of actionEntries) {
    const action = visualActionForActor(id);
    const [x, feetY] = pctToPixels(point);
    const direction = visualDirectionForActor(id, timestamp);
    const phase = prefersReducedMotion.matches ? 0 : timestamp / 1000;
    const motion = animationManifest().actors?.[id]?.actions?.[action] || animationManifest().defaults?.[action] || {};
    const cycle = phase * Math.PI * 2 * Number(motion.frequencyHz || 1);
    const amplitude = Number(motion.bobPx || 0);
    let bob = 0;
    let tilt = 0;
    if (action === 'walk') bob = -Math.abs(Math.sin(cycle + id.length)) * amplitude;
    else bob = Math.sin(cycle + id.length) * amplitude;
    tilt = Math.sin(cycle) * Number(motion.tiltRad || 0);
    const frameWidth = Number(animationManifest().defaultFrameSize?.[0] || 120) * Number(sceneData.actors?.[id]?.scale || 1);
    const frameHeight = Number(animationManifest().defaultFrameSize?.[1] || 180) * Number(sceneData.actors?.[id]?.scale || 1);
    ctx.save();
    ctx.globalAlpha = value.available === false ? 0.78 : 1;
    ctx.fillStyle = '#080b1359';
    ctx.beginPath();
    ctx.ellipse(x, feetY + 3, frameWidth * 0.27, frameWidth * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    if (state.selectedActor === id) drawPulse(ctx, x, feetY - frameHeight * 0.45, '#edc887', frameWidth * 0.43, 0.55 + Math.sin(phase * 4) * 0.12);
    const image = loadImage(actorImage(id));
    ctx.translate(x, feetY + bob);
    ctx.scale(direction, 1);
    ctx.rotate(tilt);
    if (image && image.complete && image.naturalWidth) {
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(image, -frameWidth / 2, -frameHeight, frameWidth, frameHeight);
    } else {
      drawFallback(ctx, 0, 0, fallbackColors[Math.abs(id.length) % fallbackColors.length], 1, action, frameWidth, frameHeight);
    }
    ctx.restore();
    if (action === 'talk') drawPulse(ctx, x, feetY - frameHeight * 0.92, '#7ed5bd', frameWidth * 0.15 + Math.sin(phase * 6) * 3, 0.3);
    if (action === 'interact') drawPulse(ctx, x, feetY - 14, '#edc887', 10 + Math.sin(phase * 8) * 3, 0.5);
  }
  for (const overlay of sceneData.occlusion || []) {
    const [x, y] = pctToPixels(overlay.point || [50, 50]);
    const radius = (overlay.radius || 8) / 100 * Math.min(width, height);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, overlay.color || '#080b1630');
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const effect of sceneData.effects || []) {
    if (effect.tick !== state.tick || effect.kind !== 'pulse') continue;
    const targetPoint = effect.actorId ? visualPointForActor(effect.actorId, timestamp) : effect.point;
    if (!targetPoint) continue;
    const [x, y] = pctToPixels(targetPoint);
    drawPulse(ctx, x, y - Number(effect.offsetY || 0), effect.color || '#7ed5bd', Number(effect.radius || 20) + Math.sin(timestamp / 200) * 4, 0.4);
  }
}

function setup() {
  $('timelineRange').addEventListener('input', event => setTick(event.target.value));
  $('playBtn').addEventListener('click', togglePlay);
  $('playTop').addEventListener('click', togglePlay);
  $('backBtn').addEventListener('click', () => setTick(state.tick - 1));
  $('nextBtn').addEventListener('click', () => setTick(state.tick + 1));
  $('speedBtn').addEventListener('click', () => { state.speed = state.speed === 1 ? 2 : state.speed === 2 ? 0.5 : 1; $('speedBtn').textContent = `${state.speed}×`; if (state.playing) { togglePlay(); togglePlay(); } });
  $('zoomIn').addEventListener('click', () => { state.zoom = Math.min(2, state.zoom + 0.1); scaleCamera(); renderMini(); });
  $('zoomOut').addEventListener('click', () => { state.zoom = Math.max(0.7, state.zoom - 0.1); scaleCamera(); renderMini(); });
  $('fitBtn').addEventListener('click', () => { state.zoom = 1; state.pan = [0, 0]; scaleCamera(); renderMini(); });
  $('pathsBtn').addEventListener('click', () => { state.showPaths = !state.showPaths; render(); });
  $('panelToggle').addEventListener('click', () => { state.panelCollapsed = false; render(); });
  $('collapsePanel').addEventListener('click', () => { state.panelCollapsed = true; render(); });
  $('branchSelect').addEventListener('change', event => { if (event.target.value === 'main') { state.branch = null; state.tick = 0; state.transition = null; syncBranchOptions(); render(); notify('已切回主时间线'); } else if (state.branch?.id === event.target.value) { state.tick = state.branch.baseTick; state.transition = null; render(); notify(`已切换到 ${state.branch.title}`); } });
  $('branchBtn').addEventListener('click', branchModal);
  $('godBtn').addEventListener('click', interventionModal);
  $('chatBtn').addEventListener('click', chatModal);
  $('exportBtn').addEventListener('click', exportBundle);
  $('aboutBtn').addEventListener('click', () => openModal('世界档案', 'WORLD CONCEIVER', `<p class="world-premise">${esc(state.bundle.setting.premise || state.bundle.setting.elevatorPitch)}</p><h3>物理规则</h3><p>${(state.bundle.setting.physicalRules || []).map(esc).join('<br>')}</p><h3>冲突轴</h3><p>${(state.bundle.setting.conflictAxes || []).map(esc).join('<br>')}</p>`));
  $('logBtn').addEventListener('click', () => openModal('事件日志', 'EVENT CHRONICLE', records().slice().reverse().map(record => `<article class="record-card"><header><span>T${record.gameTime.tick} · ${fmtTime(record.gameTime.time)}</span><span>${esc(record.type)}</span></header><p>${esc(eventDescription(record))}</p><button class="source-link" data-record="${esc(record.recordId)}">查看记录 ${esc(record.recordId)}</button></article>`).join('')));
  $('closeModal').addEventListener('click', closeModal);
  $('modal').addEventListener('click', event => { if (event.target === $('modal')) closeModal(); });
  document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => { state.tab = button.dataset.tab; document.querySelectorAll('[data-tab]').forEach(tab => tab.setAttribute('aria-selected', String(tab === button))); renderDetail(); }));
  $('dialogueDock').addEventListener('click', () => { const session = sessionsAt(state.bundle, state.tick).at(-1); if (session) showRecord(session.sourceRecordIds.at(-1)); else notify('当前时刻还没有正式对话'); });
  $('minimap').addEventListener('click', event => { const rect = $('minimap').getBoundingClientRect(); const point = [(event.clientX - rect.left) / rect.width * 100, (event.clientY - rect.top) / rect.height * 100]; state.pan = [(50 - point[0]) * state.stageSize[0] / 100, (50 - point[1]) * state.stageSize[1] / 100]; scaleCamera(); });
  $('stage').addEventListener('pointerdown', event => { if (event.target.closest('button,select,input,dialog')) return; state.drag = {x: event.clientX, y: event.clientY, pan: [...state.pan]}; $('stage').setPointerCapture(event.pointerId); });
  $('stage').addEventListener('pointermove', event => { if (!state.drag) return; state.pan = [state.drag.pan[0] + event.clientX - state.drag.x, state.drag.pan[1] + event.clientY - state.drag.y]; scaleCamera(); });
  $('stage').addEventListener('pointerup', event => { state.drag = null; try { $('stage').releasePointerCapture(event.pointerId); } catch {} });
  $('stage').addEventListener('wheel', event => { event.preventDefault(); state.zoom = clamp(state.zoom + (event.deltaY < 0 ? 0.08 : -0.08), 0.7, 2); scaleCamera(); renderMini(); }, {passive: false});
  document.addEventListener('keydown', event => { if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return; if (event.code === 'Space') { event.preventDefault(); togglePlay(); } if (event.key === 'ArrowRight') setTick(state.tick + 1); if (event.key === 'ArrowLeft') setTick(state.tick - 1); if (event.key === 'Escape' && $('modal').open) closeModal(); });
  window.addEventListener('resize', () => { scaleCamera(); render(); });
}

function initDust() {
  for (let index = 0; index < 26; index += 1) {
    const mote = document.createElement('i');
    mote.className = 'mote';
    mote.style.left = `${Math.random() * 100}%`;
    mote.style.top = `${50 + Math.random() * 55}%`;
    mote.style.setProperty('--duration', `${6 + Math.random() * 8}s`);
    mote.style.setProperty('--delay', `${-Math.random() * 9}s`);
    $('dust').append(mote);
  }
}

function sceneLoop(timestamp) {
  drawSceneCanvas(timestamp);
  if (state.transition) {
    for (const id of Object.keys(state.frame.actors)) {
      if (!isMovingInTransition(id)) continue;
      const target = $('actorLayer').querySelector(`[data-actor="${CSS.escape(id)}"]`);
      if (!target) continue;
      const point = visualPointForActor(id, timestamp);
      target.style.left = `${point[0]}%`;
      target.style.top = `${point[1]}%`;
    }
  }
  if (state.transition && timestamp >= state.transition.started + state.transition.duration) {
    state.transition = null;
    renderActors();
    renderBubbles();
    renderProfile();
  }
  requestAnimationFrame(sceneLoop);
}

async function init() {
  try {
    state.bundle = await getBundle();
    $('mapImage').addEventListener('error', () => { state.imageErrors.add(scene().map?.image || 'map'); renderHeader(); });
    state.selectedActor = state.bundle.scene.focusActorId || state.bundle.actors[0]?.id;
    document.body.classList.add('canvas-mode');
    initDust();
    setup();
    render();
    requestAnimationFrame(sceneLoop);
    $('stageError').hidden = true;
  } catch (error) {
    console.error(error);
    $('stageError').hidden = false;
    $('stageError').textContent = `舞台载入失败：${error.message}`;
  }
}

init();

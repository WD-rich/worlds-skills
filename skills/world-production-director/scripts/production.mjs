#!/usr/bin/env node
import {readFile, writeFile, readdir, stat, realpath, mkdir} from 'node:fs/promises';
import {resolve, dirname, relative, isAbsolute, join, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(skillRoot, '../..');
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const inside = (root, path) => { const r = relative(root, path); return r === '' || (!r.startsWith(`..${sep}`) && r !== '..' && !isAbsolute(r)); };
const safeRef = ref => typeof ref === 'string' && ref.length > 0 && !isAbsolute(ref) && !ref.split(/[\\/]/).some(p => p === '..' || p === '');
const exists = async path => { try { await stat(path); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };
const save = (path, value) => writeFile(path, JSON.stringify(value, null, 2) + '\n', {flag:'wx'});
const copy = value => structuredClone(value);
const modes = ['visual-rebuild', 'new-world', 'extend'];

export async function loadRegistry() {
  const registry = await json(join(skillRoot, 'references/capabilities.json'));
  if (registry.schemaVersion !== 'world-capabilities/v1' || !Array.isArray(registry.capabilities)) throw new Error('Unsupported capability registry.');
  const ids = registry.capabilities.map(c => c.id), known = new Set(ids);
  if (known.size !== ids.length) throw new Error('Duplicate capability ID.');
  const folders = await readdir(join(repoRoot, 'skills'), {withFileTypes:true});
  const installed = [];
  for (const f of folders) if (f.isDirectory() && await exists(join(repoRoot, 'skills', f.name, 'SKILL.md'))) installed.push(f.name);
  if (installed.some(id => !known.has(id)) || ids.some(id => !installed.includes(id))) throw new Error('Every Skill must have exactly one capability registry entry.');
  const active = new Set(), visited = new Set(), order = [];
  const visit = id => {
    if (!known.has(id)) throw new Error(`Unknown capability dependency: ${id}`);
    if (active.has(id)) throw new Error(`Capability cycle: ${id}`);
    if (visited.has(id)) return;
    active.add(id);
    const item = registry.capabilities.find(c => c.id === id);
    if (!['guided','partial','tool-backed'].includes(item.implementation) || !['guided','tool-backed','runtime-proven','release-proven'].includes(item.proofLevel) || !item.scope || !item.inputs?.length || !item.outputs?.length) throw new Error(`Incomplete capability: ${id}`);
    for (const dep of item.requires || []) visit(dep);
    active.delete(id); visited.add(id); order.push(id);
  };
  for (const c of registry.capabilities) {
    visit(c.id);
    for (const code of c.code) if (!safeRef(code) || !(await exists(join(repoRoot, code)))) throw new Error(`Missing implementation evidence: ${code}`);
  }
  return {...registry, order};
}

export async function loadProfile(id) {
  if (!/^[a-z][a-z0-9.-]*$/.test(id || '')) throw new Error('Provide a profile ID.');
  const profile = await json(join(skillRoot, 'assets/profiles', `${id}.json`));
  if (profile.schemaVersion !== 'world-visual-profile/v1' || profile.id !== id) throw new Error('Profile identity mismatch.');
  for (const key of ['assetRoles','viewports','states','visualCriteria','interactionCriteria']) if (!Array.isArray(profile[key]) || !profile[key].length) throw new Error(`Missing profile field: ${key}`);
  return profile;
}

async function worldRoot(world) {
  const root = await realpath(resolve(world));
  if (inside(repoRoot, root)) throw new Error('Generated plans and worlds belong outside the Skill repository.');
  return root;
}
async function containedFile(root, ref) {
  if (!safeRef(ref)) throw new Error(`Invalid relative reference: ${ref}`);
  const path = await realpath(resolve(root, ref));
  if (!inside(root, path) || !(await stat(path)).isFile()) throw new Error(`Reference is not a workspace file: ${ref}`);
  return path;
}
async function outputPath(root, ref) {
  if (!safeRef(ref) || !['production','reports'].includes(ref.split('/')[0])) throw new Error('Output must be a new relative directory under production/ or reports/.');
  const path = resolve(root, ref);
  let ancestor = path;
  while (!(await exists(ancestor))) ancestor = dirname(ancestor);
  if (!inside(root, await realpath(ancestor))) throw new Error('Output symlink escapes the workspace.');
  if (await exists(path)) throw new Error('Output already exists; use a new plan directory.');
  return path;
}
async function factHashes(root) {
  const result = {};
  async function walk(ref) {
    const path = resolve(root, ref);
    if (!(await exists(path))) return;
    const actual = await realpath(path);
    if (!inside(root, actual) || actual !== path) throw new Error(`World facts must not use symlinks: ${ref}`);
    if ((await stat(path)).isDirectory()) for (const name of (await readdir(path)).sort()) await walk(`${ref}/${name}`);
    else result[ref] = hash(await readFile(path));
  }
  for (const ref of ['manifest.json','content','runtime']) await walk(ref);
  return result;
}
const reviewRows = ids => ids.map(id => ({id, status:'pending', notes:'', evidence:[]}));
const phases = [
  ['inventory', ['world-production-director','world-audit'], '冻结能力清单、事实哈希、运行基线和用户目标。'],
  ['art-direction', ['stage-ui-director','scene-painter','sprite-forger'], '选定一种美术方案；锁定相机、角色/建筑比例、配色、UI 和资产槽位。'],
  ['hero-slice', ['scene-painter','sprite-forger','world-stage','stage-visual-qa'], '制作一条街、两个真实地图角色、一个交互点；走路、转向、遮挡、对话、选中可操作。'],
  ['scene-kit', ['atlas-builder','cast-forger','asset-pipeline-director'], '从达标切片扩充可复用场景组件和角色包，覆盖当前小规模世界。'],
  ['integration', ['world-stage','world-console','timeline-keeper','world-runner'], '接入回放与所有保留能力，核对角色、关系、库存、资源、记忆、分支和来源。'],
  ['acceptance', ['stage-visual-qa','world-audit'], '对实际构建做技术、美术、交互三项独立验收；通过后再扩规模。']
];

export async function createPlan({world, out, profile:profileId, mode='visual-rebuild', brief}) {
  if (!modes.includes(mode) || !brief?.trim()) throw new Error('Provide a mode and a concrete visual brief.');
  const root = await worldRoot(world), target = await outputPath(root, out);
  const registry = await loadRegistry(), profile = await loadProfile(profileId), facts = await factHashes(root);
  if (mode === 'visual-rebuild' && !facts['manifest.json']) throw new Error('A visual rebuild needs an existing world manifest.');
  const manifest = facts['manifest.json'] ? await json(join(root,'manifest.json')) : {};
  const planId = relative(root, target).split(sep).join('/');
  const plan = {
    schemaVersion:'world-production-plan/v1', planId, worldId:manifest.worldId || null, mode, brief, visualProfile:profileId,
    registryRevision:registry.revision, profileRevision:profile.revision, productionStatus:'planned',
    facts:{policy:mode === 'visual-rebuild' ? 'preserve' : 'validated-transactions', hashes:facts},
    scope:{scale:'current-small-world', expansion:'deferred', reason:'先让小规模真实画面和交互达标；规模扩展单独安排。'},
    capabilities:registry.capabilities.map(c => ({id:c.id, disposition:mode === 'visual-rebuild' && ['world','simulation'].includes(c.layer) ? 'preserve' : 'produce', implementation:c.implementation, proofLevel:c.proofLevel, scope:c.scope, result:'pending', evidence:[]})),
    extensions:[],
    phases:phases.map(([id,owners,goal]) => ({id, owners, goal, status:'pending', evidence:[]})),
    artifacts:profile.assetRoles.map(role => ({role, status:'pending', path:null, sha256:null})),
    evidence:{profile:`${planId}/profile.json`, review:`${planId}/review.json`}
  };
  if (mode !== 'visual-rebuild') plan.phases.splice(1, 0, {id:'world-runtime', owners:['world-conceiver','contract-keeper','cast-forger','atlas-builder','agent-cognition','life-director','dialogue-director','memory-weaver','story-chronicler'], goal:'实现/扩展事务内核与新事件，再核对关系、库存、对话、记忆与可恢复时间线。已有记录回放不能替代这项验证。',status:'pending',evidence:[]});
  const review = {
    schemaVersion:'world-production-review/v1', planId, visualProfile:profileId, build:null,
    technical:{status:'pending',checks:reviewRows(['replay-consistency','asset-integrity','nonblank-render','overflow-text-fit','offline-errors','capability-regression'])},
    visual:{status:'pending',reviewer:null,notes:'',criteria:reviewRows(profile.visualCriteria)},
    interaction:{status:'pending',checks:reviewRows(profile.interactionCriteria)},
    captures:[], remainingRisks:[]
  };
  await mkdir(dirname(target), {recursive:true}); await mkdir(target);
  await save(join(target,'plan.json'),plan); await save(join(target,'profile.json'),profile); await save(join(target,'review.json'),review);
  await writeFile(join(target,'plan.md'),renderPlan(plan,registry,profile),{flag:'wx'});
  return {status:'ok', outcome:'plan-created', visualAcceptance:'pending', path:join(target,'plan.json'),capabilityCount:plan.capabilities.length, phases:plan.phases.map(p=>p.id)};
}

function renderPlan(plan, registry, profile) {
  return `# 世界生产计划\n\n状态：仅计划；美术和交互尚未验收。\n\n${plan.brief}\n\n方案：${profile.title}（${profile.id}）。模式：${plan.mode}。\n\n## 执行顺序\n\n${plan.phases.map(p=>`- **${p.id}**：${p.goal} 负责：${p.owners.join('、')}。`).join('\n')}\n\n先验收可交互的美术切片，再扩完整小世界。所有被替换的代码、美术和布局都可重做；世界事实是否迁移以 plan.json 的模式为准。\n\n## 能力保全清单\n\n| 能力 | 本次处理 | 证明等级 | 当前实现范围 |\n| --- | --- | --- | --- |\n${plan.capabilities.map(c=>`| ${c.id} | ${c.disposition} | ${c.proofLevel} | ${c.scope} |`).join('\n')}\n\n## 交付门槛\n\n- 美术：${profile.visualCriteria.join('、')}。\n- 交互：${profile.interactionCriteria.join('、')}。\n- 状态：${profile.states.join('、')}。\n- 视口：${profile.viewports.map(v=>v.join('×')).join('、')}。\n- 正式地图、独立地图角色、方向动作、遮挡与导航数据全部绑定实际文件。\n- 技术检查通过、占位回退正常、概念图好看，都不代表正式画面通过。\n- review.json 中记录实际构建哈希、截图哈希和逐项审阅结论。\n\n## 扩展候选\n\n${registry.extensions.map(e=>`- ${e.id}：${e.status}；${e.proof}。`).join('\n')}\n\n新增能力须进入注册表、声明依赖和产物、提供迁移及回归证据。当前未安排十倍规模。\n`;
}

export async function auditPlan({world, plan:planRef, target='plan'}) {
  if (!['plan','release'].includes(target)) throw new Error('target must be plan or release.');
  const root = await worldRoot(world), plan = await json(await containedFile(root, planRef));
  const registry = await loadRegistry();
  const diagnostics = [], add = (code,message) => diagnostics.push({code,severity:'error',message});
  if (plan.schemaVersion !== 'world-production-plan/v1' || !modes.includes(plan.mode)) add('PLAN_SCHEMA','Unknown plan schema or mode.');
  const profile = await loadProfile(plan.visualProfile);
  const localProfile = await json(await containedFile(root, plan.evidence?.profile));
  if (JSON.stringify(localProfile) !== JSON.stringify(profile)) add('PROFILE_CHANGED','Project profile differs from its declared recipe; version the recipe before changing production contracts.');
  const ids = plan.capabilities?.map(c=>c.id) || [];
  if (new Set(ids).size !== ids.length || ids.length !== registry.capabilities.length || registry.capabilities.some(c=>!ids.includes(c.id))) add('CAPABILITY_LOSS','Plan must account for every registered Skill exactly once.');
  for (const c of plan.capabilities || []) {
    if (!['preserve','produce','deferred'].includes(c.disposition)) add('CAPABILITY_SCOPE',`Invalid disposition: ${c.id}`);
    if (c.disposition === 'deferred' && !c.reason?.trim()) add('CAPABILITY_DEFERRED',`Explain deferral of ${c.id}; preserve user-required features.`);
  }
  for (const extension of plan.extensions || []) if (!registry.extensions.some(e=>e.id===extension.id)) add('UNKNOWN_EXTENSION',`Register extension ${extension.id} before planning it.`);
  if (plan.mode === 'visual-rebuild') {
    if (plan.facts?.policy !== 'preserve') add('FACT_POLICY','Visual rebuilds must preserve world facts.');
    const actual = await factHashes(root);
    if (JSON.stringify(actual) !== JSON.stringify(plan.facts?.hashes)) add('FACTS_CHANGED','World content/runtime was changed, removed, or added during a visual rebuild.');
  }
  if (target === 'plan') return {status:diagnostics.length?'failed':'ok',outcome:'plan-check',visualAcceptance:'not-assessed',diagnostics};
  const checkFile = async (ref, label, screenshot=false) => {
    try {
      if (!ref || !/^[a-f0-9]{64}$/.test(ref.sha256 || '')) throw new Error('Missing SHA-256.');
      const bytes = await readFile(await containedFile(root,ref.path));
      if (!bytes.length || hash(bytes) !== ref.sha256) throw new Error('Missing content or hash mismatch.');
      if (screenshot && (bytes.length < 33 || bytes.toString('hex',0,8) !== '89504e470d0a1a0a')) throw new Error('Runtime capture must be a PNG.');
      return bytes;
    } catch(e) { add('EVIDENCE_FILE',`${label}: ${e.message}`); return null; }
  };
  const review = await json(await containedFile(root,plan.evidence.review));
  if (review.schemaVersion !== 'world-production-review/v1' || review.planId !== plan.planId || review.visualProfile !== profile.id) add('REVIEW_IDENTITY','Review must identify this plan and profile.');
  const buildBytes = await checkFile(review.build,'build manifest');
  if (buildBytes) {
    try {
      const build = JSON.parse(buildBytes);
      if (build.schemaVersion !== 'world-stage-build/v1' || !build.files?.length) throw new Error('Build manifest must enumerate actual built files.');
      for (const f of build.files) await checkFile(f,'built file');
    } catch(e) { add('BUILD_MANIFEST',e.message); }
  }
  for (const role of profile.assetRoles) {
    const items = (plan.artifacts || []).filter(a=>a.role===role);
    if (!items.length) add('ASSET_ROLE',`Missing ${role}.`);
    for (const asset of items) {
      if (asset.status !== 'approved' || asset.fallback || asset.artDebt) add('PLACEHOLDER_ART',`${role}: pending, concept, or fallback art cannot be released.`);
      await checkFile(asset,role);
    }
  }
  const groups = [['technical','checks',['replay-consistency','asset-integrity','nonblank-render','overflow-text-fit','offline-errors','capability-regression']],['visual','criteria',profile.visualCriteria],['interaction','checks',profile.interactionCriteria]];
  for (const [group,key,required] of groups) {
    if (review[group]?.status !== 'pass') add('REVIEW_PENDING',`${group} review has not passed.`);
    for (const id of required) {
      const row = review[group]?.[key]?.find(r=>r.id===id);
      if (row?.status !== 'pass' || !row.notes?.trim() || !row.evidence?.length) add('REVIEW_CRITERION',`${group}.${id}: recorded findings and file evidence are required.`);
      for (const ref of row?.evidence || []) await checkFile(ref,`${group}.${id}`);
    }
  }
  if (!review.visual?.reviewer || !review.visual?.notes?.trim()) add('VISUAL_REVIEW','Name the visual reviewer and record comparison findings.');
  const matrix = profile.states.map(state=>({state,viewport:state==='narrow'?profile.viewports.at(-1):profile.viewports[0]}));
  for (const viewport of profile.viewports.slice(1,-1)) matrix.push({state:'overview',viewport});
  for (const required of matrix) {
    const capture = review.captures?.find(c=>c.state===required.state && JSON.stringify(c.viewport)===JSON.stringify(required.viewport));
    if (!capture || capture.kind !== 'runtime-screenshot' || !Number.isInteger(capture.tick) || capture.tick<0 || !review.build?.sha256 || capture.buildSha256 !== review.build.sha256) { add('CAPTURE_MISSING',`Need real ${required.state} capture at ${required.viewport.join('x')} bound to this build.`); continue; }
    const bytes = await checkFile(capture,`capture ${required.state}`,true);
    if (bytes && (bytes.readUInt32BE(16)!==required.viewport[0] || bytes.readUInt32BE(20)!==required.viewport[1])) add('CAPTURE_SIZE','Capture pixels do not match the declared viewport.');
  }
  return {status:diagnostics.length?'failed':'ok',outcome:'release-evidence-check',visualAcceptance:diagnostics.length?'not-accepted':'recorded-review-complete',automatedArtJudgment:false,diagnostics};
}

export async function main(argv) {
  const [command,...args] = argv;
  const opts = {};
  for (let i=0;i<args.length;i+=2) {
    if (!args[i].startsWith('--') || !args[i+1] || args[i+1].startsWith('--')) throw new Error(`Invalid argument ${args[i]}`);
    opts[args[i].slice(2)] = args[i+1];
  }
  if (command==='catalog') return loadRegistry();
  if (command==='init') return createPlan(opts);
  if (command==='check') return auditPlan(opts);
  throw new Error('Usage: production.mjs catalog | init --world <dir> --out production/<id> --profile <id> --mode visual-rebuild|new-world|extend --brief <text> | check --world <dir> --plan production/<id>/plan.json --target plan|release');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { const report = await main(process.argv.slice(2)); console.log(JSON.stringify(report,null,2)); process.exitCode = report.status==='failed'?1:0; }
  catch(e) { console.error(JSON.stringify({status:'failed',diagnostics:[{code:'PRODUCTION_INPUT',severity:'error',message:e.message}]})); process.exitCode=1; }
}

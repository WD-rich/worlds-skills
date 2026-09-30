#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, realpath, stat } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderPreview } from './preview.mjs';

const localKinds = new Set(['json.bundle', 'asset.copy', 'sprite.inspect']);
const idPattern = /^[a-z0-9][a-z0-9_-]{0,79}$/;
const fileKinds = new Set(['png', 'jpg', 'jpeg', 'webp', 'glb', 'gltf', 'obj', 'fbx', 'usd', 'usdz', 'json', 'txt', 'md']);
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const hash = bytes => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
const jsonBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const slash = path => path.split(sep).join('/');
const inside = (base, path) => { const part = relative(base, path); return part === '' || (!part.startsWith(`..${sep}`) && part !== '..' && !isAbsolute(part)); };
const exists = async path => { try { await stat(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
const refPath = ref => typeof ref === 'string' && ref.length > 0 && !isAbsolute(ref) && !ref.split(/[\\/]/).some(part => part === '..' || part === 'runtime');

export function validatePipeline(pipeline) {
  const diagnostics = [];
  const error = (code, message) => diagnostics.push({ code, severity: 'error', message });
  if (!object(pipeline)) return { diagnostics: [{ code: 'SHAPE', severity: 'error', message: 'Pipeline must be an object.' }], order: [] };
  if (pipeline.schemaVersion !== 'asset-pipeline/v0.1') error('SCHEMA', 'Expected asset-pipeline/v0.1.');
  if (!idPattern.test(pipeline.pipelineId ?? '') || !Number.isInteger(pipeline.version) || pipeline.version < 1) error('IDENTITY', 'Use a stable pipelineId and positive integer version.');
  for (const key of ['inputs', 'nodes', 'outputs']) if (!Array.isArray(pipeline[key]) || !pipeline[key].length) error('ARRAY', `${key} must be a nonempty array.`);
  if (diagnostics.length) return { diagnostics, order: [] };
  const slots = new Map(), nodes = new Map(), published = new Set();
  for (const input of pipeline.inputs) {
    if (!object(input) || !idPattern.test(input.id ?? '') || slots.has(input.id)) { error('INPUT_ID', 'Input IDs must be unique safe identifiers.'); continue; }
    if (typeof input.kind !== 'string' || !input.kind) error('INPUT_KIND', `${input.id} needs kind.`);
    if (('ref' in input) === ('value' in input)) error('INPUT_VALUE', `${input.id} needs exactly one of ref/value.`);
    if ('ref' in input && !refPath(input.ref)) error('INPUT_PATH', `${input.id} must reference a relative asset/content file outside runtime.`);
    if (input.hash && !/^sha256:[a-f0-9]{64}$/.test(input.hash)) error('INPUT_HASH', `${input.id} hash must be sha256:<digest>.`);
    slots.set(input.id, null);
  }
  for (const node of pipeline.nodes) {
    if (!object(node) || !idPattern.test(node.id ?? '') || nodes.has(node.id)) { error('NODE_ID', 'Node IDs must be unique safe identifiers.'); continue; }
    nodes.set(node.id, node);
    if (typeof node.kind !== 'string' || typeof node.provider !== 'string' || !node.provider || typeof node.capability !== 'string') error('NODE_FIELDS', `${node.id} needs kind, provider, capability.`);
    if (!Array.isArray(node.in) || node.in.some(id => !idPattern.test(id))) error('NODE_INPUTS', `${node.id}.in must be an array of slot IDs.`);
    if (!Array.isArray(node.out) || node.out.length !== 1 || !idPattern.test(node.out[0])) { error('NODE_OUTPUT', `${node.id} must produce exactly one slot.`); continue; }
    if (slots.has(node.out[0])) error('DUPLICATE_SLOT', `Slot ${node.out[0]} is produced more than once.`);
    slots.set(node.out[0], node.id);
    if (node.provider === 'local' && !localKinds.has(node.kind)) error('UNSUPPORTED_LOCAL', `${node.kind} has no local implementation.`);
    if (node.provider === 'local' && node.result) error('LOCAL_OVERRIDE', `${node.id}: result is for provider nodes only.`);
    if (node.provider === 'local' && ['asset.copy', 'sprite.inspect'].includes(node.kind) && node.in?.length !== 1) error('INPUT_COUNT', `${node.kind} needs exactly one input.`);
    if (node.settings !== undefined && !object(node.settings)) error('SETTINGS', `${node.id}.settings must be an object.`);
    if (node.result !== undefined && (!object(node.result) || !refPath(node.result.ref) || typeof node.result.kind !== 'string')) error('RESULT', `${node.id}.result needs a relative ref and kind.`);
    if (node.optional !== undefined && typeof node.optional !== 'boolean') error('OPTIONAL', `${node.id}.optional must be boolean.`);
    if (node.settings?.maxBytes !== undefined && (!Number.isInteger(node.settings.maxBytes) || node.settings.maxBytes <= 0)) error('BUDGET', `${node.id}.settings.maxBytes must be a positive integer.`);
    if (node.kind === 'sprite.inspect') {
      const anchor = node.settings?.anchor;
      if (!object(anchor) || !['x', 'y'].every(axis => typeof anchor[axis] === 'number' && anchor[axis] >= 0 && anchor[axis] <= 1)) error('ANCHOR', `${node.id} needs a normalized anchor {x,y}.`);
    }
  }
  for (const node of nodes.values()) {
    for (const slot of [...(Array.isArray(node.in) ? node.in : []), ...(node.fallbackSlot === undefined ? [] : [node.fallbackSlot])]) {
      if (typeof slot !== 'string' || !slots.has(slot)) error('UNRESOLVED_SLOT', `${node.id} references unknown slot ${String(slot)}.`);
    }
  }
  for (const output of pipeline.outputs) {
    if (!object(output) || !slots.has(output.id) || published.has(output.id)) error('PUBLISHED_SLOT', 'Published outputs must reference unique existing slots.');
    else published.add(output.id);
  }
  if (diagnostics.length) return { diagnostics, order: [] };
  const order = [], visited = new Set(), active = new Set();
  function visit(id) {
    if (active.has(id)) { error('CYCLE', `Cycle at ${id}.`); return; }
    if (visited.has(id)) return;
    active.add(id);
    const node = nodes.get(id);
    for (const slot of [...node.in, ...(node.fallbackSlot ? [node.fallbackSlot] : [])]) {
      const parent = slots.get(slot);
      if (parent) visit(parent);
    }
    active.delete(id); visited.add(id); order.push(node);
  }
  for (const id of nodes.keys()) visit(id);
  return { diagnostics, order };
}

async function readArtifact(root, spec) {
  if (!spec.ref) return makeArtifact(jsonBytes(spec.value), { kind: spec.kind, format: 'json', source: 'inline' });
  if (!refPath(spec.ref)) throw new Error(`Invalid input reference: ${spec.ref}`);
  const path = await realpath(resolve(root, spec.ref));
  if (!inside(root, path) || relative(root, path).split(sep).includes('runtime')) throw new Error(`Input escapes the asset workspace: ${spec.ref}`);
  if (!(await stat(path)).isFile()) throw new Error(`Input is not a file: ${spec.ref}`);
  const format = extname(path).slice(1).toLowerCase();
  if (!fileKinds.has(format)) throw new Error(`Unsupported import format: ${format}`);
  const artifact = makeArtifact(await readFile(path), { kind: spec.kind, format, source: slash(relative(root, path)) });
  if (spec.hash && spec.hash !== artifact.hash) throw new Error(`Hash mismatch for ${spec.ref}`);
  return artifact;
}

function makeArtifact(bytes, fields) {
  const artifact = { ...fields, bytes, hash: hash(bytes), sizeBytes: bytes.length };
  if (fields.format === 'json') JSON.parse(bytes.toString('utf8'));
  if (fields.format === 'png') {
    if (bytes.length < 33 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Invalid PNG header.');
    artifact.width = bytes.readUInt32BE(16); artifact.height = bytes.readUInt32BE(20);
    artifact.alphaChannel = [4, 6].includes(bytes[25]);
    if (!artifact.width || !artifact.height) throw new Error('PNG has empty dimensions.');
  }
  return artifact;
}

const publicArtifact = artifact => { const { bytes, ...fields } = artifact; return fields; };

function processLocal(node, inputs) {
  const settings = node.settings ?? {};
  if (node.kind === 'asset.copy') return { ...inputs[0] };
  if (node.kind === 'json.bundle') return makeArtifact(jsonBytes({
    schemaVersion: 'asset-brief-bundle/v0.1',
    inputs: Object.fromEntries(node.in.map((id, i) => [id, inputs[i].format === 'json' ? JSON.parse(inputs[i].bytes.toString('utf8')) : publicArtifact(inputs[i])])),
    constraints: settings,
  }), { kind: settings.outputKind ?? 'brief', format: 'json', source: `local:${node.id}` });
  if (node.kind === 'sprite.inspect') {
    const input = inputs[0];
    if (input.format !== 'png') throw new Error('sprite.inspect supports PNG only.');
    return makeArtifact(jsonBytes({
      schemaVersion: 'sprite-inspection/v0.1', sourceHash: input.hash,
      width: input.width, height: input.height, alphaChannel: input.alphaChannel,
      anchor: settings.anchor, frameCount: 1, animationMode: 'static-source',
      checks: { dimensions: 'passed', anchorRange: 'passed', transparentBounds: 'unknown', frameAnimation: 'not-produced', visualQuality: 'pending' },
    }), { kind: 'sprite-metadata', format: 'json', source: `local:${node.id}` });
  }
  throw new Error(`No local executor for ${node.kind}`);
}

async function safeOutput(root, out) {
  const path = resolve(root, out);
  if (path === root || !inside(root, path)) throw new Error('Output must be a directory inside the world workspace.');
  if (!['visuals', 'reports'].includes(relative(root, path).split(sep)[0])) throw new Error('Output must be under visuals/ or reports/, never content/ or runtime/.');
  let ancestor = path;
  while (!(await exists(ancestor))) ancestor = dirname(ancestor);
  const realAncestor = await realpath(ancestor);
  if (!inside(root, realAncestor) || (realAncestor !== root && !['visuals', 'reports'].includes(relative(root, realAncestor).split(sep)[0]))) throw new Error('Output symlink escapes the presentation directories.');
  const skillRoot = await realpath(resolve(dirname(fileURLToPath(import.meta.url)), '../../..'));
  if (inside(skillRoot, path) || inside(skillRoot, realAncestor)) throw new Error('Generated assets belong in the caller workspace, outside the Skill repository.');
  return path;
}

export async function runPipeline({ pipelinePath, root: requestedRoot, mode = 'run', out }) {
  const report = { schemaVersion: 'asset-pipeline-report/v0.1', status: 'ok', mode, execution: mode === 'run' ? 'local-and-imported' : mode, orchestrator: 'codex', externalCalls: 0, inputs: [], nodes: [], artifacts: [], diagnostics: [], next: [] };
  const error = (code, message) => report.diagnostics.push({ code, severity: 'error', message });
  let outputDirectory;
  try {
    if (!['validate', 'plan', 'run'].includes(mode)) throw new Error(`Unsupported mode: ${mode}`);
    const root = await realpath(resolve(requestedRoot));
    const pipeline = JSON.parse(await readFile(resolve(pipelinePath), 'utf8'));
    report.pipelineId = pipeline?.pipelineId ?? null; report.pipelineVersion = pipeline?.version ?? null; report.orchestrator = pipeline?.orchestrator ?? 'codex';
    const validation = validatePipeline(pipeline);
    report.diagnostics.push(...validation.diagnostics);
    if (validation.diagnostics.length) { report.status = 'failed'; return report; }
    if (out !== undefined) outputDirectory = await safeOutput(root, out);
    if (mode === 'run' && !outputDirectory) throw new Error('run requires --out visuals/<versioned-directory>.');
    if (mode === 'validate') { report.diagnostics.push({ code: 'VALID_GRAPH', severity: 'info', message: 'Graph only: files, providers, exports, and visual quality have not been checked.' }); return report; }
    const slots = new Map(), dependencies = [], generated = new Map();
    for (const input of pipeline.inputs) {
      try {
        const artifact = await readArtifact(root, input);
        slots.set(input.id, artifact); dependencies.push([input.id, artifact.hash]);
        report.inputs.push({ id: input.id, status: 'verified', ...publicArtifact(artifact) });
      } catch (cause) { error('INPUT_READ', `${input.id}: ${cause.message}`); report.inputs.push({ id: input.id, status: 'missing' }); }
    }
    for (const node of validation.order) {
      const inputs = node.in.map(id => slots.get(id));
      const result = { nodeId: node.id, kind: node.kind, provider: node.provider, model: node.model ?? null, status: 'planned', inputHashes: Object.fromEntries(node.in.map((id, i) => [id, inputs[i]?.hash ?? null])), settingsHash: hash(jsonBytes(node.settings ?? {})), outputHashes: {}, creditsUsed: 0 };
      const start = performance.now();
      try {
        if (inputs.some(input => !input)) { result.status = 'blocked'; result.reason = 'An input has no real artifact.'; }
        else if (mode === 'plan') {
          result.reason = node.provider === 'local' ? 'Local operation, not executed.' : node.result ? 'Supplied result, not imported.' : node.fallback ? `Would reuse ${node.fallback}; no generation.` : 'Provider executor is not configured.';
          const format = node.kind.includes('image') || node.kind.includes('sprite') ? 'png' : inputs[0]?.format ?? 'json';
          const planned = { kind: node.settings?.outputKind ?? node.kind, format, source: `plan:${node.id}`, hash: hash(jsonBytes({ pipeline: pipeline.pipelineId, node: node.id, settings: node.settings ?? {} })), sizeBytes: 0 };
          slots.set(node.out[0], planned); result.outputHashes[node.out[0]] = planned.hash;
        }
        else {
          let artifact;
          if (node.provider === 'local') { artifact = processLocal(node, inputs); result.status = 'completed'; }
          else if (node.result) {
            try { artifact = await readArtifact(root, node.result); dependencies.push([node.id, artifact.hash]); result.status = 'imported'; result.reason = 'Imported a supplied result; this command did not invoke the provider.'; }
            catch (cause) { if (!node.fallback) throw cause; report.diagnostics.push({ code: 'RESULT_FALLBACK', severity: 'warning', message: `${node.id}: ${cause.message}` }); }
          }
          if (!artifact && node.fallbackSlot && slots.has(node.fallbackSlot)) { artifact = { ...slots.get(node.fallbackSlot) }; result.status = 'fallback'; result.fallback = node.fallbackSlot; result.reason = 'Reused the named local asset; no generation occurred.'; }
          if (!artifact && !['completed', 'imported'].includes(result.status)) { result.status = node.optional ? 'skipped' : 'blocked'; result.reason = 'No provider executor, supplied result, or usable fallback.'; report.next.push({ nodeId: node.id, action: 'Provide a generated result.ref, or a usable fallback slot. This CLI makes no provider calls.' }); }
          if (artifact) {
            if (node.settings?.maxBytes && artifact.sizeBytes > node.settings.maxBytes) throw new Error(`Asset exceeds maxBytes (${artifact.sizeBytes} > ${node.settings.maxBytes}).`);
            const path = `assets/${node.out[0]}.${artifact.format}`;
            artifact = { ...artifact, path }; slots.set(node.out[0], artifact); result.outputHashes[node.out[0]] = artifact.hash; generated.set(path, artifact.bytes);
          }
        }
      } catch (cause) { result.status = 'failed'; result.reason = cause.message; error('NODE_FAILED', `${node.id}: ${cause.message}`); }
      result.durationMs = Math.round(performance.now() - start); report.nodes.push(result);
    }
    for (const output of pipeline.outputs) {
      const artifact = slots.get(output.id);
      if (!artifact) { if (mode === 'run') report.next.push({ slot: output.id, action: 'Published output is unavailable; resolve its producer.' }); continue; }
      const path = artifact.path ?? `assets/${output.id}.${artifact.format}`;
      if (mode === 'run') generated.set(path, artifact.bytes);
      report.artifacts.push({ id: output.id, consumer: output.consumer ?? null, ...publicArtifact(artifact), path: mode === 'run' ? path : null, review: 'pending', status: mode === 'run' ? 'available' : 'input-only' });
    }
    report.status = report.diagnostics.some(d => d.severity === 'error') ? 'failed' : mode === 'run' && (report.nodes.some(n => n.status === 'blocked') || report.artifacts.length !== pipeline.outputs.length) ? 'needs_input' : 'ok';
    report.fingerprint = hash(jsonBytes({ pipeline, dependencies }));
    report.review = { technical: report.status === 'ok' && mode === 'run' ? 'passed' : 'not-passed', visual: 'pending', animation: 'not-produced', meshOptimization: 'not-performed' };
    report.diagnostics.push({ code: 'VISUAL_REVIEW_REQUIRED', severity: 'info', message: 'File/graph checks do not prove visual quality, animation, transparency, topology, or engine readiness.' });
    if (outputDirectory && mode === 'run') {
      const manifestPath = resolve(outputDirectory, 'manifest.json');
      if (await exists(manifestPath)) { const prior = JSON.parse(await readFile(manifestPath, 'utf8')); if (prior.fingerprint !== report.fingerprint) throw new Error('This export contains different inputs/settings. Use a new version and output directory.'); }
      if (report.status === 'ok') {
        for (const [name, bytes] of generated) {
          const target = resolve(outputDirectory, name); await safeOutput(root, slash(relative(root, dirname(target))));
          if (await exists(target)) {
            const actual = await realpath(target);
            if (actual !== target || !inside(root, actual) || hash(await readFile(target)) !== hash(bytes)) throw new Error(`Export conflict: ${name}`);
          }
        }
      }
      for (const file of ['report.json', 'manifest.json', 'index.html']) { const target = resolve(outputDirectory, file); if (await exists(target) && await realpath(target) !== target) throw new Error(`Refusing a symlink output: ${file}`); }
      await mkdir(outputDirectory, { recursive: true });
      if (report.status === 'ok') {
        let reused = 0;
        for (const [name, bytes] of generated) { const target = resolve(outputDirectory, name); if (await exists(target)) { reused += 1; continue; } await mkdir(dirname(target), { recursive: true }); await writeFile(target, bytes, { flag: 'wx' }); }
        report.reusedFiles = reused;
        await writeFile(manifestPath, jsonBytes({ schemaVersion: 'asset-export/v0.1', pipelineId: pipeline.pipelineId, version: pipeline.version, fingerprint: report.fingerprint, assets: report.artifacts }));
      } else { report.artifacts = []; report.next.push({ action: 'No asset bundle was published. Resolve the diagnostics and rerun.' }); }
      await writeFile(resolve(outputDirectory, 'report.json'), jsonBytes(report));
      await writeFile(resolve(outputDirectory, 'index.html'), renderPreview(report));
    }
  } catch (cause) { report.status = 'failed'; error('PIPELINE_FAILED', cause.message); }
  return report;
}

export async function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) { console.log('node tools/asset-pipeline.mjs <pipeline.json> --root WORLD [--mode validate|plan|run] [--out visuals/exports/pack-v1]'); return; }
  try {
    const [pipelinePath, ...args] = argv, options = {};
    for (let i = 0; i < args.length; i += 2) { if (!['--root', '--mode', '--out'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || options[args[i].slice(2)] !== undefined) throw new Error(`Invalid argument: ${args[i]}`); options[args[i].slice(2)] = args[i + 1]; }
    if (!pipelinePath || pipelinePath.startsWith('-') || !options.root) throw new Error('Provide pipeline.json and --root WORLD. Use --help for usage.');
    const report = await runPipeline({ pipelinePath, ...options }); console.log(JSON.stringify(report, null, 2)); process.exitCode = report.status === 'ok' ? 0 : 1;
  } catch (cause) { console.error(JSON.stringify({ status: 'failed', diagnostics: [{ code: 'CLI', message: cause.message }] }, null, 2)); process.exitCode = 2; }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main(process.argv.slice(2));

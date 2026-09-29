#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, relative } from "node:path";

const [, , workspaceArg, ...args] = process.argv;

if (!workspaceArg || args.includes("--help") || args.includes("-h")) {
  console.log(`Usage: node tools/world-check.mjs <workspace> [--mode all|audit|replay|run] [--ticks N] [--out path]`);
  process.exit(workspaceArg ? 0 : 2);
}

const workspace = resolve(workspaceArg);
const mode = valueAfter("--mode") ?? "all";
const requestedTicks = Number(valueAfter("--ticks") ?? "0");
const outputArg = valueAfter("--out");

const loaded = await loadWorkspace(workspace);
const audit = auditWorkspace(loaded);
const replay = replayWorkspace(loaded, requestedTicks || undefined);
const run = runSummary(loaded, replay);

const report = {
  schemaVersion: loaded.manifest.schemaVersion ?? "0.2",
  workspace: relative(process.cwd(), workspace) || ".",
  workspaceId: loaded.manifest.workspaceId ?? null,
  worldId: loaded.manifest.worldId ?? loaded.state?.worldId ?? null,
  mode,
  status: audit.status === "ok" && replay.status === "ok" ? "ok" : "failed",
  counts: {
    spaces: loaded.spaces.length,
    actors: Object.keys(loaded.state?.actors ?? {}).length,
    records: loaded.records.length,
    snapshots: loaded.snapshots.length,
    replayTicks: replay.appliedTicks,
  },
  audit,
  replay,
  run,
};

const output = outputArg ? resolve(workspace, outputArg) : null;
if (output) {
  await mkdir(resolve(output, ".."), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
}

if (mode === "audit") console.log(JSON.stringify(audit, null, 2));
else if (mode === "replay") console.log(JSON.stringify(replay, null, 2));
else if (mode === "run") console.log(JSON.stringify(run, null, 2));
else console.log(JSON.stringify(report, null, 2));

process.exitCode = report.status === "ok" ? 0 : 1;

function valueAfter(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

async function loadWorkspace(root) {
  const manifest = await readJson(join(root, "manifest.json"));
  const artifact = (name, fallback) => resolve(root, manifest.artifacts?.[name] ?? fallback);
  const spacesFile = artifact("spaces", "content/spaces.json");
  const spacesDoc = await readJson(spacesFile);
  const spaces = Array.isArray(spacesDoc) ? spacesDoc : spacesDoc.spaces ?? [];

  const actorRoot = artifact("actors", "content/actors");
  let actorFiles = [];
  if (existsSync(actorRoot)) {
    const statEntries = await readdir(actorRoot, { withFileTypes: true });
    actorFiles = statEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && entry.name !== "index.json")
      .map((entry) => join(actorRoot, entry.name))
      .sort();
  }
  const actors = [];
  for (const file of actorFiles) actors.push(await readJson(file));

  const recordsPath = artifact("records", "runtime/records.ndjson");
  const records = (await readFile(recordsPath, "utf8"))
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try { return JSON.parse(line); }
      catch (error) { return { recordId: `invalid-${index}`, __parseError: String(error) }; }
    });

  const snapshotRoot = resolve(root, "runtime/snapshots");
  const snapshots = existsSync(snapshotRoot)
    ? await Promise.all((await readdir(snapshotRoot)).filter((name) => name.endsWith(".json")).sort().map((name) => readJson(join(snapshotRoot, name))))
    : [];
  const state = await readJson(artifact("state", "runtime/state.json"));
  const relationshipsPath = artifact("relationships", "content/relationships.json");
  const relationships = existsSync(relationshipsPath) ? await readJson(relationshipsPath) : null;
  return { root, manifest, spaces, actors, records, snapshots, state, relationships };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function auditWorkspace(world) {
  const diagnostics = [];
  const info = (code, message, extra = {}) => diagnostics.push({ code, severity: "info", status: "pass", message, ...extra });
  const fail = (code, message, extra = {}) => diagnostics.push({ code, severity: "error", status: "fail", message, ...extra });
  const actorIds = new Set(world.actors.map((actor) => actor.id));
  const spaceIds = new Set(world.spaces.map((space) => space.id));
  const stateActors = new Set(Object.keys(world.state.actors ?? {}));
  const count = world.manifest.counts;

  if (!world.manifest.schemaVersion || !world.manifest.workspaceId || !world.manifest.worldId) {
    fail("MANIFEST_FIELDS", "manifest 缺少 schemaVersion、workspaceId 或 worldId。");
  } else info("MANIFEST_FIELDS", "manifest 字段完整。");

  if (count?.spaces !== undefined && count.spaces !== world.spaces.length) fail("SPACE_COUNT", `manifest 声明 ${count.spaces} 个空间，实际 ${world.spaces.length} 个。`);
  else info("SPACE_COUNT", `空间数量 ${world.spaces.length}。`);
  if (count?.actors !== undefined && count.actors !== world.actors.length) fail("ACTOR_COUNT", `manifest 声明 ${count.actors} 个角色，实际 ${world.actors.length} 个。`);
  else info("ACTOR_COUNT", `角色数量 ${world.actors.length}。`);

  const adjacency = new Map(world.spaces.map((space) => [space.id, new Set(space.adjacentSpaceIds ?? space.neighborIds ?? [])]));
  for (const [spaceId, neighbors] of adjacency) {
    for (const neighbor of neighbors) {
      if (!spaceIds.has(neighbor)) fail("DANGLING_SPACE", `${spaceId} 引用了不存在的空间 ${neighbor}。`);
      else if (!adjacency.get(neighbor)?.has(spaceId)) fail("ASYMMETRIC_SPACE", `${spaceId} 与 ${neighbor} 的邻接不是双向。`);
    }
  }
  const connected = world.spaces.length === 0 || walk(adjacency, world.spaces[0].id).size === world.spaces.length;
  if (!connected) fail("SPACE_GRAPH_DISCONNECTED", "空间图不是连通图。");
  else info("SPACE_GRAPH_CONNECTED", `空间图连通，${world.spaces.length} 个空间。`);

  for (const actor of world.actors) {
    if (!actor.id || !actor.profile || !actor.state) fail("ACTOR_SHAPE", `角色 ${actor.id ?? "unknown"} 缺少 profile 或 state。`);
    if (actor.state?.locationId && !spaceIds.has(actor.state.locationId)) fail("ACTOR_LOCATION", `${actor.id} 的初始位置不存在。`);
    for (const relation of actor.relationships ?? []) if (!actorIds.has(relation.targetId)) fail("RELATION_TARGET", `${actor.id} 的关系目标 ${relation.targetId} 不存在。`);
  }
  for (const actorId of stateActors) if (!actorIds.has(actorId)) fail("STATE_ACTOR_REF", `runtime/state.json 引用了不存在的角色 ${actorId}。`);
  if (actorIds.size === stateActors.size && [...actorIds].every((id) => stateActors.has(id))) info("ACTOR_STATE_SEPARATION", "角色 profile 与 runtime state 引用一致。");

  let lastTick = -1;
  for (const record of world.records) {
    if (record.__parseError) { fail("INVALID_RECORD_JSON", `${record.recordId} 不是有效 JSON。`); continue; }
    if (!record.recordId || !record.type || !record.gameTime) fail("RECORD_FIELDS", "事件缺少 recordId、type 或 gameTime。", { recordId: record.recordId });
    const tick = Number(record.gameTime?.tick ?? -1);
    if (tick < lastTick) fail("RECORD_ORDER", `${record.recordId} 的 tick 倒退。`);
    lastTick = Math.max(lastTick, tick);
    if (record.type !== "world.initialized" && (!record.data || !record.ruleVersion || !record.causedBy || !Array.isArray(record.actorIds))) {
      fail("RECORD_PROVENANCE", `${record.recordId} 缺少 data、ruleVersion、causedBy 或 actorIds。`);
    }
  }
  if (world.records.length) info("EVENT_LOG", `事件日志包含 ${world.records.length} 条追加记录。`);
  if (!world.snapshots.some((snapshot) => snapshot.snapshotId === "snapshot-000")) fail("INITIAL_SNAPSHOT", "缺少 snapshot-000。");
  else info("INITIAL_SNAPSHOT", "存在初始快照。");
  const replayHash = replayWorkspace(world).hash;
  info("REPLAY_HASH", "已计算从 snapshot-000 到当前事件前缀的回放哈希。", { replayHash });
  return { status: diagnostics.some((item) => item.status === "fail") ? "failed" : "ok", diagnostics };
}

function replayWorkspace(world, limit) {
  const initial = world.snapshots.find((snapshot) => snapshot.snapshotId === "snapshot-000");
  if (!initial) return { status: "failed", appliedTicks: 0, hash: null, mismatches: ["missing snapshot-000"] };
  const records = world.records.filter((record) => !record.__parseError && record.type !== "world.initialized");
  const selected = limit ? records.filter((record) => Number(record.gameTime.tick) <= limit) : records;
  const projected = clone(initial);
  for (const record of selected) applyRecord(projected, record);
  const expected = limit ? world.snapshots.find((snapshot) => Number(snapshot.clock?.tick) === limit) : world.state;
  const mismatches = expected ? compareRuntime(projected, expected) : ["missing expected snapshot"];
  return {
    status: mismatches.length ? "failed" : "ok",
    appliedTicks: selected.length ? Math.max(...selected.map((record) => Number(record.gameTime.tick))) : 0,
    hash: sha256(projected),
    expectedSnapshot: expected?.snapshotId ?? null,
    mismatches: mismatches.slice(0, 20),
  };
}

function applyRecord(state, record) {
  for (const [resource, delta] of Object.entries(record.resourceDelta ?? {})) state.resources[resource] = (state.resources[resource] ?? 0) + Number(delta);
  for (const [path, value] of Object.entries(record.stateDelta ?? {})) setPath(state, path, Array.isArray(value) ? value.at(-1) : value);

  const after = record.data?.after;
  if (after && typeof after === "object") {
    if (after.resources && typeof after.resources === "object") for (const [key, value] of Object.entries(after.resources)) state.resources[key] = value;
    if (after.actor && record.actorIds?.[0]) for (const [key, value] of Object.entries(after.actor)) state.actors[record.actorIds[0]][key] = value;
    for (const [key, value] of Object.entries(after)) {
      if (key.startsWith("actor-") && key.includes(".")) setPath(state, `actors.${key}`, value);
      else if (typeof value === "number" && key !== "seed") state.resources[key] = value;
    }
  }
  if (record.type === "actor.moved" && record.spaceId && record.actorIds?.[0] && state.actors[record.actorIds[0]]) state.actors[record.actorIds[0]].locationId = record.spaceId;
  if (record.spaceIds?.length && record.actorIds?.[0] && state.actors[record.actorIds[0]] && !record.stateDelta) state.actors[record.actorIds[0]].locationId = record.spaceIds.at(-1);
  if (record.gameTime) state.clock = { ...state.clock, ...record.gameTime };
}

function compareRuntime(actual, expected) {
  const mismatches = [];
  for (const path of ["clock", "actors", "resources", "threads"]) {
    if (stable(actual[path]) !== stable(expected[path])) {
      mismatches.push(path);
      if (mismatches.length <= 2) mismatches.push(...diffPaths(actual[path], expected[path], path).slice(0, 8));
    }
  }
  return mismatches;
}

function diffPaths(actual, expected, prefix) {
  if (stable(actual) === stable(expected)) return [];
  if (!actual || !expected || typeof actual !== "object" || typeof expected !== "object") return [`${prefix}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`];
  const keys = new Set([...Object.keys(actual), ...Object.keys(expected)]);
  const result = [];
  for (const key of keys) {
    if (result.length >= 8) break;
    result.push(...diffPaths(actual[key], expected[key], `${prefix}.${key}`));
  }
  return result;
}

function runSummary(world, replay) {
  const last = world.records.at(-1);
  return {
    provider: [...new Set(world.records.map((record) => record.provider).filter(Boolean))],
    firstTick: world.records[0]?.gameTime?.tick ?? null,
    lastTick: last?.gameTime?.tick ?? null,
    finalTime: world.state.clock ?? null,
    finalResources: world.state.resources ?? {},
    lastEvent: last ? { recordId: last.recordId, type: last.type, phase: last.phase ?? null } : null,
    replayVerified: replay.status === "ok",
  };
}

function walk(adjacency, start) {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) for (const next of adjacency.get(queue.shift()) ?? []) if (!seen.has(next)) { seen.add(next); queue.push(next); }
  return seen;
}

function setPath(target, path, value) {
  const parts = path.split(".");
  let cursor = target;
  for (const part of parts.slice(0, -1)) cursor = cursor[part] ??= {};
  cursor[parts.at(-1)] = value;
}

function clone(value) { return JSON.parse(JSON.stringify(value)); }
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function sha256(value) { return createHash("sha256").update(stable(value)).digest("hex"); }

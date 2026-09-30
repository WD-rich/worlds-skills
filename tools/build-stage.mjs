#!/usr/bin/env node
import {readFile, readdir, mkdir, writeFile, cp} from 'node:fs/promises';
import {resolve, dirname, relative, basename, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateBundle} from '../skills/world-stage/assets/stage/engine.mjs';
const args = process.argv.slice(2), arg = name => args[args.indexOf(name) + 1];
if (!args.includes('--world') || !args.includes('--out')) {
  console.log('node tools/build-stage.mjs --world /path/to/world --out /path/to/viewer [--scene /path/to/scene.json]');
  process.exit(args.includes('--help') ? 0 : 2);
}
const world = resolve(arg('--world')), out = resolve(arg('--out'));
const skillRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (!relative(skillRoot, out).startsWith('..')) throw new Error('Generated worlds must be outside the skill repository.');
const json = async path => JSON.parse(await readFile(path, 'utf8'));
const optional = async path => { try {return await json(path);} catch (e) {if (e.code === 'ENOENT') return []; throw e;} };
const optionalObject = async path => { try {return await json(path);} catch (e) {if (e.code === 'ENOENT') return null; throw e;} };
const scenePath = resolve(args.includes('--scene') ? arg('--scene') : join(world,'visuals/scene.json'));
const scene = await json(scenePath);
const actors = await Promise.all((await readdir(join(world,'content/actors'))).filter(p => p.endsWith('.json') && p !== 'index.json').sort().map(p => json(join(world,'content/actors',p))));
const spaces = await json(join(world,'content/spaces.json'));
const bundle = {
  format: 'world-stage/v1', setting: await json(join(world,'content/setting.json')), actors,
  spaces: spaces.spaces || spaces, initial: await json(join(world,'runtime/snapshots/snapshot-000.json')),
  records: (await readFile(join(world,'runtime/records.ndjson'),'utf8')).trim().split(/\r?\n/).filter(Boolean).map(JSON.parse),
  dialogues: await optional(join(world,'runtime/dialogues.json')), memories: await optional(join(world,'runtime/memories.json')),
  scene,
  visuals: {
    style: await optionalObject(join(dirname(scenePath), scene.style || 'style.v0.2.json')),
    layout: await optionalObject(join(dirname(scenePath), scene.layout || 'layout.v0.3.json')),
    assetManifest: await optionalObject(join(dirname(scenePath), scene.assetManifest || 'asset-manifest.v0.2.json')),
    animationManifest: await optionalObject(join(dirname(scenePath), scene.animationManifest || 'animation-manifest.v0.2.json'))
  }
};
validateBundle(bundle);
await mkdir(join(out,'assets'), {recursive:true});
const importAsset = async (ref) => {
  if (!ref) return null;
  const source = resolve(dirname(scenePath), ref), target = join(out,'assets',basename(source));
  if (source !== target) await cp(source,target);
  return `assets/${basename(source)}`;
};
bundle.scene.map.image = await importAsset(bundle.scene.map.image);
for (const asset of Object.values(bundle.scene.actors)) asset.image = await importAsset(asset.image);
for (const file of ['index.html','stage.css','stage-v03.css','stage-v04.css','stage.mjs','engine.mjs']) await cp(join(skillRoot,'skills/world-stage/assets/stage',file),join(out,file));
await writeFile(join(out,'world.json'),JSON.stringify(bundle,null,2)+'\n');
console.log(JSON.stringify({out,actors:actors.length,spaces:bundle.spaces.length,ticks:Math.max(...bundle.records.map(r=>r.gameTime.tick)),dialogues:bundle.dialogues.length,memories:bundle.memories.length,provider:'recorded / local-rules'},null,2));

#!/usr/bin/env node
import { main } from '../skills/asset-pipeline-director/scripts/pipeline.mjs';
await main(process.argv.slice(2));

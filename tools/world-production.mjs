#!/usr/bin/env node
import {main} from '../skills/world-production-director/scripts/production.mjs';
try { const report = await main(process.argv.slice(2)); console.log(JSON.stringify(report,null,2)); process.exitCode=report.status==='failed'?1:0; }
catch(e) { console.error(JSON.stringify({status:'failed',diagnostics:[{code:'PRODUCTION_INPUT',severity:'error',message:e.message}]})); process.exitCode=1; }

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {versionSite} from '../tools/version-site.mjs';

test('website assets use deterministic content versions',()=>{
  const read=name=>readFileSync(new URL(`../docs/${name}`,import.meta.url),'utf8');
  const input={html:read('index.html'),js:read('voices.js'),css:read('voices.css'),core:read('catalog-core.mjs')};
  const output=versionSite(input);
  assert.equal(output.html,input.html);
  assert.equal(output.js,input.js);
  assert.match(output.html,/voices\.js\?v=[a-f0-9]{16}/);
  assert.match(output.html,/voices\.css\?v=[a-f0-9]{16}/);
  assert.match(output.js,/catalog-core\.mjs\?v=[a-f0-9]{16}/);
  for (const key of ['js','css','core']) assert.notEqual(versionSite({...input,[key]:input[key]+'\n'}).html,output.html);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseIssue,canonicalMetadata,sha256,validateWav,attachmentUrl,allowedFinalUrl,readLimited,verifyAndDownload,API} from '../docs/catalog-core.mjs';
import * as catalog from '../docs/catalog-core.mjs';
const fixture=JSON.parse(fs.readFileSync(new URL('./fixtures/voices/approval-v1.json',import.meta.url)));
const wav=fs.readFileSync(new URL('./fixtures/voices/one-second-pcm.wav',import.meta.url));
const issue={...fixture.issue,labels:[]};
test('install links carry only the public issue number',()=>{
  assert.equal(typeof catalog.voiceInstallUrl,'function');
  assert.equal(catalog.voiceInstallUrl(24),'dingdong://voice/24');
  assert.equal(catalog.voiceInstallUrl(24,{development:true}),'dingdong-dev://voice/24');
  for(const value of [0,-1,1.5,'24','24?url=https://evil.test']) assert.throws(()=>catalog.voiceInstallUrl(value));
});
test('direct installation is limited to macOS and attachment paths are recognised',()=>{
  assert.equal(catalog.supportsDirectInstall('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),true);
  for(const agent of ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)','Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)','Mozilla/5.0 (Macintosh; Mobile)']) assert.equal(catalog.supportsDirectInstall(agent),false);
  assert.equal(catalog.isGitHubAttachment('https://github.com/user-attachments/files/1/a.wav'),true);
  assert.equal(catalog.isGitHubAttachment('https://github.com.evil.test/user-attachments/files/1/a.wav'),false);
});
test('attachment actions re-read the current open Issue',async()=>{
  await withFetch(async u=>{assert.equal(u,`${API}/issues/7`);return new Response(JSON.stringify(issue));},async()=>assert.equal((await catalog.fetchCurrentVoice(7)).number,7));
  await withFetch(async()=>new Response(JSON.stringify({...issue,state:'closed'})),async()=>await assert.rejects(()=>catalog.fetchCurrentVoice(7)));
});
function audioResponse(bytes=wav){const r=new Response(bytes);Object.defineProperty(r,'url',{value:parseIssue(issue).audioUrl});return r;}
async function withFetch(fn,run){const old=globalThis.fetch;globalThis.fetch=fn;try{await run();}finally{globalThis.fetch=old;}}
test('open submissions display immediately without any labels',()=>{assert.equal(parseIssue(issue).number,7);assert.equal(parseIssue({...issue,labels:undefined}).number,7);});
test('metadata still preserves title, source and rights',async()=>{assert.equal(canonicalMetadata(parseIssue(issue)),fixture.metadataJson);assert.equal(await sha256(canonicalMetadata(parseIssue(issue))),fixture.metadataSha256);});
test('closed issues, PRs, duplicate fields and missing required data rejected',()=>{for(const i of [{...issue,state:'closed'},{...issue,pull_request:{}},{...issue,body:issue.body+'\n### License\nDuplicate'},{...issue,body:issue.body.replace('### Description','### Blurb')},{...issue,body:issue.body.replace('[x]','[ ]')}])assert.throws(()=>parseIssue(i));});
test('only attachments or exact immutable repository WAV paths accepted',()=>{assert.equal(attachmentUrl('https://github.com/user-attachments/files/1/a.wav'),'https://github.com/user-attachments/files/1/a.wav');const pinned='https://raw.githubusercontent.com/JevonsCode/dingdong-voices/'+ 'a'.repeat(40)+'/audio/man.wav';assert.equal(attachmentUrl(pinned),pinned);for(const u of ['https://evil.test/a.wav',pinned.replace('/'+ 'a'.repeat(40)+'/','/main/'),pinned.replace('JevonsCode','stranger'),pinned+'?x=1','https://github.com.evil.test/user-attachments/files/1/a.wav','https://user@github.com/user-attachments/files/1/a.wav','https://github.com/user-attachments/files/1/../a.wav'])assert.throws(()=>attachmentUrl(u));assert.equal(allowedFinalUrl(pinned),true);assert.equal(allowedFinalUrl('https://evil.test/a.wav'),false);});
test('PCM checks sizes, encoding, alignment and duration',()=>{assert.equal(validateWav(wav).duration,1);const mutate=(offset,value,width=4)=>{const b=Buffer.from(wav);width===2?b.writeUInt16LE(value,offset):b.writeUInt32LE(value,offset);return b;};for(const b of [mutate(4,3),mutate(20,3,2),mutate(22,3,2),mutate(24,1),mutate(28,100),mutate(32,3,2),mutate(34,7,2),mutate(40,999999),wav.subarray(0,43)])assert.throws(()=>validateWav(b));const long=Buffer.alloc(44+64000);wav.copy(long,0,0,44);long.writeUInt32LE(long.length-8,4);long.writeUInt32LE(64000,40);assert.throws(()=>validateWav(long),/3 秒/);});
test('streaming rejects oversized data',async()=>{await assert.rejects(()=>readLimited(new Response(wav,{headers:{'content-length':String(6*1024*1024)}})));assert.deepEqual(await readLimited(new Response(wav)),new Uint8Array(wav));});
test('audio works without moderator comments and checks current issue twice',async()=>{const calls=[];await withFetch(async u=>{calls.push(u);return u===`${API}/issues/7`?new Response(JSON.stringify(issue)):audioResponse();},async()=>{assert.equal((await verifyAndDownload(7)).wav.duration,1);});assert.equal(calls.filter(u=>u===`${API}/issues/7`).length,2);assert.equal(calls.some(u=>u.includes('/comments')),false);});
test('closed issue never requests audio',async()=>{let calls=0;await withFetch(async()=>{calls++;return new Response(JSON.stringify({...issue,state:'closed'}));},async()=>await assert.rejects(()=>verifyAndDownload(7)));assert.equal(calls,1);});
test('closure or metadata edit during download fails',async()=>{for(const current of [{...issue,state:'closed'},{...issue,title:'changed'}]){let reads=0;await withFetch(async u=>u===`${API}/issues/7`?new Response(JSON.stringify(++reads===1?issue:current)):audioResponse(),async()=>await assert.rejects(()=>verifyAndDownload(7)));}});
test('invalid audio and unexpected redirect fail',async()=>{await withFetch(async u=>u===`${API}/issues/7`?new Response(JSON.stringify(issue)):audioResponse(new Uint8Array(44)),async()=>await assert.rejects(()=>verifyAndDownload(7)));await withFetch(async u=>{if(u===`${API}/issues/7`)return new Response(JSON.stringify(issue));const r=new Response(wav);Object.defineProperty(r,'url',{value:'https://evil.test/a.wav'});return r;},async()=>await assert.rejects(()=>verifyAndDownload(7),/重定向/));});
test('UI treats text as text and does not query approval labels',()=>{assert.equal(parseIssue({...issue,title:'<img src=x onerror=alert(1)>'}).title,'<img src=x onerror=alert(1)>');const ui=fs.readFileSync(new URL('../docs/voices.js',import.meta.url),'utf8');assert.equal(/innerHTML|outerHTML|insertAdjacentHTML|document\.write\(/.test(ui),false);assert.equal(ui.includes('labels=voice-approved'),false);});

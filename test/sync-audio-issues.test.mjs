import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {updatedIssueBody,reconcileEntries} from '../tools/sync-audio-issues.mjs';

const fixture=JSON.parse(readFileSync(new URL('./fixtures/voices/approval-v1.json',import.meta.url),'utf8'));
const commit='a'.repeat(40), old='b'.repeat(40);
const entry={slug:'example',issueNumber:7,description:'新的声音片段。',source:'https://example.com/sound',rightsStatus:'No open license independently verified'};
const audio=`https://raw.githubusercontent.com/JevonsCode/dingdong-voices/${old}/audio/example.wav`;
const issue={...fixture.issue,number:7,user:{...fixture.issue.user,login:'JevonsCode'},body:fixture.issue.body.replace(/https:\/\/github.com\/user-attachments\/files\/[^\s)]+/,audio).replace('### Source\n','### Source\nold source line\n')+'\n### Technical verification\nold details\n'};

test('updates only the matching owned voice and retains other fields',()=>{
  const out=updatedIssueBody(issue,entry,commit);
  assert.match(out,new RegExp(`/audio/example\\.wav`));
  assert.ok(out.includes(`/${commit}/audio/example.wav`));
  assert.ok(out.includes('新的声音片段。'));
  assert.ok(out.includes('https://example.com/sound'));
  assert.ok(!out.includes('old source line'));
  assert.ok(out.includes('### Rights confirmation'));
  assert.ok(!out.includes('Technical verification'));
});
test('rejects a changed author, issue, path, or commit',()=>{
  for(const input of [{...issue,number:8},{...issue,user:{login:'someone'}},{...issue,body:issue.body.replace('/audio/example.wav','/audio/other.wav')},{...issue,state:'closed'}]) assert.throws(()=>updatedIssueBody(input,entry,commit));
  assert.throws(()=>updatedIssueBody(issue,entry,'main'));
});
test('a failed issue does not block others and a later run reconciles it without rewriting unchanged audio',async()=>{
  const wav=readFileSync(new URL('./fixtures/voices/one-second-pcm.wav',import.meta.url));
  const base={...entry,bytes:wav.length,sha256:createHash('sha256').update(wav).digest('hex')};
  const entries=[base,{...base,slug:'other',issueNumber:8}];
  const issues=new Map([[7,{...issue}],[8,{...issue,number:8,html_url:issue.html_url.replace('/7','/8'),body:issue.body.replaceAll('/audio/example.wav','/audio/other.wav')}]]);
  let fail=true;const updated=[];
  const opts={commit,readAudio:()=>wav,wait:async()=>{},getIssue:async number=>{if(number===7&&fail)throw new Error('temporary failure');return issues.get(number);},updateIssue:async(number,body)=>{updated.push(number);issues.set(number,{...issues.get(number),body});},git:args=>args[0]==='log'?commit:args[2].startsWith(commit)?'d'.repeat(40):'e'.repeat(40)};
  await assert.rejects(()=>reconcileEntries(entries,opts),/Issue 7: temporary failure/);
  assert.deepEqual(updated,[8]);
  fail=false;
  assert.deepEqual(await reconcileEntries(entries,opts),{updated:1,unchanged:1});
  assert.deepEqual(updated,[8,7]);
  assert.deepEqual(await reconcileEntries(entries,opts),{updated:0,unchanged:2});
});
test('changed issue or missing pinned revision is never overwritten',async()=>{
  const wav=readFileSync(new URL('./fixtures/voices/one-second-pcm.wav',import.meta.url));
  const e={...entry,bytes:wav.length,sha256:createHash('sha256').update(wav).digest('hex')};
  let reads=0,writes=0;
  const opts={commit,readAudio:()=>wav,wait:async()=>{},getIssue:async()=>++reads===1?issue:{...issue,body:issue.body+'edited'},updateIssue:async()=>writes++,git:args=>args[0]==='log'?commit:args[2].startsWith(commit)?'d'.repeat(40):'e'.repeat(40)};
  await assert.rejects(()=>reconcileEntries([e],opts),/changed during synchronization/);
  assert.equal(writes,0);
  opts.git=args=>{if(args[0]==='log')return commit;throw new Error('missing revision');};
  reads=0;
  await assert.rejects(()=>reconcileEntries([e],opts),/missing revision/);
  assert.equal(writes,0);
});

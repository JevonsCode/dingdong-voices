import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {parseIssue,validateWav} from '../docs/catalog-core.mjs';

const repo='JevonsCode/dingdong-voices';
const commitPattern=/^[a-f0-9]{40}$/;
const slugPattern=/^[A-Za-z0-9_-]+$/;

function replaceField(body,name,value) {
  const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const pattern=new RegExp(`(^|\\n)(### ${escaped}[ \\t]*\\n)[\\s\\S]*?(?=\\n### |$)`,'g');
  const hits=[...body.matchAll(pattern)];
  if(hits.length!==1) throw new Error(`Missing or duplicate ${name} field.`);
  return body.replace(pattern,(_match,prefix,heading)=>`${prefix}${heading}${value}\n`);
}

export function updatedIssueBody(issue,entry,commit) {
  if(!commitPattern.test(commit)||!slugPattern.test(entry.slug)||!Number.isSafeInteger(entry.issueNumber)||entry.issueNumber<1) throw new Error('Invalid catalog identity.');
  const voice=parseIssue(issue);
  if(issue.number!==entry.issueNumber||voice.author!=='JevonsCode'||!voice.audioUrl.endsWith(`/audio/${entry.slug}.wav`)) throw new Error('The current submission does not match the owned catalog entry.');
  if(typeof entry.description!=='string'||!entry.description.trim()||/[\r\n]/.test(entry.description)||typeof entry.source!=='string'||!/^https:\/\//.test(entry.source)||/[\r\n]/.test(entry.source)) throw new Error('Invalid catalog metadata.');
  const rights=entry.rightsStatus?.includes('CC0 1.0')
    ? '来源页面标注 CC0 1.0；原始权利状态未独立核实。'
    : '未核实开放许可；原作品权利归原作者。请自行核实使用与再分发权限。';
  let body=issue.body.replace(/\r\n/g,'\n');
  for(const [name,value] of [
    ['Description',entry.description],
    ['Audio',`https://raw.githubusercontent.com/${repo}/${commit}/audio/${entry.slug}.wav`],
    ['Source',entry.source],
    ['License',rights],
  ]) body=replaceField(body,name,value);
  body=body.replace(/\n### Technical verification\s*\n[\s\S]*?(?=\n### |$)/g,'');
  return body.trimEnd()+'\n';
}

export async function reconcileEntries(entries,{commit,git,getIssue,updateIssue,readAudio,wait}) {
  if(!commitPattern.test(commit||'')) throw new Error('Missing GitHub revision.');
  if(new Set(entries.map(x=>x.issueNumber)).size!==entries.length) throw new Error('Duplicate issue numbers.');
  const errors=[];let updated=0,unchanged=0;
  for(const entry of entries) {
    try {
      if(!slugPattern.test(entry.slug)||!Number.isSafeInteger(entry.issueNumber)||entry.issueNumber<1) throw new Error('Invalid catalog identity.');
      const path=`audio/${entry.slug}.wav`;
      const target=git(['log','-1','--format=%H',commit,'--',path]);
      if(!commitPattern.test(target)) throw new Error('No audio revision found.');
      const bytes=readAudio(entry.slug);
      validateWav(bytes);
      if(bytes.length!==entry.bytes||createHash('sha256').update(bytes).digest('hex')!==entry.sha256) throw new Error('Audio metadata mismatch.');
      const issue=await getIssue(entry.issueNumber);
      const voice=parseIssue(issue);
      const prefix=`https://raw.githubusercontent.com/${repo}/`;
      const suffix=`/${path}`;
      if(issue.number!==entry.issueNumber||voice.author!=='JevonsCode'||!voice.audioUrl.startsWith(prefix)||!voice.audioUrl.endsWith(suffix)) throw new Error('The current submission does not match the owned catalog entry.');
      const current=voice.audioUrl.slice(prefix.length,-suffix.length);
      if(!commitPattern.test(current)) throw new Error('The current audio revision is invalid.');
      const oldBlob=git(['rev-parse','--verify',`${current}:${path}`]);
      const targetBlob=git(['rev-parse','--verify',`${target}:${path}`]);
      if(!commitPattern.test(oldBlob)||!commitPattern.test(targetBlob)) throw new Error('Audio revision is unavailable.');
      if(oldBlob===targetBlob){unchanged++;continue;}
      const next=updatedIssueBody(issue,entry,target);
      const latest=await getIssue(entry.issueNumber);
      if(latest.body!==issue.body||latest.state!=='open') throw new Error('The issue changed during synchronization.');
      await updateIssue(entry.issueNumber,next);
      updated++;
      await wait();
    } catch(error) {errors.push(`Issue ${entry.issueNumber}: ${error.message}`);}
  }
  if(errors.length) throw new Error(`Updated ${updated}, unchanged ${unchanged}; ${errors.length} failed:\n${errors.join('\n')}`);
  return {updated,unchanged};
}

async function main() {
  const commit=process.env.GITHUB_SHA,token=process.env.GH_TOKEN;
  if(!commitPattern.test(commit||'')||!token) throw new Error('Missing GitHub workflow context.');
  const entries=JSON.parse(readFileSync(new URL('../audio/catalog.json',import.meta.url),'utf8')).filter(entry=>entry.issueNumber);
  const headers={Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'X-GitHub-Api-Version':'2022-11-28'};
  async function api(number,options={}) {
    const response=await fetch(`https://api.github.com/repos/${repo}/issues/${number}`,{...options,headers:{...headers,...options.headers}});
    if(!response.ok)throw new Error(`Issue ${number}: GitHub returned ${response.status}.`);
    return response.json();
  }
  const result=await reconcileEntries(entries,{
    commit,
    git:args=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim(),
    getIssue:number=>api(number),
    updateIssue:(number,body)=>api(number,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({body})}),
    readAudio:slug=>readFileSync(new URL(`../audio/${slug}.wav`,import.meta.url)),
    wait:()=>new Promise(resolve=>setTimeout(resolve,1000)),
  });
  console.log(`Updated ${result.updated}; unchanged ${result.unchanged}.`);
}

if(process.argv[1]===fileURLToPath(import.meta.url)) main().catch(error=>{console.error(error.message);process.exitCode=1;});

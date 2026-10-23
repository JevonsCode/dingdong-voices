#!/usr/bin/env node
// Read-only helper. Never posts comments, changes labels, or accepts auth credentials.
import {API,MAX_BYTES,parseIssue,canonicalMetadata,sha256,validateWav,readLimited,allowedFinalUrl,attachmentUrl} from './catalog-core.mjs';
const number=Number(process.argv[2]);
if(!Number.isSafeInteger(number)||number<1||process.argv.length!==3){console.error('Usage: node tools/review-voice.mjs ISSUE_NUMBER');process.exit(2);}
const signal=AbortSignal.timeout(60000);
async function issue(){const r=await fetch(`${API}/issues/${number}`,{headers:{Accept:'application/vnd.github+json'},signal,redirect:'error'});if(!r.ok)throw new Error(`GitHub issue read failed: HTTP ${r.status}`);return r.json();}
async function audio(url){attachmentUrl(url);for(let i=0;i<=5;i++){const r=await fetch(url,{redirect:'manual',signal,credentials:'omit'});if([301,302,303,307,308].includes(r.status)){const location=r.headers.get('location');await r.body?.cancel();if(!location)throw new Error('Redirect missing location');url=new URL(location,url).href;if(!allowedFinalUrl(url))throw new Error('Unapproved redirect host/path');continue;}if(!allowedFinalUrl(r.url))throw new Error('Unapproved final audio URL');return readLimited(r);}throw new Error('Too many audio redirects');}
try{
  const original=await issue();
  // The maintainer reviews before adding the label. This only bypasses discovery-label
  // gating in local validation, never owner approval or public client verification.
  const voice=parseIssue({...original,labels:[{name:'voice-approved'}]});
  const bytes=await audio(voice.audioUrl),wav=validateWav(bytes);
  const metadataSha256=await sha256(canonicalMetadata(voice));
  const current=parseIssue({...await issue(),labels:[{name:'voice-approved'}]});
  if(await sha256(canonicalMetadata(current))!==metadataSha256)throw new Error('Issue changed during review. Run again.');
  console.error(`Issue #${number}: ${wav.duration.toFixed(3)} seconds, ${bytes.length}/${MAX_BYTES} bytes, PCM ${wav.bits}-bit, ${wav.channels} channel(s).`);
  console.error('Technical checks passed. Human review of content, source, license, identity/consent and privacy is still REQUIRED.');
  console.error('After review, the repository owner may paste the following DOT-prefixed JSON as the entire comment and add voice-approved. This tool does NOT post or approve anything.');
  console.log('🕵🏻‍♀️[DOT]\n'+JSON.stringify({dingdongVoiceApproval:1,issue:number,metadataSha256,audioSha256:await sha256(bytes)}));
}catch(error){console.error(`Review blocked: ${error.message}`);process.exitCode=1;}

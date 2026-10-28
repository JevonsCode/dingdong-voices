import {API,parseIssue,verifyAndDownload,voiceInstallUrl,fetchCurrentVoice,isGitHubAttachment,supportsDirectInstall} from './catalog-core.mjs?v=bd1ded76cd2aeca0';
const $ = id => document.getElementById(id);
const development = new URLSearchParams(window.location.search).get('app') === 'dev';
if (development) document.querySelector('.heading-note').textContent = 'DEV 预览 · 最长 3 秒';
let voices=[],page=1,loading=false,hasMore=false,partial=false;
let category='',sort='new';
const pageCache=new Map(), mediaUrls=new Set();
const svgPaths={
  play:[['path',{d:'M8 5.5v13l10-6.5z'}]],
  pause:[['path',{d:'M8 5v14M16 5v14'}]],
  download:[['path',{d:'M12 3v12m-4-4 4 4 4-4M5 18v2h14v-2'}]],
  copy:[['rect',{x:'8',y:'8',width:'11',height:'12',rx:'2'}],['path',{d:'M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2'}]],
  info:[['circle',{cx:'12',cy:'12',r:'9'}],['path',{d:'M12 10.5v5M12 7.5h.01'}]]
};
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');for(const [tag,attrs] of svgPaths[name]){const part=document.createElementNS(svg.namespaceURI,tag);for(const [k,v] of Object.entries(attrs))part.setAttribute(k,v);svg.append(part);}return svg;}
function iconButton(name,label,handler,extra=''){const el=node('button',undefined,`icon-button ${extra}`);el.type='button';el.title=label;el.setAttribute('aria-label',label);el.append(icon(name));el.addEventListener('click',handler);return el;}
function populateMenu(kind,options,value){
  const menu=$(`${kind}-menu`),summary=menu.querySelector('summary');
  const selected=options.find(option=>option.value===value)||options[0];
  $(`${kind}-value`).textContent=selected.label;
  summary.setAttribute('aria-label',`${kind==='category'?'分类':'排序'}：${selected.label}`);
  $(`${kind}-options`).replaceChildren(...options.map(option=>{
    const item=node('button',undefined,'filter-option');item.type='button';item.setAttribute('role','menuitemradio');item.setAttribute('aria-checked',String(option.value===value));
    item.append(node('span',option.label));
    if(option.value===value){const check=document.createElementNS('http://www.w3.org/2000/svg','svg');check.setAttribute('viewBox','0 0 24 24');check.setAttribute('aria-hidden','true');const path=document.createElementNS(check.namespaceURI,'path');path.setAttribute('d','m5 12 4 4 10-10');check.append(path);item.append(check);}
    item.addEventListener('click',()=>{if(kind==='category')category=option.value;else sort=option.value;menu.open=false;summary.focus();render();});
    return item;
  }));
}
function configureMenu(kind){
  const menu=$(`${kind}-menu`),summary=menu.querySelector('summary'),options=$(`${kind}-options`);
  menu.addEventListener('toggle',()=>{summary.setAttribute('aria-expanded',String(menu.open));if(menu.open)for(const other of document.querySelectorAll('.filter-menu'))if(other!==menu)other.open=false;});
  menu.addEventListener('focusout',()=>setTimeout(()=>{if(!menu.contains(document.activeElement))menu.open=false;},0));
  menu.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&menu.open){event.preventDefault();menu.open=false;summary.focus();return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    if((event.key==='Home'||event.key==='End')&&!menu.open)return;
    event.preventDefault();menu.open=true;
    const items=[...options.querySelectorAll('[role="menuitemradio"]')];if(!items.length)return;
    let index=items.indexOf(document.activeElement);
    if(index<0)index=items.findIndex(item=>item.getAttribute('aria-checked')==='true');
    if(event.key==='Home')index=0;else if(event.key==='End')index=items.length-1;else if(document.activeElement!==summary)index=(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
    items[Math.max(0,index)].focus();
  });
}
for(const kind of ['category','sort'])configureMenu(kind);
document.addEventListener('pointerdown',event=>{for(const menu of document.querySelectorAll('.filter-menu'))if(!menu.contains(event.target))menu.open=false;});
function revokeMedia(){document.querySelectorAll('audio').forEach(a=>a.pause());for(const u of mediaUrls)URL.revokeObjectURL(u);mediaUrls.clear();}
async function loadPage(reset=false){
  if(loading)return;loading=true;$('refresh').disabled=true;$('load-more').disabled=true;$('cards').setAttribute('aria-busy','true');
  if(reset){page=1;voices=[];partial=false;pageCache.clear();render();}
  $('status').textContent='正在加载声音…';
  try{
    let result=pageCache.get(page);
    if(!result||Date.now()-result.time>300000){
      const response=await fetch(`${API}/issues?state=open&sort=created&direction=desc&per_page=30&page=${page}`,{headers:{Accept:'application/vnd.github+json'},credentials:'omit',cache:reset?'no-store':'default',signal:AbortSignal.timeout(20000)});
      if(!response.ok)throw new Error(response.status===403||response.status===429?'GitHub 暂时限制请求，请稍后刷新。':`加载失败（${response.status}），请重试。`);
      const data=await response.json();if(!Array.isArray(data))throw new Error('声音列表格式有误。');result={data,time:Date.now()};pageCache.set(page,result);
    }
    for(const issue of result.data){if(issue.pull_request)continue;try{const voice=parseIssue(issue);if(!voices.some(v=>v.number===voice.number))voices.push(voice);}catch{/* Incomplete submissions are not listed. */}}
    hasMore=result.data.length===30;page++;partial=false;render();
  }catch(error){partial=true;$('status').textContent=error.name==='TimeoutError'?'连接超时，请刷新重试。':error.message;if(!voices.length)$('cards').replaceChildren(node('p','暂时无法加载声音，请稍后重试。','empty-state'));}
  finally{loading=false;$('refresh').disabled=false;$('load-more').disabled=false;$('load-more').hidden=!hasMore;$('cards').setAttribute('aria-busy','false');}
}
function render(){
  revokeMedia();const query=$('search').value.trim().toLocaleLowerCase();
  const categories=[...new Set(voices.map(v=>v.category))].sort();if(!categories.includes(category))category='';
  populateMenu('category',[{value:'',label:'全部分类'},...categories.map(value=>({value,label:value}))],category);
  populateMenu('sort',[{value:'new',label:'最新投稿'},{value:'popular',label:'最多赞'}],sort);
  const filtered=voices.filter(v=>(!category||v.category===category)&&(!query||`${v.title} ${v.description} ${v.author}`.toLocaleLowerCase().includes(query)));
  filtered.sort(sort==='popular'?(a,b)=>b.up-a.up||b.number-a.number:(a,b)=>b.number-a.number);
  $('cards').replaceChildren(...filtered.map(row));
  if(!filtered.length)$('cards').append(node('p',voices.length?'没有找到匹配的声音。':'暂无声音。','empty-state'));
  if(!partial)$('status').textContent=`${filtered.length} 条声音${hasMore?' · 可加载更多':''}`;
}
function row(voice){
  const article=node('article',undefined,'voice-row'),name=node('div',undefined,'voice-name'),actions=node('div',undefined,'voice-actions');
  article.classList.add(`tone-${voice.number%3}`);
  const title=voice.title.replace(/^🕵🏻‍♀️\[DOT\]\s*/,'').replace(/^\[Voice\]\s*/i,'');
  name.append(node('h3',title),node('p',`@${voice.author} · ${voice.category}`,'voice-meta'));
  const status=node('p','','audio-status');status.setAttribute('role','status');name.append(status);
  const audio=node('audio');audio.preload='none';audio.hidden=true;let localUrl=null;
  function setStatus(message,error=false){status.textContent=message;status.className=`audio-status${error?' error':''}`;status.title=message;name.classList.toggle('has-long-status',message.length>10);}
  function setPlaying(playing){play.replaceChildren(icon(playing?'pause':'play'));play.title=playing?'暂停':'试听';play.setAttribute('aria-label',`${play.title} ${title}`);}
  audio.addEventListener('play',()=>{document.querySelectorAll('audio').forEach(other=>{if(other!==audio)other.pause();});setPlaying(true);});
  audio.addEventListener('pause',()=>setPlaying(false));audio.addEventListener('ended',()=>setPlaying(false));
  audio.addEventListener('error',()=>setStatus('无法播放，请下载后试听。',true));
  audio.addEventListener('loadedmetadata',()=>{if(!Number.isFinite(audio.duration)||audio.duration>3){audio.pause();audio.removeAttribute('src');setStatus('声音时长超过 3 秒或无法识别。',true);}else setStatus(`${audio.duration.toFixed(2)} 秒`);});
  async function audioAction(download){
    if(!download&&audio.src){try{if(audio.paused)await audio.play();else audio.pause();}catch{setStatus('无法播放，请下载后试听。',true);}return;}
    play.disabled=true;downloadButton.disabled=true;setStatus('正在验证…');
    try{
      if(isGitHubAttachment(voice.audioUrl)){
        const current=await fetchCurrentVoice(voice.number,AbortSignal.timeout(20000));
        if(['title','description','audioUrl','source','license','rights'].some(key=>current[key]!==voice[key]))throw new Error('投稿已变更，请刷新后重试。');
        if(!article.isConnected)return;
        if(download){const a=document.createElement('a');a.href=current.audioUrl;a.rel='noopener noreferrer';a.click();setStatus('正在下载');}
        else{audio.src=current.audioUrl;try{await audio.play();}catch{setStatus('无法播放，请下载后试听。',true);}}
        return;
      }
      const result=await verifyAndDownload(voice.number,AbortSignal.timeout(60000));
      if(['title','description','audioUrl','source','license','rights'].some(key=>result.voice[key]!==voice[key]))throw new Error('投稿已变更，请刷新后重试。');
      if(!article.isConnected)return;
      const verifiedUrl=URL.createObjectURL(new Blob([result.bytes],{type:'audio/wav'}));mediaUrls.add(verifiedUrl);
      setStatus(`${result.wav.duration.toFixed(2)} 秒`);
      if(download){const a=document.createElement('a');a.href=verifiedUrl;a.download=`dingdong-voice-${voice.number}.wav`;a.click();setTimeout(()=>{URL.revokeObjectURL(verifiedUrl);mediaUrls.delete(verifiedUrl);},60000);}
      else{if(localUrl){URL.revokeObjectURL(localUrl);mediaUrls.delete(localUrl);}localUrl=verifiedUrl;audio.src=localUrl;try{await audio.play();}catch{setStatus('点击试听播放');}}
    }catch(error){setStatus(error.name==='TimeoutError'?'连接超时，请重试。':error instanceof TypeError?'无法读取音频，请检查网络后重试。':error.message,true);}
    finally{play.disabled=false;downloadButton.disabled=false;}
  }
  const play=iconButton('play',`试听 ${title}`,()=>audioAction(false),'play-button');
  const downloadButton=iconButton('download',`下载 ${title}`,()=>audioAction(true));
  const copyButton=iconButton('copy',`复制 ${title} 的投稿链接`,async()=>{try{await navigator.clipboard.writeText(voice.issueUrl);setStatus('链接已复制');}catch{setStatus('复制失败，请打开投稿页面复制链接。',true);}});
  const info=iconButton('info',`查看 ${title} 的来源和授权`,()=>showDetails(voice,title));
  const install=node('a','安装','install-button');install.href=voiceInstallUrl(voice.number,{development});install.setAttribute('aria-label',`在 DingDong 安装 ${title}`);install.addEventListener('click',event=>{if(!supportsDirectInstall(navigator.userAgent)){event.preventDefault();manualInstallLink=voice.issueUrl;$('install-copy-status').textContent='';$('manual-install').showModal();}else setStatus('未打开？复制链接到社区声音');});
  actions.append(downloadButton,copyButton,info,install);article.append(play,name,actions,audio);return article;
}
function showDetails(voice,title){$('details-title').textContent=title;const body=$('details-body');body.replaceChildren();for(const [label,value] of [['描述',voice.description],['授权',voice.license],['来源',voice.source]]){body.append(node('h3',label),node('p',value));}$('details-issue').href=voice.issueUrl;$('details-issue').textContent=`查看投稿 · 赞 ${voice.up} · 踩 ${voice.down} ↗`;$('voice-details').showModal();}
async function copy(text,statusId){try{await navigator.clipboard.writeText(text);$(statusId).textContent='已复制';}catch{$(statusId).textContent='复制失败，请手动复制。';}}
let manualInstallLink='';
$('close-details').addEventListener('click',()=>$('voice-details').close());
$('close-manual-install').addEventListener('click',()=>$('manual-install').close());
$('copy-install-link').addEventListener('click',()=>copy(manualInstallLink,'install-copy-status'));
$('copy-prompt').addEventListener('click',()=>copy($('agent-prompt').textContent,'prompt-status'));
$('refresh').addEventListener('click',()=>loadPage(true));$('load-more').addEventListener('click',()=>loadPage());
$('search').addEventListener('input',render);
window.addEventListener('pagehide',revokeMedia);render();loadPage();

// ==UserScript==
// @name         JavDB 评论批量搜索
// @namespace    https://github.com/shenshou/MyOnlineTools
// @version      1.0.0
// @description  在 JavDB 当前登录会话中批量搜索番号并获取评论，支持暂停、续跑与断点恢复
// @match        https://javdb.com/*
// @grant        none
// @run-at       document-idle
// @noframes
// ==/UserScript==

(() => {
  'use strict'
  const VERSION='1.0.0', STORE='javdb-review-batch:v1', API='https://jdforrepam.com/api'
  const PAGE_SIZE=20, MAX_PAGES=200, MAX_RETRIES=2, AUTO_WAIT_LIMIT=120000
  const state={tasks:[],running:false,paused:false,stopped:false,controller:null,resume:null,lastAt:0,interval:8000,keywords:'',sinceDate:'',message:'脚本已就绪。请求将按顺序串行执行。'}

  function add32(a,b){return(a+b)&0xffffffff}
  function cmn(q,a,b,x,s,t){a=add32(add32(a,q),add32(x,t));return add32((a<<s)|(a>>>(32-s)),b)}
  const ff=(a,b,c,d,x,s,t)=>cmn((b&c)|(~b&d),a,b,x,s,t),gg=(a,b,c,d,x,s,t)=>cmn((b&d)|(c&~d),a,b,x,s,t),hh=(a,b,c,d,x,s,t)=>cmn(b^c^d,a,b,x,s,t),ii=(a,b,c,d,x,s,t)=>cmn(c^(b|~d),a,b,x,s,t)
  function md5cycle(s,k){
    let[a,b,c,d]=s
    a=ff(a,b,c,d,k[0],7,-680876936);d=ff(d,a,b,c,k[1],12,-389564586);c=ff(c,d,a,b,k[2],17,606105819);b=ff(b,c,d,a,k[3],22,-1044525330)
    a=ff(a,b,c,d,k[4],7,-176418897);d=ff(d,a,b,c,k[5],12,1200080426);c=ff(c,d,a,b,k[6],17,-1473231341);b=ff(b,c,d,a,k[7],22,-45705983)
    a=ff(a,b,c,d,k[8],7,1770035416);d=ff(d,a,b,c,k[9],12,-1958414417);c=ff(c,d,a,b,k[10],17,-42063);b=ff(b,c,d,a,k[11],22,-1990404162)
    a=ff(a,b,c,d,k[12],7,1804603682);d=ff(d,a,b,c,k[13],12,-40341101);c=ff(c,d,a,b,k[14],17,-1502002290);b=ff(b,c,d,a,k[15],22,1236535329)
    a=gg(a,b,c,d,k[1],5,-165796510);d=gg(d,a,b,c,k[6],9,-1069501632);c=gg(c,d,a,b,k[11],14,643717713);b=gg(b,c,d,a,k[0],20,-373897302)
    a=gg(a,b,c,d,k[5],5,-701558691);d=gg(d,a,b,c,k[10],9,38016083);c=gg(c,d,a,b,k[15],14,-660478335);b=gg(b,c,d,a,k[4],20,-405537848)
    a=gg(a,b,c,d,k[9],5,568446438);d=gg(d,a,b,c,k[14],9,-1019803690);c=gg(c,d,a,b,k[3],14,-187363961);b=gg(b,c,d,a,k[8],20,1163531501)
    a=gg(a,b,c,d,k[13],5,-1444681467);d=gg(d,a,b,c,k[2],9,-51403784);c=gg(c,d,a,b,k[7],14,1735328473);b=gg(b,c,d,a,k[12],20,-1926607734)
    a=hh(a,b,c,d,k[5],4,-378558);d=hh(d,a,b,c,k[8],11,-2022574463);c=hh(c,d,a,b,k[11],16,1839030562);b=hh(b,c,d,a,k[14],23,-35309556)
    a=hh(a,b,c,d,k[1],4,-1530992060);d=hh(d,a,b,c,k[4],11,1272893353);c=hh(c,d,a,b,k[7],16,-155497632);b=hh(b,c,d,a,k[10],23,-1094730640)
    a=hh(a,b,c,d,k[13],4,681279174);d=hh(d,a,b,c,k[0],11,-358537222);c=hh(c,d,a,b,k[3],16,-722521979);b=hh(b,c,d,a,k[6],23,76029189)
    a=hh(a,b,c,d,k[9],4,-640364487);d=hh(d,a,b,c,k[12],11,-421815835);c=hh(c,d,a,b,k[15],16,530742520);b=hh(b,c,d,a,k[2],23,-995338651)
    a=ii(a,b,c,d,k[0],6,-198630844);d=ii(d,a,b,c,k[7],10,1126891415);c=ii(c,d,a,b,k[14],15,-1416354905);b=ii(b,c,d,a,k[5],21,-57434055)
    a=ii(a,b,c,d,k[12],6,1700485571);d=ii(d,a,b,c,k[3],10,-1894986606);c=ii(c,d,a,b,k[10],15,-1051523);b=ii(b,c,d,a,k[1],21,-2054922799)
    a=ii(a,b,c,d,k[8],6,1873313359);d=ii(d,a,b,c,k[15],10,-30611744);c=ii(c,d,a,b,k[6],15,-1560198380);b=ii(b,c,d,a,k[13],21,1309151649)
    a=ii(a,b,c,d,k[4],6,-145523070);d=ii(d,a,b,c,k[11],10,-1120210379);c=ii(c,d,a,b,k[2],15,718787259);b=ii(b,c,d,a,k[9],21,-343485551)
    s[0]=add32(s[0],a);s[1]=add32(s[1],b);s[2]=add32(s[2],c);s[3]=add32(s[3],d)
  }
  function md5(input){
    const bytes=unescape(encodeURIComponent(input)),words=[]
    for(let i=0;i<bytes.length;i++)words[i>>2]=(words[i>>2]||0)|(bytes.charCodeAt(i)<<((i%4)*8))
    const bits=bytes.length*8;words[bits>>5]=(words[bits>>5]||0)|(0x80<<(bits%32))
    const end=(((bits+64)>>>9)<<4)+14;words[end]=bits;words[end+1]=Math.floor(bits/0x100000000)
    const s=[1732584193,-271733879,-1732584194,271733878]
    for(let i=0;i<words.length;i+=16)md5cycle(s,Array.from({length:16},(_,j)=>words[i+j]||0))
    return s.map(n=>[0,8,16,24].map(v=>((n>>>v)&255).toString(16).padStart(2,'0')).join('')).join('')
  }
  function signature(ts=Math.floor(Date.now()/1000)){
    return ts+'.lpw6vgqzsp.'+md5(String(ts)+'71cf27bb3c0bcdf207b64abecddc970098c7421ee7203b9cdae54478478a199e7d5a6e1a57691123c1a931c057842fb73ba3b3c83bcd69c17ccf174081e3d8aa')
  }
  function retryAfter(value){
    if(!value)return null
    const n=Number(value);if(Number.isFinite(n)&&n>=0)return Math.ceil(n*1000)
    const date=Date.parse(value);return Number.isFinite(date)?Math.max(0,date-Date.now()):null
  }
  function parseNumbers(value){
    const seen=new Set()
    return String(value||'').split(/[\s,，;；]+/).map(x=>x.trim().toUpperCase())
      .filter(x=>/^[A-Z0-9]+(?:[-_][A-Z0-9]+)*$/.test(x))
      .filter(x=>{const key=x.replace(/[^A-Z0-9]/g,'');if(!key||seen.has(key))return false;seen.add(key);return true})
  }
  function exactCode(title,code){
    const expected=code.replace(/[^A-Z0-9]/g,''),source=String(title||'').trim();let i=0
    for(const char of expected){while(i<source.length&&/[\s._-]/.test(source[i]))i++;if(source[i]?.toUpperCase()!==char)return false;i++}
    return !/[A-Za-z0-9]/.test(source[i]||'')
  }
  function parseSearch(html){
    const doc=new DOMParser().parseFromString(String(html||''),'text/html')
    const anchors=doc.querySelectorAll('.movie-list .item a[href*="/v/"],.video-list .item a[href*="/v/"]'),seen=new Set()
    return [...anchors].flatMap(a=>{
      const href=a.getAttribute('href');if(!href)return[]
      let url;try{url=new URL(href,location.origin)}catch{return[]}
      const m=url.pathname.match(/^\/v\/([a-zA-Z0-9]+)(?:\/|$)/)
      if(url.origin!==location.origin||!m||seen.has(m[1]))return[]
      seen.add(m[1]);return[{title:a.querySelector('.video-title')?.textContent?.trim()||a.textContent?.trim()||'',url:url.href,movieId:m[1]}]
    })
  }
  async function searchMovie(code,signal){
    const url=new URL('/search',location.origin);url.searchParams.set('q',code);url.searchParams.set('f','all')
    let response
    try{response=await fetch(url.href,{method:'GET',credentials:'same-origin',cache:'no-store',signal})}
    catch(error){throw Object.assign(new Error(error.message||'JavDB 搜索网络请求失败'),{cause:error,stage:'search'})}
    if(!response.ok)throw Object.assign(new Error('JavDB 搜索返回 HTTP '+response.status),{
      status:response.status,retryAfterMs:retryAfter(response.headers.get('retry-after')),
      challenge:response.headers.get('cf-mitigated')==='challenge',stage:'search'
    })
    return parseSearch(await response.text())
  }
  function reviewItems(result){
    const values=[result?.data?.data?.reviews,result?.data?.reviews,result?.data?.data?.data?.reviews]
    return values.find(Array.isArray)||[]
  }
  function dedupe(reviews){
    const seen=new Set()
    return reviews.filter(r=>{
      const key=r?.id!=null?String(r.id):String(r?.username||'')+'|'+String(r?.created_at||'')+'|'+String(r?.content||'')
      if(seen.has(key))return false;seen.add(key);return true
    })
  }
  async function getReviews(movieId,page,signal){
    const url=new URL(API+'/v1/movies/'+encodeURIComponent(movieId)+'/reviews')
    url.searchParams.set('page',String(page));url.searchParams.set('sort_by','hotly');url.searchParams.set('limit',String(PAGE_SIZE))
    let response
    try{response=await fetch(url.href,{method:'GET',headers:{jdsignature:signature()},mode:'cors',credentials:'omit',signal})}
    catch(error){throw Object.assign(new Error('Reviews API 网络请求失败；浏览器无法仅凭此错误区分 CORS 与网络中断'),{cause:error,stage:'reviews'})}
    const text=await response.text();let data
    try{data=text?JSON.parse(text):null}catch{data=text}
    if(!response.ok||data?.success===0)throw Object.assign(new Error(data?.message||data?.error||'Reviews API 返回 HTTP '+response.status),{
      status:response.status,retryAfterMs:retryAfter(response.headers.get('retry-after')),action:data?.action,response:data,stage:'reviews'
    })
    return{data,status:response.status}
  }
  function save(){
    try{
      const raw=JSON.stringify({version:VERSION,tasks:state.tasks,interval:state.interval,keywords:state.keywords,sinceDate:state.sinceDate})
      if(raw.length>4000000){state.message='任务数据较大，无法完整写入会话存储；当前页面仍保留进度。';return}
      sessionStorage.setItem(STORE,raw)
    }catch{state.message='无法保存会话进度；当前页面仍保留内存中的任务状态。'}
  }
  function restore(){
    try{
      const saved=JSON.parse(sessionStorage.getItem(STORE)||'null')
      if(saved?.version!==VERSION||!Array.isArray(saved.tasks))return
      state.tasks=saved.tasks;state.interval=Number(saved.interval)||8000;state.keywords=saved.keywords||'';state.sinceDate=saved.sinceDate||''
      for(const t of state.tasks)if(['searching','fetching','paused','retrying'].includes(t.status))t.status='queued'
      state.message='已恢复上次会话进度；继续后会从上次成功步骤接着执行。'
    }catch{state.message='上次保存的进度无法读取，已忽略损坏的会话数据。'}
  }
  function wait(ms){
    const until=Date.now()+Math.max(0,ms)
    return new Promise((resolve,reject)=>{
      const tick=()=>{if(state.stopped)return reject(new DOMException('任务已停止','AbortError'));if(Date.now()>=until)return resolve();setTimeout(tick,Math.min(250,until-Date.now()))}
      tick()
    })
  }
  async function waitResume(){
    while(state.paused&&!state.stopped)await new Promise(resolve=>{state.resume=resolve})
    if(state.stopped)throw new DOMException('任务已停止','AbortError')
  }
  async function beforeRequest(){
    await waitResume()
    const ms=Math.max(0,state.lastAt+state.interval-Date.now())
    if(ms){state.message='按请求间隔等待 '+Math.ceil(ms/1000)+' 秒…';render();await wait(ms)}
    await waitResume();state.lastAt=Date.now()
  }
  function errorText(error,stage){
    const label=stage==='search'?'JavDB 影片搜索':'Reviews API 评论获取'
    if(error.status===403)return label+'被拒绝：'+(error.challenge?'检测到 Cloudflare Challenge。':'上游返回 HTTP 403。')+'脚本不会尝试绕过验证或访问限制。'
    if(error.status===429)return label+'触发 HTTP 429。'
    if(error.status)return label+'失败：HTTP '+error.status+'；'+(error.message||'')
    return label+'失败：'+(error.message||'未知网络错误')
  }
  async function requestPolicy(task,stage,request){
    let retries=0,rateRetries=0
    while(true){
      await beforeRequest()
      try{const result=await request();rateRetries=0;task.status=stage==='search'?'searching':'fetching';return result}
      catch(error){
        if(error.name==='AbortError'||state.stopped)throw error
        task.error=errorText(error,stage)
        if(error.status===403){
          task.status='paused';state.paused=true
          state.message=stage==='search'?task.number+' 的 JavDB 搜索遇到 403，队列已暂停。请确认页面登录状态，稍后再手动继续。':task.number+' 的 Reviews API 请求遇到 403，队列已暂停。请等待上游恢复后再手动继续。'
          save();render();await waitResume();retries=0;continue
        }
        if(error.status===429){
          rateRetries++
          if(rateRetries>3){task.status='paused';state.paused=true;state.message=task.number+' 连续多次收到 HTTP 429，已暂停队列，避免反复请求。';save();render();await waitResume();rateRetries=0;continue}
          const ms=Math.max(1000,error.retryAfterMs??60000)
          if(ms>AUTO_WAIT_LIMIT){
            task.status='paused';state.paused=true
            state.message='服务器要求等待约 '+Math.ceil(ms/1000)+' 秒，超过自动等待上限，已暂停队列。'
            save();render();await waitResume();retries=0;continue
          }
          state.message='收到 HTTP 429，遵循 Retry-After 等待 '+Math.ceil(ms/1000)+' 秒。';render();await wait(ms);continue
        }
        const retryable=error.status==null||[408,425,500,502,503,504].includes(error.status)
        if(retryable&&retries<MAX_RETRIES){
          retries++;const ms=10000*2**(retries-1);task.status='retrying'
          state.message=task.number+' 请求异常，等待 '+Math.ceil(ms/1000)+' 秒后重试（'+retries+'/'+MAX_RETRIES+'）。'
          save();render();await wait(ms);continue
        }
        throw error
      }
    }
  }
  function reviewTimestamp(review) {
    const value = review?.created_at ?? review?.createdAt ?? review?.created
    if (value == null || value === '') return null
    const numeric = typeof value === 'number' || /^\d+(?:\.\d+)?$/.test(String(value))
    const timestamp = numeric ? Number(value) * (Number(value) < 1e12 ? 1000 : 1) : Date.parse(value)
    return Number.isFinite(timestamp) ? timestamp : null
  }
  function visibleReviews(task) {
    const terms = state.keywords.split(/[\r\n,，;；]+/).map(x => x.trim().toLocaleLowerCase()).filter(Boolean)
    const cutoff = state.sinceDate ? new Date(state.sinceDate + 'T00:00:00').getTime() : null
    return (task.reviews || []).filter(review => {
      const content = String(review?.content || '').toLocaleLowerCase()
      if (terms.length && !terms.some(term => content.includes(term))) return false
      if (cutoff != null) {
        const timestamp = reviewTimestamp(review)
        if (!Number.isFinite(cutoff) || timestamp == null || timestamp < cutoff) return false
      }
      return true
    })
  }
  async function processTask(task){
    task.error='';task.status=task.movie?'fetching':'searching';save();render()
    if(!task.movie){
      const results=await requestPolicy(task,'search',()=>searchMovie(task.number,state.controller.signal))
      const exact=results.filter(x=>exactCode(x.title,task.number));task.candidates=exact
      if(!exact.length){task.status='not-found';task.error='搜索结果中没有找到番号完全匹配的影片。';save();return}
      if(exact.length>1){task.status='ambiguous';task.error='找到多个完全匹配结果，请选择影片。';save();return}
      task.movie=exact[0];task.nextPage=Math.max(1,Number(task.nextPage)||1);save()
    }
    let page=Math.max(1,Number(task.nextPage)||1)
    while(page<=MAX_PAGES){
      const result=await requestPolicy(task,'reviews',()=>getReviews(task.movie.movieId,page,state.controller.signal))
      const items=reviewItems(result),previous=(task.reviews||[]).length
      task.reviews=dedupe([...(task.reviews||[]),...items]);task.pagesFetched=page;task.nextPage=page+1
      save();render()
      if(!items.length||items.length<PAGE_SIZE||task.reviews.length===previous)break
      page++
    }
    if(page>MAX_PAGES)task.warning='评论页数超过 '+MAX_PAGES+' 页，已停止继续请求。'
    task.status='completed';task.error='';save()
  }
  async function runQueue(){
    if(state.running||!state.tasks.length)return
    state.running=true;state.paused=false;state.stopped=false;state.controller=new AbortController();state.lastAt=0
    state.message='队列运行中；每次只发起一个请求。';render()
    try{
      for(const task of state.tasks){
        if(state.stopped)break
        if(['completed','not-found'].includes(task.status))continue
        if(task.status==='ambiguous'&&!task.movie)continue
        try{await processTask(task)}
        catch(error){if(error.name==='AbortError'||state.stopped)break;task.status='failed';task.error=errorText(error,task.movie?'reviews':'search');save()}
        render()
      }
    }finally{
      state.running=false;state.paused=false;state.controller=null
      state.message=state.stopped?'任务已停止；已完成步骤已保留。':'队列处理结束。';save();render()
    }
  }
  function pause(){if(!state.running)return;state.paused=true;state.message='队列已暂停；当前请求完成后不会再发起新请求。';render()}
  function resume(){
    state.paused=false;state.message='继续处理队列…'
    if(state.resume){state.resume();state.resume=null}
    render();if(!state.running)runQueue()
  }
  function stop(){
    state.stopped=true;state.paused=false
    if(state.resume){state.resume();state.resume=null}
    state.controller?.abort();render()
  }
  function newBatch(numbers){
    if(state.running)return
    state.tasks=numbers.map((number,i)=>({id:String(i)+'-'+number,number,status:'queued',movie:null,candidates:[],reviews:[],pagesFetched:0,nextPage:1,error:'',warning:''}))
    state.lastAt=0;save();runQueue()
  }
  function copyAll(){
    const rows=[]
    for(const task of state.tasks)for(const review of visibleReviews(task))rows.push('['+task.number+'] '+String(review.username||'匿名用户')+'\n'+String(review.content||''))
    if(!rows.length){state.message='当前筛选条件下没有可复制的评论。';render();return}
    navigator.clipboard.writeText(rows.join('\n\n')).then(()=>{state.message='已复制 '+rows.length+' 条评论。';render()}).catch(()=>{state.message='复制失败，请检查剪贴板权限。';render()})
  }

  const host=document.createElement('div');host.id='javdb-review-batch-userscript';document.documentElement.appendChild(host)
  const shadow=host.attachShadow({mode:'open'})
  shadow.innerHTML=`<style>
:host{all:initial;position:fixed;z-index:2147483000;right:18px;bottom:18px;font:13px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#20242b}
*{box-sizing:border-box}button,input,textarea,select{font:inherit}
.launcher{border:0;border-radius:999px;padding:11px 16px;background:#2563eb;color:#fff;box-shadow:0 5px 22px #0003;cursor:pointer;font-weight:700}
.panel{width:min(560px,calc(100vw - 28px));max-height:min(82vh,820px);display:none;flex-direction:column;overflow:hidden;background:#fff;border:1px solid #d9dee8;border-radius:14px;box-shadow:0 12px 40px #0004}
.panel.open{display:flex}.head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#f5f7fb;border-bottom:1px solid #e3e7ef}
.head strong{font-size:14px}.head button{border:0;background:transparent;color:#596273;cursor:pointer;font-size:18px}
.body{padding:13px;overflow:auto}label{display:block;margin:0 0 5px;color:#475467;font-size:11px;font-weight:700}
textarea{display:block;width:100%;min-height:92px;resize:vertical;padding:9px;border:1px solid #cfd5df;border-radius:8px;color:#20242b;background:#fff}
.settings{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0}
input,select{width:100%;padding:8px;border:1px solid #cfd5df;border-radius:8px;background:#fff;color:#20242b}
.actions{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}
.actions button,.candidate button{border:0;border-radius:7px;padding:8px 11px;background:#2563eb;color:#fff;cursor:pointer}
.actions .secondary,.candidate button{background:#edf1f7;color:#273244}.actions .danger{background:#b42318;color:#fff}
.message{padding:8px 9px;margin:8px 0;border-radius:7px;background:#eff6ff;color:#1d4ed8;font-size:11px;white-space:pre-wrap}
.stats{margin:8px 0;color:#596273;font-size:11px}.task{border-top:1px solid #e5e9f0;padding:10px 0}
.task-head{display:flex;align-items:center;justify-content:space-between;gap:8px}.task-head b{font-size:12px}
.badge{font-size:10px;padding:2px 7px;border-radius:20px;background:#eef2f6;color:#475467}
.badge.completed{background:#dcfae6;color:#067647}.badge.failed,.badge.paused{background:#fee4e2;color:#b42318}
.error,.warning{margin:5px 0;color:#b42318;font-size:11px;white-space:pre-wrap}.warning{color:#9a6700}
.task a{display:block;margin-top:5px;font-size:11px;color:#2563eb}details{margin-top:6px}summary{cursor:pointer;color:#2563eb;font-size:11px}
.review{padding:8px 0;border-top:1px solid #edf0f4}.review small{color:#667085}.review p{margin:4px 0 0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}
.candidate{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0;font-size:11px}.candidate span{overflow-wrap:anywhere}
.foot{padding:8px 13px;border-top:1px solid #e3e7ef;color:#667085;font-size:10px}
@media(max-width:520px){:host{right:8px;bottom:8px}.panel{width:calc(100vw - 16px);max-height:86vh}.settings{grid-template-columns:1fr}}
</style>
<button class="launcher" type="button">评论批量搜索</button>
<section class="panel" aria-label="JavDB 评论批量搜索">
<header class="head"><strong>JavDB 评论批量搜索</strong><button type="button" data-action="close" aria-label="关闭">×</button></header>
<div class="body">
<label for="numbers">番号列表（支持换行、空格、逗号、分号）</label>
<textarea id="numbers" placeholder="例如：&#10;SSIS-123&#10;PASN-027-U&#10;IPX-811"></textarea>
<div class="settings">
<div><label for="interval">请求间隔</label><select id="interval"><option value="5000">5 秒</option><option value="8000" selected>8 秒（默认）</option><option value="10000">10 秒</option><option value="15000">15 秒</option></select></div>
<div><label for="keywords">评论关键词（可选）</label><input id="keywords" placeholder="多个词用逗号分隔"/></div>
<div><label for="since">评论起始日期（可选）</label><input id="since" type="date"/></div>
</div>
<div class="actions">
<button type="button" data-action="start">开始新批次</button><button type="button" class="secondary" data-action="pause">暂停</button><button type="button" class="secondary" data-action="resume">继续</button><button type="button" class="danger" data-action="stop">停止</button><button type="button" class="secondary" data-action="copy">复制筛选结果</button>
</div>
<div class="message" id="message" role="status"></div><div class="stats" id="stats"></div><div id="results"></div>
</div>
<footer class="foot">断点保存在当前标签页 sessionStorage；不读取、保存或导出账号密码与 Cookie。脚本不会绕过验证码或上游访问限制。</footer>
</section>`
  const $=s=>shadow.querySelector(s),launcher=$('.launcher'),panel=$('.panel'),message=$('#message'),results=$('#results')
  const numbers=$('#numbers'),interval=$('#interval'),keywords=$('#keywords'),sinceInput=$('#since')
  function label(status){return({queued:'排队中',searching:'搜索影片中',fetching:'获取评论中',retrying:'等待重试',completed:'已完成',failed:'失败','not-found':'未找到',ambiguous:'需要选择',paused:'已暂停'})[status]||status}
  function render(){
    message.textContent=state.message
    const done=state.tasks.filter(t=>['completed','not-found','failed','ambiguous'].includes(t.status)).length
    const total=state.tasks.reduce((n,t)=>n+(t.reviews?.length||0),0)
    $('#stats').textContent=state.tasks.length?'进度 '+done+'/'+state.tasks.length+' · 已获取评论 '+total+' 条':'尚无任务。'
    results.replaceChildren()
    state.tasks.forEach((task,index)=>{
      const card=document.createElement('article');card.className='task'
      const head=document.createElement('div');head.className='task-head'
      const title=document.createElement('b');title.textContent=task.number
      const badge=document.createElement('span');badge.className='badge '+task.status;badge.textContent=label(task.status);head.append(title,badge);card.append(head)
      if(task.movie){const movie=document.createElement('a');movie.href=task.movie.url;movie.target='_blank';movie.rel='noopener noreferrer';movie.textContent=task.movie.title+' · '+(task.reviews?.length||0)+' 条评论';card.append(movie)}
      if(task.error){const p=document.createElement('p');p.className='error';p.textContent=task.error;card.append(p)}
      if(task.warning){const p=document.createElement('p');p.className='warning';p.textContent=task.warning;card.append(p)}
      if(task.status==='ambiguous'&&task.candidates?.length)task.candidates.forEach((candidate,candidateIndex)=>{
        const row=document.createElement('div');row.className='candidate'
        const name=document.createElement('span');name.textContent=candidate.title
        const button=document.createElement('button');button.textContent='选择';button.dataset.action='choose';button.dataset.task=String(index);button.dataset.candidate=String(candidateIndex)
        row.append(name,button);card.append(row)
      })
      const filtered=visibleReviews(task)
      if(filtered.length){
        const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='展开 '+filtered.length+' 条评论';details.append(summary)
        filtered.forEach(review=>{const item=document.createElement('div');item.className='review';const meta=document.createElement('small');meta.textContent=String(review.username||'匿名用户')+' · '+String(review.created_at||'时间未知');const content=document.createElement('p');content.textContent=String(review.content||'（空评论）');item.append(meta,content);details.append(item)})
        card.append(details)
      }
      results.append(card)
    })
  }

  launcher.addEventListener('click',()=>{panel.classList.add('open');launcher.hidden=true})
  shadow.addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');if(!button)return
    const action=button.dataset.action
    if(action==='close'){panel.classList.remove('open');launcher.hidden=false}
    if(action==='start'){
      const list=parseNumbers(numbers.value)
      if(!list.length){state.message='没有识别到有效番号。';render();return}
      state.interval=Number(interval.value)||8000;state.keywords=keywords.value;state.sinceDate=sinceInput.value;newBatch(list)
    }
    if(action==='pause')pause()
    if(action==='resume')resume()
    if(action==='stop')stop()
    if(action==='copy')copyAll()
    if(action==='choose'&&!state.running){
      const task=state.tasks[Number(button.dataset.task)],candidate=task?.candidates?.[Number(button.dataset.candidate)]
      if(task&&candidate){task.movie=candidate;task.nextPage=1;task.status='queued';task.error='';save();runQueue()}
    }
  })
  keywords.addEventListener('input',()=>{state.keywords=keywords.value;save();render()})
  sinceInput.addEventListener('change',()=>{state.sinceDate=sinceInput.value;save();render()})
  interval.addEventListener('change',()=>{state.interval=Number(interval.value)||8000;save()})
  restore()
  if(state.tasks.length){numbers.value=state.tasks.map(t=>t.number).join('\n');interval.value=String(state.interval);keywords.value=state.keywords;sinceInput.value=state.sinceDate;launcher.textContent='恢复评论搜索（'+state.tasks.length+' 个番号）'}
  render()
  window.addEventListener('beforeunload',()=>{if(state.running){state.stopped=true;state.controller?.abort();save()}})
})()

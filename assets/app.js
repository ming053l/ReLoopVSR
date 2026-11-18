(function(){
'use strict';
var D=window.DV, REDUCED=matchMedia('(prefers-reduced-motion: reduce)');
var $=function(s,r){return (r||document).querySelector(s)}, $$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
function el(tag,attrs,kids){var e=document.createElement(tag);for(var k in attrs||{}){if(k==='text')e.textContent=attrs[k];else if(k==='html')e.innerHTML=attrs[k];else e.setAttribute(k,attrs[k])}(kids||[]).forEach(function(c){if(c)e.appendChild(c)});return e}
var GRIP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 7-5 5 5 5M15 7l5 5-5 5"/></svg>';
var PLAY='<svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M2 1v10l9-5z"/></svg>',PAUSE='<svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z"/></svg>';

/* theme */
var root=document.documentElement,themeBtn=$('#theme');
function isDark(){var t=root.getAttribute('data-theme');return t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches}
function syncTheme(){var d=isDark();root.setAttribute('data-dark',d);themeBtn.setAttribute('aria-pressed',d);themeBtn.setAttribute('aria-label',d?'Switch to light theme':'Switch to dark theme')}
themeBtn.addEventListener('click',function(){var n=isDark()?'light':'dark';root.setAttribute('data-theme',n);try{localStorage.setItem('dv-theme',n)}catch(e){}syncTheme()});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',syncTheme);syncTheme();

/* nav highlight */
if('IntersectionObserver' in window){var navLinks=$$('.links a');var so=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)navLinks.forEach(function(a){if(a.getAttribute('href')==='#'+e.target.id)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current')})})},{rootMargin:'-40% 0px -55% 0px'});
navLinks.forEach(function(a){var t=$(a.getAttribute('href'));if(t)so.observe(t)})}

/* slider core: pointer, touch and keyboard all funnel into set() */
function bindSlider(stage,grip,label,onChange){
  var pos=50,drag=false;
  function set(p){pos=Math.min(100,Math.max(0,p));stage.style.setProperty('--pos',pos+'%');var n=Math.round(pos);grip.setAttribute('aria-valuenow',n);grip.setAttribute('aria-valuetext',n+' percent of the width shows '+label());if(onChange)onChange(pos)}
  function fromEvent(e){var r=stage.getBoundingClientRect();set((e.clientX-r.left)/r.width*100)}
  stage.addEventListener('pointerdown',function(e){if(e.button)return;drag=true;try{stage.setPointerCapture(e.pointerId)}catch(_){}grip.focus({preventScroll:true});fromEvent(e)});
  stage.addEventListener('pointermove',function(e){if(drag)fromEvent(e)});
  ['pointerup','pointercancel','lostpointercapture'].forEach(function(t){stage.addEventListener(t,function(){drag=false})});
  grip.addEventListener('keydown',function(e){var s=e.shiftKey?10:2,k=e.key,n=null;
    if(k==='ArrowLeft'||k==='ArrowDown')n=pos-s;else if(k==='ArrowRight'||k==='ArrowUp')n=pos+s;else if(k==='PageDown')n=pos-10;else if(k==='PageUp')n=pos+10;else if(k==='Home')n=0;else if(k==='End')n=100;
    if(n!==null){e.preventDefault();set(n)}});
  set(50);return {set:set,get:function(){return pos}};
}
function gripEl(name){return el('button',{class:'grip',type:'button',role:'slider','aria-label':name,'aria-valuemin':'0','aria-valuemax':'100','aria-orientation':'horizontal',html:GRIP})}

/* video comparison: both sides live in one stacked H.264 file, so they are frame-locked by construction */
function clipById(id){return D.clips.filter(function(c){return c.id===id})[0]}
var players=[];
function makeVideoCompare(host){
  var c=clipById(host.getAttribute('data-clip')),w=c.w,h=c.h,src=c.src||'media/video/'+c.id+'.mp4',poster=c.poster||'media/poster/'+c.id+'.webp';
  var desc=host.getAttribute('data-desc');
  var canvas=el('canvas',{width:w,height:h,role:'img','aria-label':desc}),ctx=canvas.getContext('2d'),video=el('video',{muted:'',loop:'',playsinline:'',preload:'none','aria-hidden':'true',tabindex:'-1'});video.muted=true;
  var grip=gripEl('Comparison split: input on the left, ReLoopVSR on the right');
  var stage=el('div',{class:'stage',style:'--ar:'+(w/h).toFixed(4)},[canvas,video,el('span',{class:'tag l',text:'Input (bicubic)'}),el('span',{class:'tag r',text:'ReLoopVSR'}),el('div',{class:'split'}),grip]);
  var img=new Image(),posterReady=false,usePoster=true,userPaused=false,failed=false,loaded=false;
  function draw(){var s=(!usePoster&&video.readyState>=2)?video:(posterReady?img:null);if(!s)return;
    var ox=c.layout==='h'?w:0,oy=c.layout==='v'?h:0,x=w*slider.get()/100;
    ctx.drawImage(s,ox,oy,w,h,0,0,w,h);
    if(x>0){ctx.save();ctx.beginPath();ctx.rect(0,0,x,h);ctx.clip();ctx.drawImage(s,0,0,w,h,0,0,w,h);ctx.restore()}}
  var slider=bindSlider(stage,grip,function(){return 'the bicubic input'},draw);
  img.onload=function(){posterReady=true;draw()};
  var pb=el('button',{class:'play',type:'button'});
  function ui(){var p=!video.paused;pb.innerHTML=(p?PAUSE:PLAY)+'<span>'+(p?'Pause':'Play')+'</span>';pb.setAttribute('aria-label',(p?'Pause':'Play')+' this clip')}
  var loop;
  function tick(){if(video.paused)return;usePoster=false;draw();schedule()}
  function schedule(){if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(tick);else requestAnimationFrame(tick)}
  video.addEventListener('play',function(){ui();schedule()});video.addEventListener('pause',ui);
  video.addEventListener('loadeddata',function(){if(video.paused&&video.currentTime===0){/* keep the poster until playing */}});
  video.addEventListener('seeked',function(){usePoster=false;draw()});
  video.addEventListener('error',function(){failed=true;usePoster=true;pb.disabled=true;draw();var m=el('p',{class:'vid-err',text:'This browser could not decode the clip; a still frame is shown and the slider still works.'});host.querySelector('.bar-ctl').appendChild(m);ui()});
  function ensure(){if(!img.src)img.src=poster}
  function load(){ensure();if(!loaded){loaded=true;video.preload='auto';video.src=src}}
  /* a clip that scrolled far away stops downloading; playback later resumes from the same position */
  var resumeAt=0;
  function buffered(){var b=video.buffered;return b.length>0&&video.duration>0&&b.end(b.length-1)>=video.duration-.25}
  function release(){if(!loaded||buffered())return;if(video.readyState>=1)resumeAt=video.currentTime;loaded=false;usePoster=true;video.pause();video.removeAttribute('src');video.load();draw()}
  video.addEventListener('loadedmetadata',function(){if(resumeAt){video.currentTime=resumeAt;resumeAt=0}});
  function play(){if(failed)return;load();var q=video.play();if(q&&q.catch)q.catch(function(){ui()})}
  pb.addEventListener('click',function(){if(video.paused){userPaused=false;play()}else{userPaused=true;video.pause()}});
  ui();
  /* optional sound toggle for clips with an audio track; starts muted so autoplay keeps working */
  var sb=null,sui=null;
  if(c.audio){sb=el('button',{class:'play snd',type:'button','aria-pressed':'false'});
    sui=function(){var on=!video.muted;sb.innerHTML='<span>'+(on?'Sound on':'Sound off')+'</span>';sb.setAttribute('aria-pressed',on);sb.setAttribute('aria-label',(on?'Mute':'Unmute')+' this clip')};
    sb.addEventListener('click',function(){video.muted=!video.muted;if(!video.muted){players.forEach(function(o){if(o.video!==video)o.video.muted=true;if(o.sui)o.sui()});if(video.paused){userPaused=false;play()}}sui()});sui()}
  var meta=el('div',{class:'cap',html:host.getAttribute('data-cap')||''});
  if(host.closest('.card')){var fr=el('div',{class:'frame'+(h>w?' p':'')});fr.appendChild(stage);host.appendChild(fr)}else host.appendChild(stage);host.appendChild(el('div',{class:'bar-ctl'},[pb,sb,meta]));
  var p={host:host,video:video,ensure:ensure,release:release,enter:function(){ensure();if(!userPaused&&!REDUCED.matches)play()},leave:function(){if(!video.paused)video.pause()},slider:slider,stage:stage,sui:sui};
  players.push(p);return p;
}
$$('[data-clip]').forEach(makeVideoCompare);
if('IntersectionObserver' in window){
  var near=new IntersectionObserver(function(es){es.forEach(function(e){var p=players.filter(function(p){return p.stage===e.target})[0];if(e.isIntersecting)p.ensure();else p.release()})},{rootMargin:'400px'});
  var vis=new IntersectionObserver(function(es){es.forEach(function(e){var p=players.filter(function(p){return p.stage===e.target})[0];if(e.isIntersecting)p.enter();else p.leave()})},{threshold:.35});
  players.forEach(function(p){near.observe(p.stage);vis.observe(p.stage)});
}else players.forEach(function(p){p.ensure()});
document.addEventListener('visibilitychange',function(){if(document.hidden)players.forEach(function(p){p.leave()})});

/* streaming race: measured pace on a shared clock; no method ever shows another method's frames.
   Timing per output resolution from the paper's resolution table (Table 7, FP16 block = D.res, generated by gen_data.py). */
(function(){
  var root=$('#race');if(!root)return;
  var N=100,RL=['720p','1080p','1440p','4K'],KS=[4,8,12,16,20],ri=0,K=20;
  var ROW={};D.res.forEach(function(r){ROW[r.name.replace(/[§‡†]/g,'')]=r});
  /* expand colspan cells (OOM / Error) into per-resolution [fps,ttff,gib] */
  function cellsOf(r){var out=[];r.cells.forEach(function(c){var n=c[3]||1;if(n>1){for(var i=0;i<n;i++)out.push(c[0])}else out.push(c[0])});return out}
  function timing(name,i){var r=ROW[name];if(!r)return {oom:true,why:'n/a'};var c=cellsOf(r),f=c[3*i],tt=c[3*i+1];var fps=parseFloat(f),ttff=parseFloat(tt);
    if(isNaN(fps)||isNaN(ttff))return {oom:true,why:f};return {fps:fps,ttff:ttff,fpsTxt:f.replace(/[†‡]/g,''),ttffTxt:tt.replace(/[†‡]/g,''),total:Math.max(N/fps,ttff),flag:/[†‡]/.test(f+tt)}}
  function fastName(k){return 'ReLoopVSR-fast (K='+(k||K)+')'}
  function frames(m,t){if(!m.tm||m.tm.oom)return 0;var a=m.tm.ttff,b=m.tm.total;if(t<a)return 0;if(b<=a||t>=b)return N;return Math.min(N,1+Math.floor((t-a)/(b-a)*(N-1)))}
  D.raceFrames=frames;
  var panels=[{src:'fast',key:'reloopvsr',ours:true},{src:'ReLoopVSR-base',key:'reloopvsr',ours:true},{src:'InfVSR',key:'infvsr'},{src:'Stream-DiffVSR',key:'sdvsr'}];
  var chips=['RelayVSR','ReCaVSR','FastVR','SwiftVR','FlashVSR-Tiny','FlashVSR+','DOVE','SeedVR2-3B','PS-SR','STAR'].map(function(n){return {src:n}});
  D.raceMethods=panels.concat(chips);
  var END=1;
  function retime(){panels.concat(chips).forEach(function(m){m.name=m.src==='fast'?fastName():m.src;m.tm=timing(m.name,ri)});
    var live=panels.filter(function(m){return !m.tm.oom});END=Math.max.apply(null,live.map(function(m){return m.tm.total}).concat([1]));
    panels.forEach(function(m){m.rn.textContent=m.name;
      if(m.tm.oom)m.w.innerHTML='<span>'+(m.tm.why==='OOM'?'Out of memory (OOM)':m.tm.why)+' at '+RL[ri]+'</span><b>not raced</b>';
      else m.w.innerHTML='<span>Waiting for first frame</span><b>'+m.tm.ttffTxt+' s</b>';
      m.meta.textContent=m.tm.oom?'OOM':(m.tm.ttffTxt+' s, '+m.tm.fpsTxt+' FPS');m.el.classList.toggle('oom',!!m.tm.oom);m.v.setAttribute('aria-label',m.name+' on REDS4 clip 000, timed for '+RL[ri])});
    chips.forEach(function(m){m.b.textContent=m.name})}
  var host=$('#race-panels');
  panels.forEach(function(m){var v=el('video',{muted:'',playsinline:'',preload:'auto',tabindex:'-1','data-src':'media/race/'+m.key+'.mp4'});v.muted=true;
    var w=el('div',{class:'rw'}),rn=el('span',{class:'rn'}),meta=el('span',{class:'rmeta'});
    var p=el('div',{class:'rp'+(m.ours?' ours':''),'data-m':m.key},[el('div',{class:'rv'},[v,w,rn,meta,el('span',{class:'rc2',text:'0 / 100'})]),el('div',{class:'rb'},[el('i')])]);
    host.appendChild(p);m.el=p;m.v=v;m.w=w;m.rn=rn;m.meta=meta;m.cnt=$('.rc2',p);m.bar=$('.rb i',p);m.shown=-1;
    v.addEventListener('error',function(){w.innerHTML='<span>Clip unavailable</span>';m.broken=true});
    v.addEventListener('seeked',function(){m.seeking=false;seek(m)});v.addEventListener('loadeddata',function(){seek(m)})});
  var chost=$('#race-chips');
  chips.forEach(function(m){var s=el('span',{text:''}),b=el('b');m.el=el('div',{class:'chip'},[b,s]);m.st=s;m.b=b;chost.appendChild(m.el)});
  var inp=$('.rp-in',root),iv=$('video',inp),icnt=$('.rc',inp),ibar=$('.rb i',inp);iv.muted=true;
  var IN={v:iv,shown:-1,want:0};iv.addEventListener('seeked',function(){IN.seeking=false;seek(IN)});iv.addEventListener('loadeddata',function(){seek(IN)});
  var clock=$('#race-clock'),note=$('#race-speed-note'),pbtn=$('#race-pause'),t=0,speed=1,running=false,last=0,started=false,autoPaused=false,userPaused=false,inView=false;
  function seek(m){if(m.broken||m.seeking||m.want===m.shown||m.want<1||m.v.readyState<1)return;m.seeking=true;m.shown=m.want;m.v.currentTime=(m.want-.5)/24}
  function paint(){
    clock.textContent=t.toFixed(1)+' s';
    panels.forEach(function(m){var k=frames(m,t);m.want=k;m.el.classList.toggle('live',k>0);m.cnt.textContent=m.tm.oom?'OOM':k+' / 100';m.bar.style.width=k+'%';seek(m)});
    chips.forEach(function(m){if(m.tm.oom){m.st.textContent=(m.tm.why==='OOM'?'OOM':m.tm.why)+' at '+RL[ri]+', not raced';return}var k=frames(m,t);m.st.textContent=k?(k+' / 100 frames'):('0 / 100, first frame at '+m.tm.ttffTxt+' s')});
    var a=frames(panels[0],t);icnt.textContent=a+' / 100';ibar.style.width=a+'%';IN.want=a;seek(IN);
  }
  function loop(now){if(!running)return;var dt=Math.min(.25,(now-last)/1000);last=now;t=Math.min(END,t+dt*speed);paint();if(t>=END){running=false;pbtn.textContent='Pause';pbtn.disabled=true;return}requestAnimationFrame(loop)}
  function start(){running=true;last=performance.now();pbtn.disabled=false;pbtn.textContent='Pause';iv.pause();requestAnimationFrame(loop)}
  function stop(){running=false;pbtn.textContent='Resume';iv.pause()}
  function rewind(){t=0;IN.shown=-1;panels.forEach(function(m){m.shown=-1});paint()}
  pbtn.addEventListener('click',function(){if(running){userPaused=true;autoPaused=false;stop()}else{userPaused=false;start()}});
  $('#race-replay').addEventListener('click',function(){userPaused=false;autoPaused=false;rewind();start()});
  $$('.seg[data-g=speed] button',root).forEach(function(b){b.addEventListener('click',function(){speed=+b.getAttribute('data-s');$$('.seg[data-g=speed] button',root).forEach(function(x){x.setAttribute('aria-pressed',x===b)});note.textContent=speed===1?'1× speed':'Accelerated '+speed+'×';note.classList.toggle('fast',speed!==1)})});
  var cap=$('#race-cap');
  function caption(){var f=timing(fastName(),ri),f8=timing(fastName(8),ri),b=timing('ReLoopVSR-base',ri);
    cap.textContent='At '+RL[ri]+', '+fastName()+' shows its first frame at '+f.ttffTxt+' s and runs at '+f.fpsTxt+' FPS'+(K!==8?'; with K=8 it runs at '+f8.fpsTxt+' FPS':'')+'. ReLoopVSR-base runs at '+b.fpsTxt+' FPS'+(b.flag?' with on-the-fly RAFT correlation':'')+'.'}
  function segment(g,vals,labels,cur,on){var h=$('.seg[data-g='+g+']',root);vals.forEach(function(v,i){var b=el('button',{type:'button','aria-pressed':v===cur?'true':'false',text:labels[i]});
    b.addEventListener('click',function(){$$('button',h).forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});on(v);retime();caption();rewind();if(started&&!userPaused&&inView)start()});h.appendChild(b)})}
  segment('res',[0,1,2,3],RL,0,function(v){ri=v});segment('k',KS,KS.map(function(k){return 'K='+k}),20,function(v){K=v});
  retime();caption();
  function autoPause(){if(running){running=false;autoPaused=true;pbtn.textContent='Resume';iv.pause()}}
  function autoResume(){if(autoPaused&&!userPaused&&inView&&!document.hidden&&t<END){autoPaused=false;start()}}
  document.addEventListener('visibilitychange',function(){if(document.hidden)autoPause();else autoResume()});
  /* whole files in memory make frame seeks work on hosts without byte-range support; file:// falls back to a direct src. Both ReLoopVSR lanes reuse one clip. */
  var firstVids=[iv,panels[0].v,panels[1].v],laterVids=[panels[2].v,panels[3].v],clipsAsked=false,blobs={};
  function attach(v){v.preload='auto';var s=v.getAttribute('data-src');function direct(){v.src=s}
    if(location.protocol==='file:'||!window.fetch){direct();return Promise.resolve()}
    if(!blobs[s])blobs[s]=fetch(s).then(function(r){if(!r.ok)throw 0;return r.blob()}).then(function(b){return URL.createObjectURL(b)});
    return blobs[s].then(function(u){v.src=u}).catch(direct)}
  function loadClips(){if(clipsAsked)return;clipsAsked=true;Promise.all(firstVids.map(attach)).then(function(){laterVids.forEach(attach)})}
  var armed=false;
  function arm(){if(armed)return;armed=true;loadClips();if(!REDUCED.matches)setTimeout(go,5000)}
  function go(){if(started)return;started=true;if(inView)start();else{autoPaused=true;pbtn.textContent='Resume'}}
  if(REDUCED.matches){t=panels[1].tm.oom?END:Math.min(END,panels[1].tm.total);pbtn.disabled=true;var once=function(){paint()};if(iv.readyState>=1)once();else iv.addEventListener('loadedmetadata',once);panels.forEach(function(m){m.v.addEventListener('loadedmetadata',paint)});paint()}
  else{
    paint();
    var ready=function(){return firstVids.every(function(v){return v.readyState>=2||v.error})};
    var kick=function(){if(armed&&ready())go()};firstVids.forEach(function(v){v.addEventListener('loadeddata',kick);v.addEventListener('error',kick)});
  }
  function whenLoaded(f){if(document.readyState==='complete')f();else window.addEventListener('load',f,{once:true})}
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){if(es[0].isIntersecting)whenLoaded(arm)}).observe(root);
    new IntersectionObserver(function(es){inView=es[0].isIntersecting;if(inView)autoResume();else autoPause()},{threshold:.1}).observe(root);
  }else{inView=true;whenLoaded(arm)}
})();

/* tabs helper: roving tabindex, arrow keys */
function makeTabs(host,items,onSel,label){
  host.setAttribute('role','tablist');host.setAttribute('aria-label',label);
  var bs=items.map(function(t,i){var b=el('button',{class:'tab',type:'button',role:'tab',text:t,'aria-selected':i===0,tabindex:i===0?'0':'-1'});
    b.addEventListener('click',function(){sel(i)});
    b.addEventListener('keydown',function(e){var n=null;if(e.key==='ArrowRight')n=(i+1)%bs.length;else if(e.key==='ArrowLeft')n=(i-1+bs.length)%bs.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=bs.length-1;if(n!==null){e.preventDefault();sel(n);bs[n].focus()}});
    host.appendChild(b);return b});
  function sel(i){bs.forEach(function(b,j){b.setAttribute('aria-selected',j===i);b.tabIndex=j===i?0:-1});onSel(i,items[i])}
  return {buttons:bs,select:sel};
}
var cards=$$('#showcase .card');
makeTabs($('#show-tabs'),['All','REDS4','YouHQ40','AIGC','Tears of Steel','VideoLQ'],function(i,n){cards.forEach(function(c){c.hidden=!(i===0||c.getAttribute('data-ds')===n)})},'Filter comparisons by dataset');

/* multi-method crops */
(function(){
  var ex=D.crops,thumbs=$('#crop-thumbs'),sel=$('#crop-method'),grid=$('#crop-grid'),stage=$('#crop-stage'),under=$('#crop-under'),top=$('#crop-over'),ctx=$('#crop-ctx'),title=$('#crop-title'),tagL=$('#crop-tag'),gtwrap=$('#crop-gt');
  var cur=ex[0],grip=gripEl('Crop split: selected method on the left, ReLoopVSR on the right');stage.appendChild(grip);
  var slider=bindSlider(stage,grip,function(){return sel.value},null);
  function f(e,m){return 'media/crops/'+e.id+'/'+e.files[m]+'.png'}
  function order(e){var o=['Input','DOVE','SeedVR2','FlashVSR-Tiny','FlashVSR+','InfVSR','Stream-DiffVSR','ReLoopVSR','GT'];return o.filter(function(m){return e.files[m]})}
  function name(e,m){return m==='Input'?'Input (bicubic)':m==='GT'?'Ground truth':m}
  ex.forEach(function(e,i){var b=e.box,op=((b[0]+b[2]/2)/e.W*100).toFixed(0)+'% '+((b[1]+b[3]/2)/e.H*100).toFixed(0)+'%';
    var t=el('button',{class:'thumb',type:'button','aria-pressed':i===0},[el('div',{class:'ti'},[el('img',{src:'media/crops/'+e.id+'/context.webp',alt:'',loading:'lazy',style:'--op:'+op})]),el('span',{text:e.dataset+' · '+e.clip.replace('fastvr_aigc_','clip ').replace('youhq_','clip ').replace('tos_','').replace('videolq_','clip ').replace('spmcs_','').replace('vid4_','')})]);
    t.addEventListener('click',function(){$$('.thumb',thumbs).forEach(function(x){x.setAttribute('aria-pressed',x===t)});show(e)});thumbs.appendChild(t)});
  function setMethod(m){sel.value=m;tagL.textContent=name(cur,m);under.src=f(cur,'ReLoopVSR');top.src=f(cur,m);top.alt='Crop by '+name(cur,m)+', frame '+cur.frame+' of '+cur.clip;under.alt='Crop by ReLoopVSR, frame '+cur.frame+' of '+cur.clip;
    $$('.mcell',grid).forEach(function(b){if(!b.disabled)b.setAttribute('aria-pressed',b.getAttribute('data-m')===m)})}
  function show(e){cur=e;var prev=sel.value||'Stream-DiffVSR',ms=order(e);
    sel.innerHTML='';ms.filter(function(m){return m!=='ReLoopVSR'&&m!=='GT'}).forEach(function(m){sel.appendChild(el('option',{value:m,text:name(e,m)}))});
    title.textContent=e.dataset+', '+e.clip+', frame '+e.frame+(e.cap?'. '+e.cap:'');
    var low=null;if(e.lpips){low=Infinity;for(var k in e.lpips)low=Math.min(low,parseFloat(e.lpips[k]))}
    grid.innerHTML='';ms.forEach(function(m){var gt=m==='GT',ours=m==='ReLoopVSR',lp=e.lpips&&e.lpips[m];
      var c=el('button',{class:'mcell'+(ours?' ours':''),type:'button','data-m':m},[el('img',{src:f(e,m),alt:name(e,m)+' crop',loading:'lazy'}),el('span',{},[document.createTextNode(name(e,m)),lp?el('em',{class:parseFloat(lp)===low?'low':'',text:'LPIPS '+lp}):null])]);
      if(gt||ours)c.disabled=true;else c.addEventListener('click',function(){setMethod(m)});grid.appendChild(c)});
    var ci=$('img',ctx),b=e.box,rect=$('i',ctx);ci.setAttribute('width',e.W);ci.setAttribute('height',e.H);ci.src='media/crops/'+e.id+'/context.webp';ci.alt='Full frame of '+e.clip+' with the crop region marked';
    rect.style.cssText='left:'+(b[0]/e.W*100)+'%;top:'+(b[1]/e.H*100)+'%;width:'+(b[2]/e.W*100)+'%;height:'+(b[3]/e.H*100)+'%';
    gtwrap.textContent=e.gt?'Full frame: ground truth, with the crop marked.':'Full frame: ReLoopVSR, with the crop marked. VideoLQ has no ground truth, so no fidelity is claimed and details may be plausible rather than true.';
    setMethod(e.files[prev]&&prev!=='GT'&&prev!=='ReLoopVSR'?prev:'Stream-DiffVSR')}
  sel.addEventListener('change',function(){setMethod(sel.value)});
  show(ex[0]);
})();

/* Table 1 bars */
(function(){
  var M=[{k:'fps',t:'FPS',l:'Frames per second at 720p in FP32, higher is better',hi:true,u:' FPS'},{k:'ttff',t:'TTFF',l:'Time to first frame in seconds, lower is better. Log axis from 0.01 s.',log:[.01,10000],u:' s'},{k:'peak',t:'Peak memory',l:'Peak allocated GPU memory in GiB, lower is better',u:' GiB'},{k:'future',t:'Future frames',l:'Future frames that can influence an output, lower is better',u:' fr'},{k:'tflops',t:'TFLOPs',l:'TFLOPs per 720p output frame, lower is better',u:' TFLOPs'},{k:'params',t:'Params',l:'Parameters in millions, lower is better',u:' M'}];
  var bars=$('#eff-bars'),lab=$('#eff-label'),tip=$('#tip');
  function tiptext(e){return '<b>'+e.name+'</b><br>'+e.fps+' FPS · '+e.tflops+' TFLOPs/frame<br>TTFF '+e.ttff+' s · Peak '+e.peak+' GiB<br>Future frames '+e.future+' · Params '+e.params+' M'}
  function render(m){lab.textContent=m.l;var rows=D.eff.slice().sort(function(a,b){return m.hi?b[m.k]-a[m.k]:a[m.k]-b[m.k]});var max=Math.max.apply(null,D.eff.map(function(e){return +e[m.k]}));
    bars.innerHTML='';rows.forEach(function(e){var v=+e[m.k],w=m.log?Math.log10(v/m.log[0])/Math.log10(m.log[1]/m.log[0])*100:v/max*100;
      var r=el('div',{class:'brow'+(/^ReLoopVSR/.test(e.name)?' ours':''),tabindex:'0',role:'listitem','aria-label':e.name+': '+e[m.k]+m.u},[el('span',{text:e.name}),el('div',{class:'track'},[el('div',{class:'fill',style:'width:'+w+'%'})]),el('span',{class:'val',text:e[m.k]+(e[m.k+'_note']||'')})]);
      function show(ev){tip.hidden=false;tip.innerHTML=tiptext(e);var b=r.getBoundingClientRect(),x=ev&&ev.clientX?ev.clientX+14:b.left+140,y=ev&&ev.clientY?ev.clientY+14:b.bottom+6;tip.style.left=Math.min(x,innerWidth-262)+'px';tip.style.top=Math.min(y,innerHeight-110)+'px'}
      function hide(){tip.hidden=true}
      r.addEventListener('pointermove',show);r.addEventListener('pointerleave',hide);r.addEventListener('focus',function(){show()});r.addEventListener('blur',hide);r.addEventListener('keydown',function(ev){if(ev.key==='Escape')hide()});
      bars.appendChild(r)})}
  makeTabs($('#eff-tabs'),M.map(function(m){return m.t}),function(i){render(M[i])},'Choose a cost metric');render(M[0]);
  var tb=$('#eff-table tbody');D.eff.forEach(function(e){var tr=el('tr'),ours=/^ReLoopVSR/.test(e.name);tr.appendChild(el('th',{scope:'row',class:ours?'dv':'',text:e.name+(ours?' (ours)':'')}));
    ['params','tflops','future','fps','ttff','peak'].forEach(function(k){var r=e.ranks[k];tr.appendChild(el('td',{class:r?'r'+r:'',text:e[k]}))});tb.appendChild(tr)});
  /* cost ladder */
  var L=$('#ladder'),P=[{k:'rel',fmt:function(v){return v===1?'1×':v.toFixed(2)+'×'},w:function(v){return v/1.32}},{k:'ttff',fmt:function(v){return v>=10?v.toFixed(1):v.toFixed(2)},w:function(v){return Math.log10(v/.1)/4}},{k:'peak',fmt:function(v){return v>=10?v.toFixed(0):v.toFixed(1)},w:function(v){return Math.log10(v)/Math.log10(150)}}];
  function row(r,cls){var g=el('div',{class:'lr '+cls,role:'row'},[el('div',{class:'lab',role:'rowheader',text:r.label})].concat(P.map(function(p){return el('div',{class:'cell',role:'cell'},[el('div',{class:'b',style:'width:'+(p.w(r[p.k])*62).toFixed(1)+'%'}),el('span',{class:'v',text:p.fmt(r[p.k])})])})));return g}
    D.ladder.forEach(function(r,i){L.appendChild(row(r,i===0?'base':i===D.ladder.length-1?'final':''))});
})();

/* benchmarks */
(function(){
  var host=$('#bench-table'),sum=$('#bench-sum'),meta=$('#bench-meta'),G=[['',1],['Offline diffusion',4],['Streaming chunk-based diffusion',3],['Streaming autoregressive diffusion',2]];
  function arrow(r){return el('span',{'aria-label':r.up?'higher is better':'lower is better',text:r.up?' ↑':' ↓'})}
  function prep(d){if(d.ranks_done)return;d.rows.forEach(function(r){if(r.ranks)return;var O=window.VIDEOLQ_OURS||{};r.values[r.values.length-1]=O[r.metric]!==undefined?O[r.metric]:null;
      var nums=r.values.map(function(v){return v===null?NaN:parseFloat(v)});var u=nums.filter(function(x){return !isNaN(x)}).filter(function(x,i,a){return a.indexOf(x)===i}).sort(function(x,y){return r.up?y-x:x-y});
      r.ranks=nums.map(function(x){if(isNaN(x))return 0;var q=u.indexOf(x)+1;return q<=3?q:0});var bi=nums[0],o=nums[nums.length-1],ratio=r.up?bi/o:o/bi;r.shade[r.shade.length-1]=isNaN(ratio)?'':ratio>1.5?'hi':ratio>1.25?'mid':ratio>1.05?'lo':''});d.ranks_done=true}
  function render(d){prep(d);meta.textContent=d.meta;var ours=D.methods.length-1,cnt=[0,0,0,0],lead=[];
    d.rows.forEach(function(r){var x=r.ranks[ours]||9;if(x<=3)cnt[x]++;else cnt[0]++;if(x!==1){var w=r.ranks.map(function(q,i){return q===1?D.methods[i]:null}).filter(Boolean).join(' and ');lead.push(r.metric+' ('+w+')')}});
    var s='ReLoopVSR on '+d.label+': best on '+cnt[1]+' of '+d.rows.length+' metrics, second on '+cnt[2]+', third on '+cnt[3]+(cnt[0]?', outside the top three on '+cnt[0]:'')+'.'+(lead.length?' Best elsewhere: '+lead.join(', ')+'.':'');sum.textContent=s;
    var t=el('table'),th=el('thead'),g=el('tr'),h=el('tr',{},[el('th',{scope:'col',text:'Metric'})]);g.appendChild(el('th',{}));
    G.slice(1).forEach(function(x){g.appendChild(el('th',{class:'grp',colspan:x[1],scope:'colgroup',text:x[0]}))});g.insertBefore(el('th',{}),g.children[1]);
    D.methods.forEach(function(m,i){h.appendChild(el('th',{scope:'col',class:i===ours?'dv':'',text:m+(i===ours?' (ours)':'')}))});th.appendChild(g);th.appendChild(h);t.appendChild(th);
    var b=el('tbody');d.rows.forEach(function(r){var tr=el('tr'),ph=el('th',{scope:'row',text:r.metric});ph.appendChild(arrow(r));tr.appendChild(ph);
      r.values.forEach(function(v,i){var q=r.ranks[i],lab=q&&q<=3?['best','second','third'][q-1]:'';var td=el('td',{class:(q&&q<=3?'r'+q:(r.shade&&r.shade[i]?'sh-'+r.shade[i]:''))+(i===ours?' dv':''),text:v===null?'–':v});if(lab)td.setAttribute('title',lab);if(lab){td.appendChild(el('span',{class:'vh',text:' ('+lab+')'}))}tr.appendChild(td)});b.appendChild(tr)});
    t.appendChild(b);host.innerHTML='';host.appendChild(t)}
  makeTabs($('#bench-tabs'),D.bench.map(function(d){return d.label}),function(i){render(D.bench[i])},'Choose a test set');render(D.bench[0]);
})();


/* Table 3 (accelerated streaming) and resolution table */
(function(){
  function td(c,ours){var cls=(c[1]?'r'+c[1]:(c[2]?'sh-'+c[2]:''))+(ours?' dv':'');var a={class:cls,text:c[0]};if(c[3]&&c[3]>1)a.colspan=c[3];return el('td',a)}
  var t3=$('#stream-table tbody');if(t3)D.stream.forEach(function(r){var ours=/^ReLoopVSR/.test(r.name),tr=el('tr',{class:r.name.indexOf('base')>0?'grp-start':''});tr.appendChild(el('th',{scope:'row',class:ours?'dv':'',text:r.name}));r.cells.forEach(function(c){tr.appendChild(td(c,ours))});t3.appendChild(tr)});
  var tr2=$('#res-table tbody');if(tr2)D.res.forEach(function(r){var ours=/^ReLoopVSR/.test(r.name),tr=el('tr',{class:r.name==='SwiftVR'?'grp-start':''});tr.appendChild(el('th',{scope:'row',class:ours?'dv':'',text:r.name}));r.cells.forEach(function(c){tr.appendChild(td(c,ours))});tr2.appendChild(tr)});
})();

/* citation copy */
(function(){var b=$('#copy'),s=$('#copy-status'),t=$('#bibtex').textContent;
  function done(ok){s.textContent=ok?'Copied to the clipboard.':'Could not copy; select the text manually.';b.textContent=ok?'Copied':'Copy';setTimeout(function(){b.textContent='Copy'},1800)}
  function legacy(){var a=el('textarea',{style:'position:fixed;opacity:0'});a.value=t;document.body.appendChild(a);a.select();var ok=false;try{ok=document.execCommand('copy')}catch(e){}a.remove();done(ok)}
  b.addEventListener('click',function(){if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(t).then(function(){done(true)},legacy);else legacy()})})();
})();

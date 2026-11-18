(function(){
'use strict';
var D=window.DV, REDUCED=matchMedia('(prefers-reduced-motion: reduce)');
/* i18n: each translated page sets window.DV_I18N (key -> text, {name} placeholders) and window.DV_BASE ('../'); English is the fallback */
var I18N=window.DV_I18N||{},BASE=window.DV_BASE||'';
function T(k,en,v){var s=I18N[k]!==undefined?I18N[k]:en;if(v)s=s.replace(/\{(\w+)\}/g,function(m,n){return v[n]!==undefined?v[n]:m});return s}
var $=function(s,r){return (r||document).querySelector(s)}, $$=function(s,r){return [].slice.call((r||document).querySelectorAll(s))};
function el(tag,attrs,kids){var e=document.createElement(tag);for(var k in attrs||{}){if(k==='text')e.textContent=attrs[k];else if(k==='html')e.innerHTML=attrs[k];else e.setAttribute(k,attrs[k])}(kids||[]).forEach(function(c){if(c)e.appendChild(c)});return e}
var GRIP='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 7-5 5 5 5M15 7l5 5-5 5"/></svg>';
var PLAY='<svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M2 1v10l9-5z"/></svg>',PAUSE='<svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M2 1h3v10H2zM7 1h3v10H7z"/></svg>';

/* theme */
var root=document.documentElement,themeBtn=$('#theme');
function isDark(){var t=root.getAttribute('data-theme');return t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches}
function syncTheme(){var d=isDark();root.setAttribute('data-dark',d);themeBtn.setAttribute('aria-pressed',d);themeBtn.setAttribute('aria-label',d?T('themeLight','Switch to light theme'):T('themeDark','Switch to dark theme'))}
themeBtn.addEventListener('click',function(){var n=isDark()?'light':'dark';root.setAttribute('data-theme',n);try{localStorage.setItem('dv-theme',n)}catch(e){}syncTheme()});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change',syncTheme);syncTheme();

/* nav highlight */
if('IntersectionObserver' in window){var navLinks=$$('.links a');var so=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)navLinks.forEach(function(a){if(a.getAttribute('href')==='#'+e.target.id)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current')})})},{rootMargin:'-40% 0px -55% 0px'});
navLinks.forEach(function(a){var t=$(a.getAttribute('href'));if(t)so.observe(t)})}

/* language switcher: static links work without JS; with JS they keep the current #hash, close on Escape or an outside click, and the
   choice is remembered only to mark it and to silence the language hint (no automatic redirect) */
(function(){var box=$('#lang');if(!box)return;var LS='dv-lang';
  function sync(){$$('a[hreflang]',box).forEach(function(a){var u=a.getAttribute('href').split('#')[0];a.setAttribute('href',u+(location.hash||''))})}
  sync();addEventListener('hashchange',sync);
  $$('a[hreflang]',box).forEach(function(a){a.addEventListener('click',function(){sync();try{localStorage.setItem(LS,a.getAttribute('hreflang'))}catch(e){}})});
  document.addEventListener('click',function(e){if(box.open&&!box.contains(e.target))box.open=false});
  box.addEventListener('keydown',function(e){if(e.key==='Escape'&&box.open){box.open=false;$('summary',box).focus()}});
  box.addEventListener('toggle',function(){if(box.open)sync()});
  /* optional hint on the English page only: the browser prefers one of the translations and no choice is stored */
  var cur=root.getAttribute('lang');if(cur!=='en')return;var stored=null;try{stored=localStorage.getItem(LS)||localStorage.getItem(LS+'-hint')}catch(e){return}if(stored)return;
  var pick=null;(navigator.languages||[navigator.language||'']).some(function(l){l=String(l).toLowerCase();
    if(/^en\b/.test(l))return true;if(/^zh-(tw|hk|mo|hant)/.test(l))pick='zh-Hant';else if(/^zh/.test(l))pick='zh-Hans';else if(/^ja/.test(l))pick='ja';else if(/^ko/.test(l))pick='ko';return !!pick});
  if(!pick)return;var link=$('a[hreflang="'+pick+'"]',box);if(!link)return;
  var H={'zh-Hans':['本页面提供简体中文版本。','查看简体中文版','关闭'],'zh-Hant':['本頁面提供繁體中文版本。','查看繁體中文版','關閉'],ja:['このページは日本語でもご覧いただけます。','日本語版を見る','閉じる'],ko:['이 페이지는 한국어로도 볼 수 있습니다.','한국어판 보기','닫기']}[pick];
  var go=el('a',{href:link.getAttribute('href'),hreflang:pick,text:H[1]}),x=el('button',{type:'button',class:'lang-x','aria-label':H[2],html:'<svg viewBox="0 0 12 12" aria-hidden="true"><path d="m3 3 6 6M9 3 3 9"/></svg>'});
  var bar=el('div',{class:'lang-hint',lang:pick,role:'note'},[el('span',{text:H[0]}),go,x]);
  go.addEventListener('click',function(){sync();go.href=link.getAttribute('href');try{localStorage.setItem(LS,pick)}catch(e){}});
  x.addEventListener('click',function(){bar.remove();try{localStorage.setItem(LS+'-hint','off')}catch(e){}});
  document.body.appendChild(bar)})();

/* slider core: pointer, touch and keyboard all funnel into set() */
function bindSlider(stage,grip,label,onChange,own,tan){
  var pos=50,drag=false;
  function set(p){pos=Math.min(100,Math.max(0,p));if(!own)stage.style.setProperty('--pos',pos+'%');var n=Math.round(pos);grip.setAttribute('aria-valuenow',n);grip.setAttribute('aria-valuetext',T('sliderValue','{n} percent of the width shows {what}',{n:n,what:label()}));if(onChange)onChange(pos)}
  function fromEvent(e){var r=stage.getBoundingClientRect(),x=e.clientX-r.left;if(tan)x-=(r.height/2-(e.clientY-r.top))*tan;set(x/r.width*100)}
  stage.addEventListener('pointerdown',function(e){if(e.button)return;drag=true;try{stage.setPointerCapture(e.pointerId)}catch(_){}grip.focus({preventScroll:true});fromEvent(e)});
  stage.addEventListener('pointermove',function(e){if(drag)fromEvent(e)});
  ['pointerup','pointercancel','lostpointercapture'].forEach(function(t){stage.addEventListener(t,function(){drag=false})});
  grip.addEventListener('keydown',function(e){var s=e.shiftKey?10:2,k=e.key,n=null;
    if(k==='ArrowLeft'||k==='ArrowDown')n=pos-s;else if(k==='ArrowRight'||k==='ArrowUp')n=pos+s;else if(k==='PageDown')n=pos-10;else if(k==='PageUp')n=pos+10;else if(k==='Home')n=0;else if(k==='End')n=100;
    if(n!==null){e.preventDefault();set(n)}});
  set(50);return {set:set,get:function(){return pos},quiet:function(p){pos=p;if(!own)stage.style.setProperty('--pos',p.toFixed(2)+'%');if(onChange)onChange(p)}};
}
function gripEl(name){return el('button',{class:'grip',type:'button',role:'slider','aria-label':name,'aria-valuemin':'0','aria-valuemax':'100','aria-orientation':'horizontal',html:GRIP})}

/* video comparison: both sides live in one stacked H.264 file, so they are frame-locked by construction */
function clipById(id){return D.clips.filter(function(c){return c.id===id})[0]}
var players=[];
function makeVideoCompare(host){
  var c=clipById(host.getAttribute('data-clip')),w=c.w,h=c.h,src=BASE+(c.src||'media/video/'+c.id+'.mp4'),poster=BASE+(c.poster||'media/poster/'+c.id+'.webp');
  var desc=host.getAttribute('data-desc'),hero=host.classList.contains('hero-view');
  var canvas=el('canvas',{width:w,height:h,role:'img','aria-label':desc}),ctx=canvas.getContext('2d',{alpha:false}),video=el('video',{muted:'',loop:'',playsinline:'',preload:'none','aria-hidden':'true',tabindex:'-1'});video.muted=true;
  var grip=gripEl(T('gripName','Comparison split: input on the left, ReLoopVSR on the right'));
  var marks=[el('span',{class:'tag l',text:T('tagInput','Input (bicubic)')}),el('span',{class:'tag r',text:T('tagOurs','ReLoopVSR')}),el('div',{class:'split'}),grip],stage;
  /* the hero keeps the input on one canvas and the output on a second canvas above it. The divider is slanted (it leans right going up,
     tan 0.36): the output's window is a wide box skewed about its left edge's midpoint, so its clipped left edge is the slanted line, and the
     canvas inside carries the exact inverse transform. Moving the divider changes only transforms (window, canvas, line rail, handle rail),
     so the motion and dragging never repaint or re-lay out anything, and the canvases are redrawn only on new video frames.
     The split value is the line's position at mid-height, where the handle sits. The method labels stay in the bottom corners. */
  var outC=null,octx=null,TAN=.36,SK=(Math.atan(TAN)*180/Math.PI).toFixed(3),outw,lineR,gripR;
  function heroTf(p){var a=p.toFixed(3);return [ 'translateX('+(p/2).toFixed(3)+'%) skewX(-'+SK+'deg)','skewX('+SK+'deg) translateX('+(-p).toFixed(3)+'%)','translateX('+a+'%) skewX(-'+SK+'deg)','translateX('+a+'%)']}
  if(hero){outC=el('canvas',{width:w,height:h,'aria-hidden':'true'});octx=outC.getContext('2d',{alpha:false});
    outw=el('div',{class:'outw'},[outC]);lineR=el('div',{class:'rail ln'},[marks[2]]);gripR=el('div',{class:'rail gr'},[marks[3]]);
    stage=el('div',{class:'stage hero-stage'},[canvas,outw,video,lineR,gripR,el('div',{class:'htags'},marks.slice(0,2))]);
    var movers=[outw,outC,lineR,gripR]}
  else stage=el('div',{class:'stage',style:'--ar:'+(w/h).toFixed(4)},[canvas,video].concat(marks));
  var img=new Image(),posterReady=false,usePoster=true,userPaused=false,userPlay=false,failed=false,loaded=false;
  /* two unscaled half draws (left of the split from the input half, right from the output half): no full-frame overdraw, no clip path */
  function draw(){if(hero){drawHero();return}var s=(!usePoster&&video.readyState>=2)?video:(posterReady?img:null);if(!s)return;
    var ox=c.layout==='h'?w:0,oy=c.layout==='v'?h:0,x=Math.round(w*slider.get()/100);
    if(x<w)ctx.drawImage(s,ox+x,oy,w-x,h,x,0,w-x,h);
    if(x>0)ctx.drawImage(s,0,0,x,h,0,0,x,h)}
  /* hero: full input and output frames, drawn only when the video has a new frame; the static poster image sits underneath until then */
  /* hero: the canvases hold only the part of the frame the cover crop shows, at source resolution (a phone draws about a quarter of the frame) */
  var crop={x:0,y:0,w:w,h:h};
  function fitHero(){var W=stage.clientWidth,H=stage.clientHeight;if(!W||!H)return;var k=Math.max(W/w,H/h),cw=Math.min(w,Math.round(W/k)),ch=Math.min(h,Math.round(H/k));
    if(cw===crop.w&&ch===crop.h)return;crop={x:Math.round((w-cw)/2),y:Math.round((h-ch)/2),w:cw,h:ch};canvas.width=outC.width=cw;canvas.height=outC.height=ch;drawHero()}
  function drawHero(){if(usePoster||video.readyState<2){stage.classList.remove('live');return false}
    var ox=c.layout==='h'?w:0,oy=c.layout==='v'?h:0,q=crop;ctx.drawImage(video,q.x,q.y,q.w,q.h,0,0,q.w,q.h);octx.drawImage(video,ox+q.x,oy+q.y,q.w,q.h,0,0,q.w,q.h);stage.classList.add('live');return true}
  /* hero: set each transform directly, so a split change restyles four elements and nothing else */
  /* past either edge, the label of the side that has left the frame fades out */
  var edge='';
  function moveHero(p){var t=heroTf(p);movers.forEach(function(m,i){m.style.transform=t[i]});
    var e=p>100.5?'all-in':p<-.5?'all-out':'';if(e!==edge){if(edge)stage.classList.remove(edge);if(e)stage.classList.add(e);edge=e}}
  var slider=bindSlider(stage,grip,function(){return T('sliderWhat','the bicubic input')},hero?moveHero:draw,hero,hero?TAN:0);
  /* the hero's first clip starts with the split at 3% */
  if(hero)slider.set(3);
  img.onload=function(){posterReady=true;draw()};
  /* the hero's button ships in the HTML (hidden until this runs) so the caption does not move when it appears */
  var pb=(hero&&$('#hero-play'))||el('button',{class:'play',type:'button'});if(hero)pb.classList.add('on');
  function ui(){var p=!video.paused;pb.innerHTML=(p?PAUSE:PLAY)+'<span>'+(p?T('pause','Pause'):T('play','Play'))+'</span>';pb.setAttribute('aria-label',p?T('pauseClip','Pause this clip'):T('playClip','Play this clip'))}
  var loop;
  function tick(now,md){if(video.paused)return;usePoster=false;if(hero)heroFrame(md);else draw();schedule()}
  function schedule(){if(video.requestVideoFrameCallback)video.requestVideoFrameCallback(tick);else requestAnimationFrame(tick)}
  video.addEventListener('play',function(){ui();schedule();if(hero)sweep.sync()});video.addEventListener('pause',function(){ui()});
  video.addEventListener('loadeddata',function(){if(video.paused&&video.currentTime===0){/* keep the poster until playing */}});
  video.addEventListener('seeked',function(){usePoster=false;draw()});
  video.addEventListener('error',function(){failed=true;usePoster=true;pb.disabled=true;draw();var m=el('p',{class:'vid-err',text:T('decodeErr','This browser could not decode the clip; a still frame is shown and the slider still works.')});var bc=host.querySelector('.bar-ctl');if(bc)bc.appendChild(m);ui()});
  function ensure(){if(!img.src&&!hero)img.src=poster}
  function load(){ensure();if(!loaded){loaded=true;video.preload='auto';video.src=src}}
  /* a clip that scrolled far away stops downloading; playback later resumes from the same position */
  var resumeAt=0;
  function buffered(){var b=video.buffered;return b.length>0&&video.duration>0&&b.end(b.length-1)>=video.duration-.25}
  function release(){if(!loaded||buffered())return;if(video.readyState>=1)resumeAt=video.currentTime;loaded=false;usePoster=true;video.pause();video.removeAttribute('src');video.load();draw()}
  video.addEventListener('loadedmetadata',function(){if(resumeAt){video.currentTime=resumeAt;resumeAt=0}});
  function play(){if(failed)return;load();var q=video.play();if(q&&q.catch)q.catch(function(){ui()})}
  pb.addEventListener('click',function(){if(video.paused){userPaused=false;userPlay=true;play()}else{userPaused=true;userPlay=false;video.pause()}});
  ui();
  /* optional sound toggle for clips with an audio track; starts muted so autoplay keeps working */
  var sb=null,sui=null;
  if(c.audio){sb=el('button',{class:'play snd',type:'button','aria-pressed':'false'});
    sui=function(){var on=!video.muted;sb.innerHTML='<span>'+(on?T('soundOn','Sound on'):T('soundOff','Sound off'))+'</span>';sb.setAttribute('aria-pressed',on);sb.setAttribute('aria-label',on?T('muteClip','Mute this clip'):T('unmuteClip','Unmute this clip'))};
    sb.addEventListener('click',function(){video.muted=!video.muted;if(!video.muted){players.forEach(function(o){if(o.video!==video)o.video.muted=true;if(o.sui)o.sui()});if(video.paused){userPaused=false;userPlay=true;play()}}sui()});sui()}
  /* hero: the file (hero_shots.mp4, 30 fps, 1.5x zoomed crops) holds four clips, each one continuous shot played in real time and
     then its last frame held for 2.6 s: NYC 103 frames, Vessel staircase 111, Tokyo 150, rose 90 (25.53 s loop).
     The divider is driven by the video's own clock, so it stays in step with the freeze even after buffering: while a clip plays it
     sweeps edge to edge (3% to 97%) and back, round(play/2.5 s) times (at least once, cosine); during the freeze it snaps off the
     right edge (whole frame = input), holds, snaps off the left edge (whole frame = ReLoopVSR), holds, and snaps back to 3% for the
     next clip (ease-in-out quart). The canvases are redrawn only when the shown source frame changes, so the hold costs no uploads.
     A drag, key press or keyboard focus holds the divider; 6 s after the last touch it glides back onto the schedule. Pausing the
     clip (off screen, hidden tab, Pause button) stops it. */
  var PF=[103,111,150,90],RP=[1,1,1,1],HF=78,L=-13,R=113,A=3,B=97,KF=[[0,A],[.3,R],[1.05,R],[1.4,L],[2.25,L],[2.55,A],[2.6,A]],lastId=-1;
  /* output-frame start of each clip and the loop length (frames) */
  var ST=[0],NT;for(var q=0;q<PF.length;q++)ST.push(ST[q]+PF[q]+HF);NT=ST[PF.length];
  var clipAt=function(n){var k=0;while(k<PF.length-1&&n>=ST[k+1])k++;return k};
  var ss=function(k){k=Math.min(1,Math.max(0,k));return k<.5?8*k*k*k*k:1-Math.pow(-2*k+2,4)/2};
  var sched=function(t){var T=NT/30;t=((t%T)+T)%T;var k=clipAt(t*30),pt=PF[k]/30,sw=Math.max(1,Math.round(pt/2.5));t-=ST[k]/30;
    if(t<pt)return A+(B-A)*(.5-.5*Math.cos(2*Math.PI*sw*t/pt));t-=pt;for(var i=1;i<KF.length;i++){var a=KF[i-1],b=KF[i];if(t<=b[0])return a[1]===b[1]?a[1]:a[1]+(b[1]-a[1])*ss((t-a[0])/(b[0]-a[0]))}return A};
  /* source frame shown at media time mt (an id unique across clips; the hold repeats the clip's last frame) */
  var srcId=function(mt){var n=((Math.round(mt*30)%NT)+NT)%NT,k=clipAt(n),i=Math.min(PF[k]-1,n-ST[k]);return k*1000+Math.floor(i/RP[k])};
  var sweep={sync:function(){}};
  function heroFrame(md){var mt=md?md.mediaTime:video.currentTime,id=srcId(mt);if(id!==lastId&&drawHero())lastId=id;sweep.sync()}
  if(hero){var raf=0,holdUntil=0,holding=false,glide=null,MOB=matchMedia('(max-width:800px)');
    var frame=function(now){raf=0;if(video.paused||REDUCED.matches||MOB.matches)return;raf=requestAnimationFrame(frame);
      if(document.activeElement===grip){holding=true;holdUntil=now+6000}
      if(holding){if(now<holdUntil)return;holding=false;glide={from:slider.get(),t0:now}}
      /* the media clock (currentTime) stops while the video stalls, so a stall freezes the divider too */
      var p=sched(video.currentTime);
      if(glide){var k=(now-glide.t0)/700;if(k>=1)glide=null;else p=glide.from+(p-glide.from)*ss(k)}
      if(Math.abs(p-slider.get())>.001)slider.quiet(p)};
    var hold=function(){holding=true;glide=null;holdUntil=performance.now()+6000};
    sweep={sync:function(){if(!raf)raf=requestAnimationFrame(frame)}};
    video.addEventListener('seeked',function(){lastId=-1;sweep.sync()});
    stage.addEventListener('pointerdown',hold);stage.addEventListener('pointermove',function(e){if(e.buttons)hold()});
    grip.addEventListener('keydown',hold);grip.addEventListener('blur',hold);
    grip.addEventListener('focus',function(){hold();slider.set(slider.get())})}
  var meta=el('div',{class:'cap',html:host.getAttribute('data-cap')||''});
  if(hero){host.appendChild(stage);fitHero();if(window.ResizeObserver)new ResizeObserver(fitHero).observe(stage);else addEventListener('resize',fitHero);var hc=$('.hero-cap');if(hc&&!pb.parentNode)hc.insertBefore(pb,hc.firstChild)}
  else if(host.closest('.card')){var fr=el('div',{class:'frame'+(h>w?' p':'')});fr.appendChild(stage);host.appendChild(fr)}else host.appendChild(stage);if(!hero)host.appendChild(el('div',{class:'bar-ctl'},[pb,sb,meta]));
  var p={host:host,video:video,ensure:ensure,release:release,enter:function(){ensure();if(!userPaused&&!REDUCED.matches){if(hero&&document.readyState!=='complete'){if(!p.waiting){p.waiting=true;window.addEventListener('load',function(){if(p.ratio>=.35&&!document.hidden)p.enter()},{once:true})}}else play()}},leave:function(){userPlay=false;if(!video.paused)video.pause()},hold:function(){if(!userPlay&&!video.paused)video.pause()},wants:function(){return !userPaused&&!failed},ratio:0,slider:slider,stage:stage,sui:sui};
  players.push(p);return p;
}
$$('[data-clip]').forEach(makeVideoCompare);
if('IntersectionObserver' in window){
  var near=new IntersectionObserver(function(es){es.forEach(function(e){var p=players.filter(function(p){return p.stage===e.target})[0];if(e.isIntersecting)p.ensure();else p.release()})},{rootMargin:'400px'});
  /* autoplay only the MAX_AUTO most visible clips (each decodes a full stacked frame); a clip the viewer started stays playing while on screen */
  var MAX_AUTO=2;
  function arbitrate(){var on=players.filter(function(p){return p.ratio>=.35});
    var auto=on.filter(function(p){return p.wants()}).sort(function(a,b){return b.ratio-a.ratio}).slice(0,MAX_AUTO);
    players.forEach(function(p){if(p.ratio<.35)p.leave();else if(auto.indexOf(p)>=0)p.enter();else p.hold()})}
  var vis=new IntersectionObserver(function(es){es.forEach(function(e){var p=players.filter(function(p){return p.stage===e.target})[0];p.ratio=e.isIntersecting?e.intersectionRatio:0});arbitrate()},{threshold:[0,.35,.5,.65,.8,.95]});
  players.forEach(function(p){near.observe(p.stage);vis.observe(p.stage)});
  document.addEventListener('visibilitychange',function(){if(document.hidden)players.forEach(function(p){p.leave()});else arbitrate()});
}else{players.forEach(function(p){p.ensure()});document.addEventListener('visibilitychange',function(){if(document.hidden)players.forEach(function(p){p.leave()})})}

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
  /* finished badge: shown on a lane or chip once it has delivered all 100 frames; the time is the measured finish on the shared clock */
  var CHECK='<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2.5 6.3 2.3 2.3 4.7-5"/></svg>';
  function secs(x){return (x<10?x.toFixed(2):x.toFixed(1))+T('unitS',' s')}
  function badge(){return el('span',{class:'rdone'})}
  function setDone(m,on){if(m.__d===on)return;m.__d=on;m.el.classList.toggle('done',on);m.dn.innerHTML=on?CHECK+'<span>'+(m.chip?'<span class="vh">'+T('doneAt','Done at ')+'</span>':T('done','Done '))+secs(m.tm.total)+'</span>':''}
  function fastName(k){return 'ReLoopVSR-fast (K='+(k||K)+')'}
  function frames(m,t){if(!m.tm||m.tm.oom)return 0;var a=m.tm.ttff,b=m.tm.total;if(t<a)return 0;if(b<=a||t>=b)return N;return Math.min(N,1+Math.floor((t-a)/(b-a)*(N-1)))}
  D.raceFrames=frames;
  var panels=[{src:'fast',key:'reloopvsr',ours:true},{src:'ReLoopVSR-base',key:'reloopvsr',ours:true},{src:'FlashVSR+',key:'flashvsr_plus'},{src:'RelayVSR',key:'relayvsr'}];
  var chips=['InfVSR','Stream-DiffVSR','ReCaVSR','FastVR','SwiftVR','FlashVSR-Tiny','DOVE','SeedVR2-3B','PS-SR','STAR'].map(function(n){return {src:n}});
  D.raceMethods=panels.concat(chips);
  var END=1;
  function retime(){panels.concat(chips).forEach(function(m){m.name=m.src==='fast'?fastName():m.src;m.tm=timing(m.name,ri)});
    var live=panels.filter(function(m){return !m.tm.oom});END=Math.max.apply(null,live.map(function(m){return m.tm.total}).concat([1]));
    panels.forEach(function(m){m.rn.textContent=m.name;
      if(m.tm.oom)m.w.innerHTML='<span>'+T('oomAt','{why} at {res}',{why:m.tm.why==='OOM'?T('oomLong','Out of memory (OOM)'):m.tm.why,res:RL[ri]})+'</span><b>'+T('notRaced','not raced')+'</b>';
      else m.w.innerHTML='<span>'+T('waitFirst','Waiting for first frame')+'</span><b>'+m.tm.ttffTxt+T('unitS',' s')+'</b>';
      m.meta.textContent=m.tm.oom?'OOM':T('laneMeta','{ttff} s, {fps} FPS',{ttff:m.tm.ttffTxt,fps:m.tm.fpsTxt});m.el.classList.toggle('oom',!!m.tm.oom);m.v.setAttribute('aria-label',T('laneAria','{name} on REDS4 clip 000, timed for {res}',{name:m.name,res:RL[ri]}))});
    chips.forEach(function(m){m.b.textContent=m.name})}
  var host=$('#race-panels');
  panels.forEach(function(m){var v=el('video',{muted:'',playsinline:'',preload:'auto',tabindex:'-1','data-src':BASE+'media/race/'+m.key+'.mp4'});v.muted=true;
    var w=el('div',{class:'rw'}),rn=el('span',{class:'rn'}),meta=el('span',{class:'rmeta'});
    var p=el('div',{class:'rp'+(m.ours?' ours':''),'data-m':m.key},[el('div',{class:'rv'},[v,w,rn,meta,el('span',{class:'rc2',text:'0 / 100'}),badge()]),el('div',{class:'rb'},[el('i')])]);
    host.appendChild(p);m.el=p;m.v=v;m.w=w;m.rn=rn;m.meta=meta;m.cnt=$('.rc2',p);m.dn=$('.rdone',p);m.bar=$('.rb i',p);m.shown=-1;
    v.addEventListener('error',function(){w.innerHTML='<span>'+T('clipNA','Clip unavailable')+'</span>';m.broken=true});
    v.addEventListener('seeked',function(){m.seeking=false;seek(m)});v.addEventListener('loadeddata',function(){seek(m)})});
  var chost=$('#race-chips');
  chips.forEach(function(m){var s=el('span',{text:''}),b=el('b'),d=badge();m.el=el('div',{class:'chip'},[el('div',{class:'ch'},[b,d]),s]);m.st=s;m.b=b;m.dn=d;m.chip=true;chost.appendChild(m.el)});
  var inp=$('.rp-in',root),iv=$('video',inp),icnt=$('.rc',inp),ibar=$('.rb i',inp);iv.muted=true;
  var IN={v:iv,shown:-1,want:0};iv.addEventListener('seeked',function(){IN.seeking=false;seek(IN)});iv.addEventListener('loadeddata',function(){seek(IN)});
  var clock=$('#race-clock'),note=$('#race-speed-note'),pbtn=$('#race-pause'),t=0,speed=1,running=false,last=0,started=false,autoPaused=false,userPaused=false,inView=false;
  function seek(m){if(m.broken||m.seeking||m.want===m.shown||m.want<1||m.v.readyState<1)return;m.seeking=true;m.shown=m.want;m.v.currentTime=(m.want-.5)/24}
  /* only touch the DOM when a value changes: the loop runs every animation frame, most counters do not */
  function txt(n,v){if(n.__v!==v){n.__v=v;n.textContent=v}}
  function wid(n,k){if(n.__w!==k){n.__w=k;n.style.width=k+'%'}}
  function paint(){
    txt(clock,t.toFixed(1)+' s');
    panels.forEach(function(m){var k=frames(m,t);m.want=k;if(m.__live!==(k>0)){m.__live=k>0;m.el.classList.toggle('live',k>0)}txt(m.cnt,m.tm.oom?'OOM':k+' / 100');wid(m.bar,k);setDone(m,k===N);seek(m)});
    chips.forEach(function(m){if(m.tm.oom){setDone(m,false);txt(m.st,T('chipOom','{why} at {res}, not raced',{why:m.tm.why,res:RL[ri]}));return}var k=frames(m,t);setDone(m,k===N);txt(m.st,k?T('chipFrames','{k} / 100 frames',{k:k}):T('chipWait','0 / 100, first frame at {t} s',{t:m.tm.ttffTxt}))});
    var a=frames(panels[0],t);txt(icnt,a+' / 100');wid(ibar,a);IN.want=a;seek(IN);
  }
  function loop(now){if(!running)return;var dt=Math.min(.25,(now-last)/1000);last=now;t=Math.min(END,t+dt*speed);paint();if(t>=END){running=false;pbtn.textContent=T('pause','Pause');pbtn.disabled=true;return}requestAnimationFrame(loop)}
  function start(){running=true;last=performance.now();pbtn.disabled=false;pbtn.textContent=T('pause','Pause');iv.pause();requestAnimationFrame(loop)}
  function stop(){running=false;pbtn.textContent=T('resume','Resume');iv.pause()}
  function rewind(){t=0;IN.shown=-1;panels.forEach(function(m){m.shown=-1});paint()}
  pbtn.addEventListener('click',function(){if(running){userPaused=true;autoPaused=false;stop()}else{userPaused=false;start()}});
  $('#race-replay').addEventListener('click',function(){userPaused=false;autoPaused=false;rewind();start()});
  $$('.seg[data-g=speed] button',root).forEach(function(b){b.addEventListener('click',function(){speed=+b.getAttribute('data-s');$$('.seg[data-g=speed] button',root).forEach(function(x){x.setAttribute('aria-pressed',x===b)});note.textContent=speed===1?T('speed1','1× speed'):T('speedN','Accelerated {n}×',{n:speed});note.classList.toggle('fast',speed!==1)})});
  var cap=$('#race-cap');
  function caption(){var f=timing(fastName(),ri),f8=timing(fastName(8),ri),b=timing('ReLoopVSR-base',ri);
    cap.textContent=T('raceCap','{res}: {name}, first frame in {t} s, {fps} FPS.',{res:RL[ri],name:fastName(),t:f.ttffTxt,fps:f.fpsTxt})}
  /* the buttons ship in the HTML so the control row does not reflow when the script runs; any missing one is created */
  function segment(g,vals,labels,cur,on){var h=$('.seg[data-g='+g+']',root),pre=$$('button',h);vals.forEach(function(v,i){var b=pre[i]||el('button',{type:'button','aria-pressed':v===cur?'true':'false',text:labels[i]});
    b.addEventListener('click',function(){$$('button',h).forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});on(v);retime();caption();rewind();if(started&&!userPaused&&inView)start()});if(!pre[i])h.appendChild(b)})}
  segment('res',[0,1,2,3],RL,0,function(v){ri=v});segment('k',KS,KS.map(function(k){return 'K='+k}),20,function(v){K=v});
  retime();caption();
  function autoPause(){if(running){running=false;autoPaused=true;pbtn.textContent=T('resume','Resume');iv.pause()}}
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
  function go(){if(started)return;started=true;if(inView)start();else{autoPaused=true;pbtn.textContent=T('resume','Resume')}}
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
var DSETS=['All','REDS4','YouHQ40','Tears of Steel','VideoLQ'];
makeTabs($('#show-tabs'),DSETS.map(function(n,i){return i?n:T('all','All')}),function(i){cards.forEach(function(c){c.hidden=!(i===0||c.getAttribute('data-ds')===DSETS[i])})},T('filterTabs','Filter comparisons by dataset'));


/* Table 1 bars */
(function(){
  var M=[{k:'fps',t:'FPS',l:T('effFpsL','Frames per second at 720p in FP32, higher is better'),hi:true,u:' FPS'},{k:'ttff',t:'TTFF',l:T('effTtffL','Time to first frame in seconds, lower is better. Log axis from 0.01 s.'),log:[.01,10000],u:T('unitS',' s')},{k:'peak',t:T('effPeakT','Peak memory'),l:T('effPeakL','Peak allocated GPU memory in GiB, lower is better'),u:' GiB'},{k:'future',t:T('effFutT','Future frames'),l:T('effFutL','Future frames that can influence an output, lower is better'),u:T('unitFr',' fr')},{k:'tflops',t:'TFLOPs',l:T('effTflL','TFLOPs per 720p output frame, lower is better'),u:' TFLOPs'},{k:'params',t:T('effParT','Params'),l:T('effParL','Parameters in millions, lower is better'),u:' M'}];
  var bars=$('#eff-bars'),lab=$('#eff-label'),tip=$('#tip');
  function tiptext(e){return '<b>'+e.name+'</b><br>'+T('tip','{fps} FPS · {tflops} TFLOPs/frame<br>TTFF {ttff} s · Peak {peak} GiB<br>Future frames {future} · Params {params} M',e)}
  function render(m){lab.textContent=m.l;var rows=D.eff.slice().sort(function(a,b){return m.hi?b[m.k]-a[m.k]:a[m.k]-b[m.k]});var max=Math.max.apply(null,D.eff.map(function(e){return +e[m.k]}));
    bars.innerHTML='';rows.forEach(function(e){var v=+e[m.k],w=m.log?Math.log10(v/m.log[0])/Math.log10(m.log[1]/m.log[0])*100:v/max*100;
      var r=el('div',{class:'brow'+(/^ReLoopVSR/.test(e.name)?' ours':''),tabindex:'0',role:'listitem','aria-label':e.name+': '+e[m.k]+m.u},[el('span',{text:e.name}),el('div',{class:'track'},[el('div',{class:'fill',style:'width:'+w+'%'})]),el('span',{class:'val',text:e[m.k]+(e[m.k+'_note']||'')})]);
      function show(ev){tip.hidden=false;tip.innerHTML=tiptext(e);var b=r.getBoundingClientRect(),x=ev&&ev.clientX?ev.clientX+14:b.left+140,y=ev&&ev.clientY?ev.clientY+14:b.bottom+6;tip.style.left=Math.min(x,innerWidth-262)+'px';tip.style.top=Math.min(y,innerHeight-110)+'px'}
      function hide(){tip.hidden=true}
      r.addEventListener('pointermove',show);r.addEventListener('pointerleave',hide);r.addEventListener('focus',function(){show()});r.addEventListener('blur',hide);r.addEventListener('keydown',function(ev){if(ev.key==='Escape')hide()});
      bars.appendChild(r)})}
  makeTabs($('#eff-tabs'),M.map(function(m){return m.t}),function(i){render(M[i])},T('effTabs','Choose a cost metric'));render(M[0]);
  var tb=$('#eff-table tbody');D.eff.forEach(function(e){var tr=el('tr'),ours=/^ReLoopVSR/.test(e.name);tr.appendChild(el('th',{scope:'row',class:ours?'dv':'',text:e.name+(ours?T('ours',' (ours)'):'')}));
    ['params','tflops','future','fps','ttff','peak'].forEach(function(k){var r=e.ranks[k];tr.appendChild(el('td',{class:r?'r'+r:'',text:e[k]}))});tb.appendChild(tr)});
})();

/* benchmarks */
(function(){
  var host=$('#bench-table'),sum=$('#bench-sum'),meta=$('#bench-meta'),G=[['',1],[T('grpOffline','Offline diffusion'),4],[T('grpChunk','Streaming chunk-based diffusion'),3],[T('grpAR','Streaming autoregressive diffusion'),2]];
  function arrow(r){return el('span',{'aria-label':r.up?T('higher','higher is better'):T('lower','lower is better'),text:r.up?' ↑':' ↓'})}
  function prep(d){if(d.ranks_done)return;d.rows.forEach(function(r){if(r.ranks)return;var O=window.VIDEOLQ_OURS||{};r.values[r.values.length-1]=O[r.metric]!==undefined?O[r.metric]:null;
      var nums=r.values.map(function(v){return v===null?NaN:parseFloat(v)});var u=nums.filter(function(x){return !isNaN(x)}).filter(function(x,i,a){return a.indexOf(x)===i}).sort(function(x,y){return r.up?y-x:x-y});
      r.ranks=nums.map(function(x){if(isNaN(x))return 0;var q=u.indexOf(x)+1;return q<=3?q:0});var bi=nums[0],o=nums[nums.length-1],ratio=r.up?bi/o:o/bi;r.shade[r.shade.length-1]=isNaN(ratio)?'':ratio>1.5?'hi':ratio>1.25?'mid':ratio>1.05?'lo':''});d.ranks_done=true}
  function render(d){prep(d);meta.textContent=T('meta:'+d.name,d.meta);var ours=D.methods.length-1,cnt=[0,0,0,0],lead=[];
    d.rows.forEach(function(r){var x=r.ranks[ours]||9;if(x<=3)cnt[x]++;else cnt[0]++;if(x!==1){var w=r.ranks.map(function(q,i){return q===1?D.methods[i]:null}).filter(Boolean).join(T('and',' and '));lead.push(T('leadItem','{metric} ({who})',{metric:r.metric,who:w}))}});
    var s=T('sum','ReLoopVSR on {set}: best on {b} of {n} metrics, second on {s}, third on {t}{rest}.',{set:d.label,b:cnt[1],n:d.rows.length,s:cnt[2],t:cnt[3],rest:cnt[0]?T('sumRest',', outside the top three on {o}',{o:cnt[0]}):''})+(lead.length?T('sumLead',' Best elsewhere: {list}.',{list:lead.join(T('listSep',', '))}):'');sum.textContent=s;
    var t=el('table'),th=el('thead'),g=el('tr'),h=el('tr',{},[el('th',{scope:'col',text:T('metric','Metric')})]);g.appendChild(el('th',{}));
    G.slice(1).forEach(function(x){g.appendChild(el('th',{class:'grp',colspan:x[1],scope:'colgroup',text:x[0]}))});g.insertBefore(el('th',{}),g.children[1]);
    D.methods.forEach(function(m,i){h.appendChild(el('th',{scope:'col',class:i===ours?'dv':'',text:m+(i===ours?T('ours',' (ours)'):'')}))});th.appendChild(g);th.appendChild(h);t.appendChild(th);
    var b=el('tbody');d.rows.forEach(function(r){var tr=el('tr'),ph=el('th',{scope:'row',text:r.metric});ph.appendChild(arrow(r));tr.appendChild(ph);
      r.values.forEach(function(v,i){var q=r.ranks[i],lab=q&&q<=3?[T('rBest','best'),T('rSecond','second'),T('rThird','third')][q-1]:'';var td=el('td',{class:(q&&q<=3?'r'+q:(r.shade&&r.shade[i]?'sh-'+r.shade[i]:''))+(i===ours?' dv':''),text:v===null?'–':v});if(lab)td.setAttribute('title',lab);if(lab){td.appendChild(el('span',{class:'vh',text:' ('+lab+')'}))}tr.appendChild(td)});b.appendChild(tr)});
    t.appendChild(b);host.innerHTML='';host.appendChild(t)}
  makeTabs($('#bench-tabs'),D.bench.map(function(d){return d.label}),function(i){render(D.bench[i])},T('benchTabs','Choose a test set'));render(D.bench[0]);
})();


/* Table 3 (accelerated streaming) and resolution table */
(function(){
  function td(c,ours){var cls=(c[1]?'r'+c[1]:(c[2]?'sh-'+c[2]:''))+(ours?' dv':'');var a={class:cls,text:c[0]};if(c[3]&&c[3]>1)a.colspan=c[3];return el('td',a)}
  var t3=$('#stream-table tbody');if(t3)D.stream.forEach(function(r){var ours=/^ReLoopVSR/.test(r.name),tr=el('tr',{class:r.name.indexOf('base')>0?'grp-start':''});tr.appendChild(el('th',{scope:'row',class:ours?'dv':'',text:r.name}));r.cells.forEach(function(c){tr.appendChild(td(c,ours))});t3.appendChild(tr)});
  var tr2=$('#res-table tbody');if(tr2)D.res.forEach(function(r){var ours=/^ReLoopVSR/.test(r.name),tr=el('tr',{class:r.name==='SwiftVR'?'grp-start':''});tr.appendChild(el('th',{scope:'row',class:ours?'dv':'',text:r.name}));r.cells.forEach(function(c){tr.appendChild(td(c,ours))});tr2.appendChild(tr)});
})();

/* citation copy */
(function(){var b=$('#copy'),s=$('#copy-status'),t=$('#bibtex').textContent;
  function done(ok){s.textContent=ok?T('copiedMsg','Copied to the clipboard.'):T('copyFail','Could not copy; select the text manually.');b.textContent=ok?T('copied','Copied'):T('copy','Copy');setTimeout(function(){b.textContent=T('copy','Copy')},1800)}
  function legacy(){var a=el('textarea',{style:'position:fixed;opacity:0'});a.value=t;document.body.appendChild(a);a.select();var ok=false;try{ok=document.execCommand('copy')}catch(e){}a.remove();done(ok)}
  b.addEventListener('click',function(){if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(t).then(function(){done(true)},legacy);else legacy()})})();
})();

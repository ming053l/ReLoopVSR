/* Animated schematic in the Method section: how each kind of method produces frame k. */
(function(){
'use strict';
var root=document.getElementById('schematic');
if(!root)return;

var NS='http://www.w3.org/2000/svg',W=340,H=500;
var POSTER='media/poster/reds_011.webp',POSTER_W=1280,POSTER_H=1440,HALF=720;
var CROP={x:760,y:120,w:400,h:225};
var SHIFT=44; /* crop offset of the previous frame, in poster pixels */
var reduced=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):{matches:false};
var uidN=0;
function uid(){uidN+=1;return 'sch-'+uidN}
function el(n,a,p){var e=document.createElementNS(NS,n);for(var k in a)if(a[k]!==undefined)e.setAttribute(k,a[k]);if(p)p.appendChild(e);return e}
function clamp(v){return v<0?0:v>1?1:v}
function easeOut(p){return 1-(1-p)*(1-p)*(1-p)}
function easeIO(p){return p<.5?4*p*p*p:1-Math.pow(-2*p+2,3)/2}
function linear(p){return p}

/* Reproducible grey noise, shared by every noisy state and the legend chip. */
function makeNoise(){
  var c=document.createElement('canvas');c.width=124;c.height=70;
  var x=c.getContext('2d'),d=x.createImageData(c.width,c.height),s=20261109;
  for(var i=0;i<d.data.length;i+=4){
    s=(s*1664525+1013904223)>>>0;
    var v=(s>>>24)*.8+22;
    d.data[i]=v+(s>>>16&15)-7;d.data[i+1]=v;d.data[i+2]=v+(s>>>8&15)-7;d.data[i+3]=255;
  }
  x.putImageData(d,0,0);return c.toDataURL('image/png');
}
var NOISE=makeNoise();

function Lane(idx,svg){this.idx=idx;this.svg=svg;this.tracks=[];this.end=0;this.state='idle';this.armed=true;this.playing=false;this.t0=null;this.g=el('g',{},svg)}
Lane.prototype.add=function(t,d,fn,ease){this.tracks.push({t:t,d:d,fn:fn,ease:ease||easeOut});if(t+d>this.end)this.end=t+d};
Lane.prototype.seek=function(t){
  for(var i=0;i<this.tracks.length;i++){var k=this.tracks[i];k.fn(k.ease(clamp((t-k.t)/k.d)))}
};
Lane.prototype.fade=function(e,t,d){
  this.add(t,d===undefined?.45:d,function(p){e.setAttribute('opacity',p)});
};

function setText(p,x,y,str,cls,anchor){
  var t=el('text',{x:x,y:y,'class':cls,'text-anchor':anchor||'start'},p);
  str.split('*').forEach(function(part,i){
    if(!part)return;
    var s=el('tspan',i%2?{'class':'sch-i'}:{},t);s.textContent=part;
  });
  return t;
}
function image(p,x,y,w,h,src,shift,clip){
  var top=src==='lr'?0:HALF,cropW=CROP.w,cropH=CROP.h;
  var s=el('svg',{x:x,y:y,width:w,height:h,viewBox:(CROP.x+(shift||0))+' '+(CROP.y+top)+' '+cropW+' '+cropH,preserveAspectRatio:'xMidYMid slice'},p);
  if(clip)s.setAttribute('clip-path',clip);
  el('image',{href:POSTER,width:POSTER_W,height:POSTER_H,preserveAspectRatio:'none'},s);
  return s;
}
/* A rounded image thumbnail with an optional noise overlay and a caption band. */
function thumb(p,o){
  var g=el('g',{'class':'sch-th '+(o.cls||''),opacity:0},p),id=uid();
  var defs=el('defs',{},g),cp=el('clipPath',{id:id},defs);
  el('rect',{x:o.x,y:o.y,width:o.w,height:o.h,rx:6},cp);
  var clip=el('g',{'clip-path':'url(#'+id+')'},g);
  image(clip,o.x,o.y,o.w,o.h,o.src,o.shift);
  var noise=el('image',{href:NOISE,x:o.x,y:o.y,width:o.w,height:o.h,preserveAspectRatio:'none','class':'sch-noise',opacity:o.noise||0},clip);
  if(o.label){
    el('rect',{x:o.x,y:o.y+o.h-16,width:o.w,height:16,'class':'sch-band'},clip);
    setText(clip,o.x+o.w/2,o.y+o.h-4.5,o.label,'sch-band-t','middle');
  }
  el('rect',{x:o.x+.5,y:o.y+.5,width:o.w-1,height:o.h-1,rx:5.5,'class':'sch-frame'},g);
  return {g:g,noise:noise,clip:clip};
}
function pill(p,x,y,w,h,label,cls){
  var g=el('g',{'class':'sch-pill '+(cls||''),opacity:0},p);
  var r=el('rect',{x:x,y:y,width:w,height:h,rx:h/2},g);
  setText(g,x+w/2,y+h/2+3.9,label,'sch-pill-t','middle');
  return {g:g,r:r};
}
function roundPoly(pts,r){
  var d='M'+pts[0][0]+','+pts[0][1];
  for(var i=1;i<pts.length-1;i++){
    var a=pts[i-1],b=pts[i],c=pts[i+1];
    var d1=Math.hypot(b[0]-a[0],b[1]-a[1]),d2=Math.hypot(c[0]-b[0],c[1]-b[1]),rr=Math.min(r,d1/2,d2/2);
    var ax=b[0]-(b[0]-a[0])/d1*rr,ay=b[1]-(b[1]-a[1])/d1*rr,cx=b[0]+(c[0]-b[0])/d2*rr,cy=b[1]+(c[1]-b[1])/d2*rr;
    d+=' L'+ax+','+ay+' Q'+b[0]+','+b[1]+' '+cx+','+cy;
  }
  var e=pts[pts.length-1];return d+' L'+e[0]+','+e[1];
}
function sampler(pts){
  var segs=[],tot=0;
  for(var i=1;i<pts.length;i++){var l=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);segs.push(l);tot+=l}
  return function(p){
    var d=p*tot;
    for(var j=0;j<segs.length;j++){
      if(d<=segs[j]||j===segs.length-1){var f=segs[j]?d/segs[j]:0,a=pts[j],b=pts[j+1];return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]}
      d-=segs[j];
    }
    return pts[pts.length-1];
  };
}
/* An arrow that draws from its tail while a dot carries the data along it. */
function arrow(L,pts,t,d,o){
  o=o||{};
  var cls='sch-ar '+(o.cls||'');
  var path=el('path',{d:roundPoly(pts,o.r===undefined?9:o.r),'class':cls,fill:'none',pathLength:o.dash?undefined:1},L.g);
  var n=pts.length,e=pts[n-1],b=pts[n-2],a=Math.atan2(e[1]-b[1],e[0]-b[0]),s=o.head||6;
  var head=el('polygon',{'class':'sch-arh '+(o.cls||''),points:
    e[0]+','+e[1]+' '+(e[0]-Math.cos(a-.5)*s)+','+(e[1]-Math.sin(a-.5)*s)+' '+(e[0]-Math.cos(a+.5)*s)+','+(e[1]-Math.sin(a+.5)*s),opacity:0},L.g);
  var dot=el('circle',{r:o.dot||3,'class':'sch-dot '+(o.cls||''),opacity:0},L.g);
  var at=sampler(pts);
  if(o.dash){path.setAttribute('opacity',0);L.add(t,d,function(p){path.setAttribute('opacity',p)})}
  else{
    path.setAttribute('stroke-dasharray','0 1');path.setAttribute('opacity',0);
    L.add(t,d,function(p){path.setAttribute('stroke-dasharray',p+' 1');path.setAttribute('opacity',p>0?1:0)},easeIO);
  }
  L.add(t+d*.85,d*.2+.06,function(p){head.setAttribute('opacity',p)},linear);
  L.add(t,d,function(p){
    var q=at(p);dot.setAttribute('cx',q[0]);dot.setAttribute('cy',q[1]);
    dot.setAttribute('opacity',p>0&&p<1?1:0);
  },easeIO);
  return path;
}
function ring(L,o,t,d,cls){
  var r=el('rect',{x:o.x-1,y:o.y-1,width:o.w+2,height:o.h+2,rx:7,'class':'sch-ring '+(cls||''),opacity:0},L.g);
  L.add(t,d,function(p){
    var g=p*16;
    r.setAttribute('x',o.x-1-g/2);r.setAttribute('y',o.y-1-g/2);r.setAttribute('width',o.w+2+g);r.setAttribute('height',o.h+2+g);
    r.setAttribute('stroke-width',3*(1-p)+.4);r.setAttribute('opacity',Math.sin(p*Math.PI));
  },linear);
}

/* A. Regenerate each frame */
function laneA(L){
  var g=L.g,steps=[38,112,186,260],levels=[.82,.55,.28,.06],prev=[1,.82,.55,.28];
  var noiseB={x:38,y:6,w:124,h:70};
  var n=thumb(g,{x:38,y:6,w:124,h:70,src:'hr',noise:1,label:'Noise',cls:'sch-s-noise'});
  var lr=thumb(g,{x:198,y:6,w:124,h:70,src:'lr',label:'Current LR frame *k*'});
  var pv=thumb(g,{x:38,y:110,w:124,h:70,src:'hr',shift:-SHIFT,label:'Previous restoration'});
  L.fade(n.g,.1);L.fade(lr.g,.3);L.fade(pv.g,.45);
  ring(L,noiseB,.5,.8,'sch-grey');
  arrow(L,[[100,180],[100,222]],1.05,.6,{dash:1,cls:'sch-cond'});
  arrow(L,[[260,76],[260,222]],1.05,.6,{dash:1,cls:'sch-cond'});
  var cond=setText(g,180,204,'Conditioning','sch-note sch-c','middle');cond.setAttribute('opacity',0);L.fade(cond,1.3);
  var bar=pill(g,38,222,284,22,'Four denoising steps','sch-grey-p');L.fade(bar.g,1.5,.4);
  arrow(L,[[38,41],[16,41],[16,292],[38,292]],1.85,1.05,{cls:'sch-grey-a'});
  var t0=2.9,stp=.95;
  steps.forEach(function(x,i){
    var t=t0+i*stp;
    var tick=el('line',{x1:x+31,y1:244,x2:x+31,y2:262,'class':'sch-cond sch-tick',opacity:0},g);
    L.fade(tick,t-.2,.25);
    var s=thumb(g,{x:x,y:262,w:62,h:60,src:'hr',noise:prev[i],label:'Step '+(i+1)});
    L.fade(s.g,t,.25);
    (function(nn,a,b){L.add(t+.2,.6,function(p){nn.setAttribute('opacity',a+(b-a)*p)})})(s.noise,prev[i],levels[i]);
    if(i<3)arrow(L,[[x+62,292],[x+74,292]],t+.7,.25,{cls:'sch-grey-a',dot:2.4,head:5});
  });
  arrow(L,[[291,322],[291,360],[245,360],[245,402]],t0+4*stp-.05,.75,{cls:'sch-grey-a'});
  var out=thumb(g,{x:170,y:402,w:150,h:84,src:'hr',label:'Restored frame *k*'});
  L.fade(out.g,t0+4*stp+.5,.5);
  setNote(L,g,[38,432],['Frame *k*+1 starts','from new noise.'],t0+4*stp+.9);
}
function setNote(L,g,xy,lines,t){
  lines.forEach(function(s,i){var n=setText(g,xy[0],xy[1]+i*15,s,'sch-note');n.setAttribute('opacity',0);L.fade(n,t+i*.08)});
}

/* B. Re-restore chunks */
function laneB(L){
  var g=L.g,xs=[10,92,174,256],names=['*k*−1','*k*','*k*+1','*k*+2'],y=28,w=74,h=56;
  var box=el('rect',{x:4,y:20,width:332,height:72,rx:8,'class':'sch-chunk',opacity:0},g);
  L.add(2.75,.45,function(p){box.setAttribute('opacity',p)});
  var hd=setText(g,170,14,'Buffered chunk','sch-lab','middle');hd.setAttribute('opacity',0);L.fade(hd,2.85);
  xs.forEach(function(x,i){
    var t=thumb(g,{x:x,y:y,w:w,h:h,src:'lr',shift:(i-1)*SHIFT*.55,label:names[i],cls:i>1?'sch-future':(i===1?'sch-frame-k':'')});
    L.fade(t.g,.2+i*.62,.4);
  });
  var wait=setText(g,129,108,'Frame *k* waits','sch-note sch-strong','middle');wait.setAttribute('opacity',0);
  L.add(.9,.4,function(p){wait.setAttribute('opacity',p)});
  var br=el('path',{d:'M178 96 L178 100 L330 100 L330 96','class':'sch-bracket',fill:'none',opacity:0},g);
  L.fade(br,1.6);
  var fut=setText(g,254,113,'Future frames','sch-note','middle');fut.setAttribute('opacity',0);L.fade(fut,1.7);
  /* the wait pulses until the buffer is complete */
  L.add(1.3,1.5,function(p){if(p>0&&p<1)wait.setAttribute('opacity',.45+.55*(.5+.5*Math.cos(p*Math.PI*6)));else if(p>=1)wait.setAttribute('opacity',1)},linear);
  arrow(L,[[170,120],[170,156]],3.15,.55,{cls:'sch-grey-a',dot:3.6});
  arrow(L,[[108,120],[108,156]],3.25,.55,{cls:'sch-grey-a sch-thin',dot:3});
  arrow(L,[[232,120],[232,156]],3.25,.55,{cls:'sch-grey-a sch-thin',dot:3});
  var bar=pill(g,14,156,312,38,'Joint restoration of the chunk','sch-grey-p sch-pill-lg');L.fade(bar.g,3.7,.4);
  var sweep=el('rect',{x:14,y:156,width:0,height:38,rx:19,'class':'sch-sweep',opacity:0},g);
  L.add(4.1,.9,function(p){sweep.setAttribute('width',312*p);sweep.setAttribute('opacity',p>0&&p<1?.35:0)},linear);
  arrow(L,[[170,194],[170,224]],5.05,.45,{cls:'sch-grey-a',dot:3.4});
  xs.forEach(function(x,i){
    var t=thumb(g,{x:x,y:224,w:w,h:h,src:'hr',shift:(i-1)*SHIFT*.55,label:names[i],cls:i===1?'sch-frame-k':''});
    L.fade(t.g,5.5,.45);
  });
  ring(L,{x:xs[1],y:224,w:w,h:h},5.9,.7,'sch-grey');
  arrow(L,[[129,280],[129,350],[245,350],[245,402]],6.1,.8,{cls:'sch-grey-a'});
  var out=thumb(g,{x:170,y:402,w:150,h:84,src:'hr',label:'Restored frame *k*'});
  L.fade(out.g,6.8,.5);
  setNote(L,g,[38,432],['The next chunk','overlaps this one.'],7.2);
}

/* C. ReLoopVSR */
function laneC(L){
  var g=L.g,TW=124/6,TH=70/4,bad=[[3,1],[4,1],[3,2],[4,2],[5,2]];
  var pv=thumb(g,{x:38,y:6,w:124,h:70,src:'hr',shift:-SHIFT,label:'Previous restored latent',cls:'sch-s-prev'});
  var lr=thumb(g,{x:198,y:6,w:124,h:70,src:'lr',label:'Current LR frame *k*'});
  L.fade(pv.g,.1);L.fade(lr.g,.3);
  ring(L,{x:38,y:6,w:124,h:70},.5,.8);
  arrow(L,[[100,76],[100,110]],1,.55,{cls:'sch-acc-a'});
  var wl=setText(g,106,97,'Warp by flow','sch-note');wl.setAttribute('opacity',0);L.fade(wl,1.05);
  var al=thumb(g,{x:38,y:110,w:124,h:70,src:'hr',label:'Aligned latent'});
  L.fade(al.g,1.5,.4);
  arrow(L,[[260,76],[260,110]],1.3,.55,{cls:'sch-cond-s'});
  var el2=setText(g,266,97,'Encode','sch-note');el2.setAttribute('opacity',0);L.fade(el2,1.35);
  var en=thumb(g,{x:198,y:110,w:124,h:70,src:'lr',label:'Encoded LR'});
  L.fade(en.g,1.8,.4);
  /* reliability: tile grid on the aligned latent, flagged tiles shaded */
  var over=el('g',{opacity:0,'class':'sch-tiles'},al.clip);
  for(var i=1;i<6;i++)el('line',{x1:38+i*TW,y1:110,x2:38+i*TW,y2:180},over);
  for(var j=1;j<4;j++)el('line',{x1:38,y1:110+j*TH,x2:162,y2:110+j*TH},over);
  bad.forEach(function(b){el('rect',{x:38+b[0]*TW,y:110+b[1]*TH,width:TW,height:TH,'class':'sch-bad'},over)});
  L.fade(over,2.75,.5);
  arrow(L,[[100,180],[100,206],[108,206]],2.45,.5,{cls:'sch-acc-a'});
  arrow(L,[[260,180],[260,206],[232,206]],2.55,.5,{cls:'sch-cond-s'});
  var rel=pill(g,108,194,124,24,'Reliability check','sch-acc-p');L.fade(rel.g,2.95,.4);
  var r1=setText(g,92,205,'Reliable tiles','sch-note','end');r1.setAttribute('opacity',0);L.fade(r1,3.3);
  var r2=setText(g,268,198,'Unreliable','sch-note');r2.setAttribute('opacity',0);L.fade(r2,3.3);
  var r3=setText(g,268,211,'tiles','sch-note');r3.setAttribute('opacity',0);L.fade(r3,3.35);
  arrow(L,[[170,218],[170,232]],3.65,.3,{cls:'sch-acc-a',dot:2.6,head:5});
  /* propagated start: reliable tiles keep the aligned latent, flagged tiles restart from LR */
  var st=thumb(g,{x:108,y:232,w:124,h:70,src:'hr',label:'Propagated start'});
  L.fade(st.g,3.85,.4);
  var cid=uid(),cdefs=el('defs',{},g),cp=el('clipPath',{id:cid},cdefs);
  bad.forEach(function(b){el('rect',{x:108+b[0]*TW,y:232+b[1]*TH,width:TW,height:TH},cp)});
  var restart=el('g',{opacity:0},g);
  image(restart,108,232,124,70,'lr',0,'url(#'+cid+')');
  bad.forEach(function(b){el('rect',{x:108+b[0]*TW+.4,y:232+b[1]*TH+.4,width:TW-.8,height:TH-.8,'class':'sch-bad-line',fill:'none'},restart)});
  L.fade(restart,4.05,.5);
  var chip=pill(g,250,250,72,20,'Scene cut','sch-cut');L.fade(chip.g,4.55,.4);
  arrow(L,[[250,260],[232,260]],4.6,.4,{dash:1,cls:'sch-cond',head:5,dot:2.2});
  var cuts=['resets the state','to the encoded LR'];
  cuts.forEach(function(s,i){var n=setText(g,280,284+i*12,s,'sch-note sch-small','middle');n.setAttribute('opacity',0);L.fade(n,4.75+i*.05)});
  arrow(L,[[170,302],[170,314],[100,314],[100,326]],5.15,.6,{cls:'sch-acc-a'});
  var rn=setText(g,178,323,'Re-noise to an','sch-note');rn.setAttribute('opacity',0);L.fade(rn,5.3);
  var rn2=setText(g,178,335,'intermediate level','sch-note');rn2.setAttribute('opacity',0);L.fade(rn2,5.35);
  var nz=thumb(g,{x:38,y:326,w:124,h:70,src:'hr',noise:.0,label:'Re-noised start'});
  L.fade(nz.g,5.6,.3);
  (function(nn){L.add(5.75,.6,function(p){nn.setAttribute('opacity',.46*p)})})(nz.noise);
  arrow(L,[[322,41],[331,41],[331,361],[300,361]],5.9,.7,{dash:1,cls:'sch-cond',r:7});
  var lrL=setText(g,328,386,'Current LR','sch-note','end');lrL.setAttribute('opacity',0);L.fade(lrL,6.1);
  arrow(L,[[162,361],[190,361]],6.25,.35,{cls:'sch-acc-a',dot:3});
  var un=pill(g,190,349,110,24,'One U-Net step','sch-acc-solid');L.fade(un.g,6.5,.4);
  arrow(L,[[245,373],[245,402]],6.95,.4,{cls:'sch-acc-a',dot:3.2});
  var outB={x:170,y:402,w:150,h:84};
  var out=thumb(g,{x:170,y:402,w:150,h:84,src:'hr',label:'Restored frame *k*',cls:'sch-out'});
  L.fade(out.g,7.25,.45);

  /* the climax: the output travels back to become the next starting point */
  ring(L,outB,7.75,.95);
  var loop=[[170,444],[16,444],[16,41],[38,41]];
  arrow(L,loop,7.9,1.9,{cls:'sch-loop',head:10,dot:.01,r:14});
  var mini=el('g',{opacity:0},g);
  var mclip=uid(),md=el('defs',{},mini),mc=el('clipPath',{id:mclip},md);
  el('rect',{x:0,y:0,width:32,height:18,rx:3},mc);
  var mg=el('g',{'clip-path':'url(#'+mclip+')'},mini);image(mg,0,0,32,18,'hr');
  el('rect',{x:.5,y:.5,width:31,height:17,rx:2.5,'class':'sch-mini'},mini);
  var at=sampler(loop);
  L.add(7.9,1.9,function(p){
    var q=at(p);mini.setAttribute('transform','translate('+(q[0]-16)+' '+(q[1]-9)+')');
    mini.setAttribute('opacity',p>0&&p<1?1:0);
  },easeIO);
  var lab=setText(g,30,434,'Start for frame *k*+1','sch-loop-t');lab.setAttribute('opacity',0);L.fade(lab,8.75,.5);
  var nx=thumb(g,{x:38,y:6,w:124,h:70,src:'hr',label:'Previous restored latent',cls:'sch-s-prev'});
  L.fade(nx.g,9.55,.35);
  ring(L,{x:38,y:6,w:124,h:70},9.55,1.1);
}

var LANES=[
  {key:'A',title:'Regenerate each frame',eg:'Example: Stream-DiffVSR',build:laneA,
   cap:'Each new frame starts from noise and takes four denoising steps, with the previous restoration used as conditioning. Detail is therefore generated again at every frame.',
   aria:'Regenerate each frame. Noise enters a chain of four denoising steps conditioned on the previous restoration and the current low-resolution frame, which produces the restored frame k.'},
  {key:'B',title:'Re-restore chunks',eg:'Examples: FlashVSR, InfVSR',build:laneB,
   cap:'The method buffers a chunk that includes future frames and restores the chunk jointly. The output for frame <i>k</i> therefore waits for frames that have not yet arrived.',
   aria:'Re-restore chunks. Frames including future frames accumulate in a buffered chunk, which is restored jointly, and frame k is then taken from the restored chunk.'},
  {key:'C',title:'ReLoopVSR',eg:'Recurrent refinement',build:laneC,ours:true,
   cap:'ReLoopVSR warps the previous restored latent to frame <i>k</i> and restarts unreliable tiles from the encoded LR. One U-Net step then refines the re-noised start, and the output becomes the starting point of the next frame.',
   aria:'ReLoopVSR. The previous restored latent is warped to frame k by optical flow between the upsampled low-resolution inputs. A reliability check selects per tile between the aligned latent and the encoded low-resolution frame, and a scene cut resets the state to the encoded low-resolution frame. The selected start is re-noised to an intermediate level and refined by one U-Net step under the current low-resolution frame. The restored frame k loops back as the starting point of frame k+1.'}
];
var MODES=[['all','All three'],['0','Regenerate'],['1','Chunks'],['2','ReLoopVSR']];

function h(n,c,t){var e=document.createElement(n);if(c)e.className=c;if(t!==undefined)e.textContent=t;return e}

/* Toolbar */
var bar=h('div','sch-bar');
var tag=h('span','sch-tag','Schematic, not data');
var ctrl=h('div','sch-ctrl');
var seg=h('div','sch-seg');seg.setAttribute('role','group');seg.setAttribute('aria-label','Choose which pipeline to show');
var buttons=MODES.map(function(m){
  var b=h('button','',m[1]);b.type='button';b.setAttribute('data-mode',m[0]);
  b.setAttribute('aria-pressed',m[0]==='all'?'true':'false');
  b.addEventListener('click',function(){setMode(m[0],true)});
  seg.appendChild(b);return b;
});
var replay=h('button','sch-replay');replay.type='button';replay.setAttribute('aria-label','Replay the animation');
replay.innerHTML='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.8 8a5.2 5.2 0 1 0 1.6-3.75"/><path d="M3.5 1.8v3.2h3.2"/></svg>Replay';
replay.addEventListener('click',function(){replayShown()});
ctrl.appendChild(seg);ctrl.appendChild(replay);bar.appendChild(tag);bar.appendChild(ctrl);

/* Lanes */
var wrap=h('div','sch-lanes');
var lanes=LANES.map(function(c,i){
  var art=h('article','sch-lane'+(c.ours?' sch-ours':''));
  var t=h('h3','sch-title');
  t.appendChild(h('span','sch-key',c.key));t.appendChild(document.createTextNode(c.title));
  t.appendChild(h('span','sch-eg',c.eg));
  var svg=el('svg',{viewBox:'0 0 '+W+' '+H,'class':'sch-svg',role:'img','aria-label':c.aria});
  var cap=h('p','sch-cap');cap.innerHTML=c.cap;
  art.appendChild(t);art.appendChild(svg);art.appendChild(cap);wrap.appendChild(art);
  var L=new Lane(i,svg);L.art=art;c.build(L);L.seek(0);art.setAttribute('data-state','idle');
  return L;
});

/* Legend */
var leg=h('div','sch-legend');
leg.appendChild(h('span','sch-legend-h','Where each starting point comes from'));
[['sch-c-noise','Noise'],['sch-c-chunk','Buffered chunk'],['sch-c-prev','Previous restoration']].forEach(function(it){
  var s=h('span','sch-legend-i'),c=h('i','sch-chip '+it[0]);
  if(it[0]==='sch-c-noise')c.style.backgroundImage='url('+NOISE+')';
  s.appendChild(c);s.appendChild(document.createTextNode(it[1]));leg.appendChild(s);
});
var note=h('figcaption','sch-note-cap','Every column shows the same REDS4 crop as an illustration of the states, so the thumbnails carry no quality comparison.');
root.appendChild(bar);root.appendChild(wrap);root.appendChild(leg);root.appendChild(note);

/* Playback */
var frame=null;
function setState(L,s){L.state=s;L.art.setAttribute('data-state',s)}
function finish(L){L.seek(Infinity);L.playing=false;L.armed=false;setState(L,'done')}
function loop(ts){
  frame=null;var any=false;
  lanes.forEach(function(L){
    if(!L.playing)return;
    if(L.t0===null)L.t0=ts;
    var t=(ts-L.t0)/1000;
    if(t>=L.end){finish(L);return}
    L.seek(t);any=true;
  });
  if(any)frame=requestAnimationFrame(loop);
}
function start(L){
  if(reduced.matches){finish(L);return}
  L.armed=false;L.playing=true;L.t0=null;setState(L,'playing');
  L.seek(0);
  if(frame===null)frame=requestAnimationFrame(loop);
}
function inView(L){
  if(L.art.hidden)return false;
  var r=L.art.getBoundingClientRect(),vh=window.innerHeight;
  return r.top<vh*.72&&r.bottom>vh*.28;
}
function check(){lanes.forEach(function(L){if(L.armed&&inView(L))start(L)})}
function reset(L){L.playing=false;L.armed=true;L.t0=null;setState(L,'idle');L.seek(0)}
function replayShown(){
  if(reduced.matches)return;
  lanes.forEach(function(L){if(!L.art.hidden)reset(L)});check();
}
function setMode(m,play){
  root.setAttribute('data-mode',m);
  buttons.forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-mode')===m?'true':'false')});
  lanes.forEach(function(L,i){
    var show=m==='all'||String(i)===m;
    L.art.hidden=!show;
    if(show&&play){if(reduced.matches)finish(L);else reset(L)}
  });
  if(play)check();
}
setMode('all',false);
if(reduced.matches){lanes.forEach(finish);replay.hidden=true}
else{
  if('IntersectionObserver'in window){
    var io=new IntersectionObserver(check,{threshold:[0,.2,.4,.6,.8,1]});
    lanes.forEach(function(L){io.observe(L.art)});
  }else{lanes.forEach(finish)}
  window.addEventListener('resize',check,{passive:true});
  window.addEventListener('scroll',check,{passive:true});
  check();
}
if(reduced.addEventListener)reduced.addEventListener('change',function(){
  if(reduced.matches){lanes.forEach(finish);replay.hidden=true}else{replay.hidden=false}
});
})();

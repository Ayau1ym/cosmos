const $=s=>document.querySelector(s);
const P=[["Mercury","#b5b5b5","Closest to the Sun"],["Venus","#e8b56b","Hottest planet"],["Earth","#4aa3ff","Our home"],["Mars","#e2563b","The Red Planet"],["Jupiter","#d9a066","Biggest planet"],["Saturn","#f0d58a","Famous for its rings"],["Uranus","#7fe3e8","Spins on its side"],["Neptune","#4f6bff","Windiest planet"]];
const GAMES={pop:{n:"Planet Pop",e:"🪐",d:"Find and pop the planet we ask for."},order:{n:"Solar Line-up",e:"☀️",d:"Which planet comes next from the Sun?"},facts:{n:"Cosmic Clues",e:"🔭",d:"Use a clue to find the right planet."}};
const D={speed:1,size:1,dwell:0.8,contrast:false,calm:false,voice:false,sound:true};
let S=Object.assign({},D,JSON.parse(localStorage.cosmoS||"{}"));
let prog=JSON.parse(localStorage.cosmoP||"{}");
const save=()=>{localStorage.cosmoS=JSON.stringify(S);localStorage.cosmoP=JSON.stringify(prog)};
const cv=$("#cv"),ctx=cv.getContext("2d");
let G=null,ptr={x:-9,y:-9},mode="mouse",raf,scan=0,stream;

// views
function show(v){document.querySelectorAll(".view").forEach(e=>e.hidden=e.id!==v);if(v!=="game")stop();if(v==="progress")renderProg()}
document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>show(b.dataset.view));
$("#cards").innerHTML=Object.entries(GAMES).map(([k,g])=>`<button class="card" data-g="${k}"><span class="e">${g.e}</span><b>${g.n}</b>${g.d}</button>`).join("");
document.querySelectorAll(".card").forEach(c=>c.onclick=()=>start(c.dataset.g));
$("#quit").onclick=()=>show("home");

// settings
function applySettings(){document.body.classList.toggle("hc",S.contrast);for(const k in D){const el=$("#"+k);if(el){el.type==="checkbox"?el.checked=S[k]:el.value=S[k]}}}
for(const k in D){const el=$("#"+k);if(!el)continue;el.oninput=()=>{S[k]=el.type==="checkbox"?el.checked:+el.value;applySettings();save()}}
applySettings();

// progress
function renderProg(){$("#rows").innerHTML=Object.entries(GAMES).map(([k,g])=>{const p=prog[k]||{plays:0,best:0,right:0,tries:0};return`<div class="row"><span>${g.e} ${g.n}</span><span>Plays: ${p.plays} · Best: ${p.best}/8 · Accuracy: ${p.tries?Math.round(100*p.right/p.tries):0}%</span></div>`}).join("")}
$("#dl").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(prog,null,2)],{type:"application/json"}));a.download="cosmotion-progress.json";a.click()};
$("#reset").onclick=()=>{if(confirm("Clear all progress on this device?")){prog={};save();renderProg()}};

// audio / voice
function beep(f,d=.15){if(!S.sound)return;try{const a=beep.a||(beep.a=new AudioContext()),o=a.createOscillator(),g=a.createGain();o.frequency.value=f;g.gain.value=.08;o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+d)}catch(e){}}
function say(t){if(S.voice&&window.speechSynthesis){speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance(t))}}

// rounds
const shuffle=a=>a.map(x=>[Math.random(),x]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
function makeRound(kind){let a,q;
  if(kind==="pop"){a=P[Math.random()*8|0];q=`Pop ${a[0]}!`}
  else if(kind==="order"){const i=Math.random()*7|0;a=P[i+1];q=`Which planet comes after ${P[i][0]}?`}
  else{a=P[Math.random()*8|0];q=`Clue: ${a[2]}`}
  const opts=shuffle([a,...shuffle(P.filter(p=>p!==a)).slice(0,3)]);
  return{q,a,opts}}
function nextRound(){G.r=makeRound(G.kind);G.wrong=0;G.dw=0;scan=0;
  const W=cv.width,H=cv.height,R=Math.min(W,H)*.11*S.size;
  G.t=G.r.opts.map((p,i)=>({p,x:W*(.15+.23*i)+R*.1,y:H*(.3+.4*((i*7)%3)/2),r:R,vx:S.calm?0:(Math.random()-.5)*.6*S.speed,vy:S.calm?0:(Math.random()-.5)*.6*S.speed,hint:0}));
  $("#prompt").textContent=G.r.q;say(G.r.q);$("#msg").textContent="";}
function start(kind){show("game");mode=document.querySelector("[name=mode]:checked").value;
  G={kind,n:0,right:0,tries:0,score:0,done:false};resize();nextRound();$("#score").textContent="0/8";
  if(mode==="cam")startCam();loop();}
function stop(){cancelAnimationFrame(raf);if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}$("#cam").style.display="none";G=null}
function resize(){cv.width=cv.clientWidth*devicePixelRatio;cv.height=cv.width*9/16}
addEventListener("resize",()=>{if(G){resize();nextRound()}});

// answers
function pick(t){if(!G||G.done)return;G.tries++;
  if(t.p===G.r.a){G.right++;G.n++;G.score=G.n;beep(660);beep(880,.2);$("#score").textContent=G.n+"/8";
    $("#msg").textContent=`Yes! ${t.p[0]}: ${t.p[2]}.`;say(`Yes! ${t.p[0]}`);
    if(G.n>=8){return finish()}setTimeout(nextRound,1400);G.pause=true;setTimeout(()=>G&&(G.pause=false),1400)}
  else{G.wrong++;beep(260,.2);$("#msg").textContent=`That one is ${t.p[0]}. Try again, no rush.`;
    if(G.wrong>=2)G.t.find(x=>x.p===G.r.a).hint=1;G.dw=0}}
function finish(){G.done=true;const p=prog[G.kind]||{plays:0,best:0,right:0,tries:0};p.plays++;p.best=Math.max(p.best,G.score);p.right+=G.right;p.tries+=G.tries;prog[G.kind]=p;save();
  $("#prompt").textContent="Mission complete! 🚀";$("#msg").textContent=`You found ${G.right} planets in ${G.tries} tries.`;say("Mission complete!")}

// input
function setPtr(e){const r=cv.getBoundingClientRect();ptr={x:(e.clientX-r.left)*cv.width/r.width,y:(e.clientY-r.top)*cv.height/r.height}}
cv.addEventListener("pointermove",e=>{if(mode==="mouse")setPtr(e)});
cv.addEventListener("pointerdown",e=>{if(mode!=="mouse"||!G)return;setPtr(e);const t=hit();if(t)pick(t)});
addEventListener("keydown",e=>{if(!G||mode!=="switch"||G.done)return;if(e.code==="Space"){e.preventDefault();scan=(scan+1)%G.t.length}if(e.code==="Enter"){e.preventDefault();pick(G.t[scan])}});
const hit=()=>G.t.find(t=>Math.hypot(t.x-ptr.x,t.y-ptr.y)<t.r);

// webcam motion tracking (frame differencing, runs fully in the browser)
const mc=document.createElement("canvas");mc.width=48;mc.height=36;const mx=mc.getContext("2d",{willReadFrequently:true});let prev=null;
async function startCam(){try{stream=await navigator.mediaDevices.getUserMedia({video:true});const v=$("#cam");v.srcObject=stream;v.style.display="block";await v.play()}catch(e){$("#msg").textContent="Camera not available. Switch to mouse or one-key mode.";mode="mouse"}}
function motion(){const v=$("#cam");if(!stream||v.readyState<2)return;mx.drawImage(v,0,0,48,36);const d=mx.getImageData(0,0,48,36).data;let sx=0,sy=0,n=0;
  if(prev){for(let i=0;i<d.length;i+=4){const g=d[i]+d[i+1]+d[i+2];if(Math.abs(g-prev[i/4])>90){const p=i/4;sx+=p%48;sy+=(p/48|0);n++}}}
  prev=Array.from({length:d.length/4},(_,i)=>d[i*4]+d[i*4+1]+d[i*4+2]);
  if(n>8){const x=(1-sx/n/48)*cv.width,y=sy/n/36*cv.height;ptr.x+=(x-ptr.x)*.35;ptr.y+=(y-ptr.y)*.35}}

// loop
let last=0;
function loop(t=0){raf=requestAnimationFrame(loop);if(!G)return;const dt=Math.min(.05,(t-last)/1000);last=t;
  if(mode==="cam")motion();
  const W=cv.width,H=cv.height;ctx.clearRect(0,0,W,H);
  if(!S.calm){ctx.fillStyle="#fff";for(let i=0;i<60;i++){ctx.globalAlpha=.3+.4*((i*37)%10)/10;ctx.fillRect((i*197)%W,(i*113)%H,2,2)}ctx.globalAlpha=1}
  if(G.done){ctx.fillStyle="#ffd166";ctx.font=`${H*.3}px serif`;ctx.textAlign="center";ctx.fillText("🚀",W/2,H*.6);return}
  const over=mode==="switch"?G.t[scan]:hit();
  G.dw=over&&!G.pause&&mode!=="switch"?G.dw+dt:0;
  if(mode!=="switch"&&over&&G.dw>=S.dwell){const o=over;G.dw=0;pick(o)}
  for(const o of G.t){o.x+=o.vx;o.y+=o.vy;if(o.x<o.r||o.x>W-o.r)o.vx*=-1;if(o.y<o.r||o.y>H-o.r)o.vy*=-1;
    ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,7);ctx.fillStyle=o.p[1];ctx.fill();
    ctx.lineWidth=o===over||o.hint?8:3;ctx.strokeStyle=o.hint?"#ffd166":"#fff";ctx.stroke();
    if(o.p[0]==="Saturn"){ctx.beginPath();ctx.ellipse(o.x,o.y,o.r*1.5,o.r*.35,-.3,0,7);ctx.lineWidth=4;ctx.stroke()}
    if(o===over&&mode!=="switch"){ctx.beginPath();ctx.arc(o.x,o.y,o.r+12,-Math.PI/2,-Math.PI/2+6.28*Math.min(1,G.dw/S.dwell));ctx.strokeStyle="#3ddbc0";ctx.lineWidth=8;ctx.stroke()}
    ctx.fillStyle="#000";ctx.font=`600 ${o.r*.38}px Fredoka,sans-serif`;ctx.textAlign="center";ctx.fillText(o.p[0],o.x,o.y+o.r*.13)}
  if(mode!=="switch"){ctx.beginPath();ctx.arc(ptr.x,ptr.y,14,0,7);ctx.fillStyle="#ff5fa2";ctx.fill()}}

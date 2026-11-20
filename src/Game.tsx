import {useEffect,useRef,useState} from 'react';
import {tracker} from './camera';
import type {Settings} from './store';
import type {Dict} from './i18n';
export type Control='hand'|'pointer'|'keys';
export const CFG={easy:{n:3,goal:8,r:46,drift:12},medium:{n:4,goal:12,r:38,drift:22},hard:{n:5,goal:16,r:30,drift:38}};
interface Props{control:Control;settings:Settings;t:Dict;avatar:string;settingsOpen:boolean;onOpenSettings:()=>void;onDone:(n:number)=>void;onExit:()=>void}
type Star={x:number;y:number;vx:number;vy:number;ph:number};
let ac:AudioContext|null=null;
function tone(vol:number,f:number,at:number){
 try{ac=ac||new AudioContext();const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+at;
 o.frequency.value=f;o.type='sine';g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.001,vol*.4),t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.3);
 o.connect(g).connect(ac.destination);o.start(t);o.stop(t+.32)}catch{}
}
export function Game(p:Props){
 const cv=useRef<HTMLCanvasElement>(null),prev=useRef<HTMLDivElement>(null);
 const sRef=useRef(p.settings);sRef.current=p.settings;
 const doneRef=useRef(p.onDone);doneRef.current=p.onDone;
 const [paused,setPaused]=useState(false);const pRef=useRef(false);pRef.current=paused||p.settingsOpen;
 const [count,setCount]=useState(0);const tgt=useRef({x:0,y:0});
 const goal=CFG[p.settings.diff].goal;
 useEffect(()=>{if(p.control==='hand')tracker.attach(prev.current)},[p.control]);
 useEffect(()=>{
  const c=cv.current!,ctx=c.getContext('2d')!;
  const rm=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W=0,H=0,raf=0,last=performance.now(),got=0,fin=false,tm=0;
  const resize=()=>{const d=devicePixelRatio||1;W=c.clientWidth;H=c.clientHeight;c.width=W*d;c.height=H*d;ctx.setTransform(d,0,0,d,0,0)};
  resize();addEventListener('resize',resize);tgt.current={x:W/2,y:H/2};
  const bg=Array.from({length:90},()=>({x:Math.random(),y:Math.random(),r:Math.random()*1.6+.4,p:Math.random()*6}));
  let stars:Star[]=[];const fx:{x:number;y:number;t:number}[]=[];let curs:P2[]=[{x:W/2,y:H/2}];
  type P2={x:number;y:number};
  const keys=new Set<string>();
  const kd=(e:KeyboardEvent)=>{if(e.key.startsWith('Arrow')){keys.add(e.key);e.preventDefault()}};
  const ku=(e:KeyboardEvent)=>keys.delete(e.key);
  if(p.control==='keys'){addEventListener('keydown',kd);addEventListener('keyup',ku)}
  const area=()=>{const s=sRef.current,mx=W*(s.seated?.15:.06);return{x0:mx,x1:W-mx,y0:H*.16,y1:H*(s.seated?.74:.9)}};
  const rad=()=>CFG[sRef.current.diff].r*sRef.current.size*(W<500?.8:1);
  const spawn=()=>{const a=area(),r=rad();let x=0,y=0;
   for(let i=0;i<12;i++){x=a.x0+Math.random()*(a.x1-a.x0);y=a.y0+Math.random()*(a.y1-a.y0);if(stars.every(s=>Math.hypot(s.x-x,s.y-y)>r*2.4))break}
   const sp=CFG[sRef.current.diff].drift,an=Math.random()*6.28;stars.push({x,y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp,ph:Math.random()*6})};
  const star=(x:number,y:number,r:number,t:number,hc:boolean)=>{
   const pu=rm?1:1+Math.sin(t*2)*.06;r*=pu;
   const g=ctx.createRadialGradient(x,y,r*.3,x,y,r*1.9);g.addColorStop(0,'rgba(255,215,106,.55)');g.addColorStop(1,'rgba(255,215,106,0)');
   ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*1.9,0,7);ctx.fill();
   ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5+(rm?0:Math.sin(t)*.1),rr=i%2?r*.45:r;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr)}
   ctx.closePath();ctx.fillStyle='#FFD76A';ctx.fill();ctx.lineWidth=hc?4:2;ctx.strokeStyle=hc?'#fff':'#fff3c4';ctx.stroke()};
  const frame=(now:number)=>{
   const dt=Math.min(.05,(now-last)/1e3);last=now;const s=sRef.current,t=now/1e3,paused=pRef.current;
   const g=ctx.createLinearGradient(0,0,0,H);
   if(s.contrast){g.addColorStop(0,'#000');g.addColorStop(1,'#050a22')}else{g.addColorStop(0,'#080D24');g.addColorStop(.6,'#101A3A');g.addColorStop(1,'#2a1a5e')}
   ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
   for(const b of bg){ctx.globalAlpha=rm?.7:.45+.45*Math.sin(t+b.p);ctx.fillStyle='#F7F8FF';ctx.beginPath();ctx.arc(b.x*W,b.y*H,b.r,0,7);ctx.fill()}
   ctx.globalAlpha=1;
   const pg=ctx.createRadialGradient(W*.85,H*.95,10,W*.85,H*.95,Math.min(W,H)*.45);pg.addColorStop(0,'#7548D8');pg.addColorStop(1,'rgba(117,72,216,0)');
   ctx.fillStyle=pg;ctx.beginPath();ctx.arc(W*.85,H*.95,Math.min(W,H)*.45,0,7);ctx.fill();
   // cursor targets
   let tg:P2[];
   if(p.control==='hand'){
    const k=s.sens*1.4,pts=tracker.points.slice(0,s.oneHand?1:2);
    tg=pts.map(q=>({x:W*Math.min(1,Math.max(0,.5+(q.x-.5)*k)),y:H*Math.min(1,Math.max(0,.5+(q.y-.5)*k*(s.seated?1.25:1)))}));
    if(!tg.length)tg=curs.slice(0,1);
   }else{
    if(p.control==='keys'&&!paused){const v=520*s.sens*dt;
     if(keys.has('ArrowLeft'))tgt.current.x-=v;if(keys.has('ArrowRight'))tgt.current.x+=v;
     if(keys.has('ArrowUp'))tgt.current.y-=v;if(keys.has('ArrowDown'))tgt.current.y+=v;
     tgt.current.x=Math.min(W,Math.max(0,tgt.current.x));tgt.current.y=Math.min(H,Math.max(0,tgt.current.y))}
    tg=[tgt.current];
   }
   while(curs.length<tg.length)curs.push({...tg[curs.length]});curs=curs.slice(0,tg.length);
   const lerp=1-Math.pow(.0005,dt);curs.forEach((c2,i)=>{c2.x+=(tg[i].x-c2.x)*lerp;c2.y+=(tg[i].y-c2.y)*lerp});
   const r=rad(),a=area();
   if(!paused&&!fin){
    const need=Math.min(CFG[s.diff].n,goal2()-got);while(stars.length<need)spawn();while(stars.length>need)stars.pop();
    for(const st of stars){st.x+=st.vx*dt;st.y+=st.vy*dt;
     if(st.x<a.x0||st.x>a.x1)st.vx*=-1;if(st.y<a.y0||st.y>a.y1)st.vy*=-1;
     st.x=Math.min(a.x1,Math.max(a.x0,st.x));st.y=Math.min(a.y1,Math.max(a.y0,st.y))}
    stars=stars.filter(st=>{
     if(!curs.some(c2=>Math.hypot(c2.x-st.x,c2.y-st.y)<r+24))return true;
     got++;setCount(got);fx.push({x:st.x,y:st.y,t:0});
     if(s.sound){tone(s.volume,660,0);tone(s.volume,990,.09)}
     if(got>=goal2()&&!fin){fin=true;tm=window.setTimeout(()=>doneRef.current(got),1000)}
     return false});
   }
   for(const st of stars)star(st.x,st.y,r,t+st.ph,s.contrast);
   for(let i=fx.length-1;i>=0;i--){const f=fx[i];f.t+=dt;if(f.t>(rm?.3:.7)){fx.splice(i,1);continue}
    const k=f.t/.7;ctx.globalAlpha=1-k;ctx.strokeStyle='#FFD76A';ctx.lineWidth=4;ctx.beginPath();ctx.arc(f.x,f.y,r*(1+k*(rm?.3:1.5)),0,7);ctx.stroke();ctx.globalAlpha=1}
   for(const c2 of curs){
    const cg=ctx.createRadialGradient(c2.x,c2.y,4,c2.x,c2.y,40);cg.addColorStop(0,'rgba(85,184,255,.6)');cg.addColorStop(1,'rgba(85,184,255,0)');
    ctx.fillStyle=cg;ctx.beginPath();ctx.arc(c2.x,c2.y,40,0,7);ctx.fill();
    ctx.lineWidth=3;ctx.strokeStyle='#55B8FF';ctx.beginPath();ctx.arc(c2.x,c2.y,26,0,7);ctx.stroke();
    ctx.font='34px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.avatar,c2.x,c2.y+2)}
   raf=requestAnimationFrame(frame)};
  const goal2=()=>CFG[sRef.current.diff].goal;
  raf=requestAnimationFrame(frame);
  return()=>{cancelAnimationFrame(raf);clearTimeout(tm);removeEventListener('resize',resize);removeEventListener('keydown',kd);removeEventListener('keyup',ku)};
 },[]);
 const mv=(e:React.PointerEvent)=>{if(p.control!=='pointer')return;const r=cv.current!.getBoundingClientRect();tgt.current={x:e.clientX-r.left,y:e.clientY-r.top}};
 return <div className="game">
  <canvas ref={cv} onPointerMove={mv} onPointerDown={mv} aria-label="ASTRA"/>
  <div className="hud">
   <div className="meter"><span>{p.t.energy}</span><div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={count}><i style={{width:Math.min(100,count/goal*100)+'%'}}/></div></div>
   <b className="cnt">★ {count}/{goal}</b>
   <div className="hbtns"><button onClick={()=>setPaused(!paused)}>{paused?p.t.resume:p.t.pause}</button><button onClick={p.onOpenSettings}>{p.t.settings}</button><button onClick={p.onExit}>{p.t.exit}</button></div>
  </div>
  {p.control==='hand'&&<div className="camprev" ref={prev}/>}
  {paused&&<div className="overlay"><h2>{p.t.paused}</h2><button className="btn" onClick={()=>setPaused(false)}>{p.t.resume}</button></div>}
 </div>;
}

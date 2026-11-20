import {FilesetResolver,HandLandmarker} from '@mediapipe/tasks-vision';
export type P={x:number;y:number};
export type Status='idle'|'loading'|'ready'|'denied'|'none'|'error';
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
class Tracker{
 video=document.createElement('video');stream:MediaStream|null=null;lm:HandLandmarker|null=null;
 raf=0;gen=0;last=-1;points:P[]=[];status:Status='idle';listeners=new Set<()=>void>();
 constructor(){this.video.muted=true;this.video.playsInline=true;this.video.setAttribute('aria-hidden','true')}
 private set(s:Status){this.status=s;this.listeners.forEach(f=>f())}
 attach(el:HTMLElement|null){if(el&&this.video.parentElement!==el)el.appendChild(this.video)}
 async start(){
  if(this.status==='loading'||this.status==='ready')return;
  const g=++this.gen;
  if(!navigator.mediaDevices?.getUserMedia){this.set('none');return}
  this.set('loading');
  try{this.stream=await navigator.mediaDevices.getUserMedia({video:{width:640,height:480,facingMode:'user'},audio:false})}
  catch(e){const n=(e as DOMException).name;this.set(n==='NotFoundError'||n==='OverconstrainedError'?'none':'denied');return}
  if(g!==this.gen){this.stream.getTracks().forEach(t=>t.stop());return}
  try{
   this.video.srcObject=this.stream;await this.video.play();
   const fs=await FilesetResolver.forVisionTasks(WASM);
   const lm=await HandLandmarker.createFromOptions(fs,{baseOptions:{modelAssetPath:MODEL,delegate:'GPU'},runningMode:'VIDEO',numHands:2});
   if(g!==this.gen){lm.close();return}
   this.lm=lm;
  }catch{if(g===this.gen){this.stop();this.set('error')}return}
  this.set('ready');this.loop(g);
 }
 private loop(g:number){
  if(g!==this.gen||!this.lm)return;
  const v=this.video;
  if(v.readyState>=2&&v.currentTime!==this.last){
   this.last=v.currentTime;
   const n=this.points.length;
   this.points=this.lm.detectForVideo(v,performance.now()).landmarks.map(l=>({x:1-l[8].x,y:l[8].y}));
   if(n!==this.points.length)this.listeners.forEach(f=>f());
  }
  this.raf=requestAnimationFrame(()=>this.loop(g));
 }
 stop(){
  this.gen++;cancelAnimationFrame(this.raf);
  this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;
  this.video.srcObject=null;this.lm?.close();this.lm=null;this.points=[];
  if(this.status!=='idle'){this.status='idle';this.listeners.forEach(f=>f())}
 }
}
export const tracker=new Tracker();

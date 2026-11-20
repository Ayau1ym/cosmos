import {useEffect,useRef,useState,type ReactNode} from 'react';
import {dict,type Dict} from './i18n';
import {AVATARS,load,save,type Lang,type State,type Settings,type Diff} from './store';
import {tracker} from './camera';
import {Game,CFG,type Control} from './Game';
type Screen='home'|'how'|'profile'|'galaxy'|'calib'|'game'|'done'|'progress';
const LANGS:[Lang,string][]=[['en','EN'],['kk','ҚАЗ'],['ru','РУС']];
function useTracker(){const [,f]=useState(0);useEffect(()=>{const fn=()=>f(n=>n+1);tracker.listeners.add(fn);return()=>{tracker.listeners.delete(fn)}},[]);return tracker}
function SettingsPanel({t,st,set,lang,setLang,close}:{t:Dict;st:Settings;set:(s:Partial<Settings>)=>void;lang:Lang;setLang:(l:Lang)=>void;close:()=>void}){
 return <div className="overlay" role="dialog" aria-modal="true" aria-label={t.settings}><div className="panel">
  <h2>{t.settings}</h2>
  <div className="langs" role="group" aria-label={t.language}>{LANGS.map(([l,n])=><button key={l} className={l===lang?'on':''} onClick={()=>setLang(l)}>{n}</button>)}</div>
  <label className="row"><input type="checkbox" checked={st.seated} onChange={e=>set({seated:e.target.checked})}/><span>{t.seated}<small>{t.seatedH}</small></span></label>
  <label className="row"><input type="checkbox" checked={st.oneHand} onChange={e=>set({oneHand:e.target.checked})}/><span>{t.oneHand}<small>{t.oneHandH}</small></span></label>
  <label className="row col"><span>{t.sens}</span><input type="range" min=".6" max="1.8" step=".1" value={st.sens} onChange={e=>set({sens:+e.target.value})}/></label>
  <label className="row col"><span>{t.size}</span><input type="range" min=".8" max="1.8" step=".1" value={st.size} onChange={e=>set({size:+e.target.value})}/></label>
  <div className="row col"><span>{t.difficulty}</span><div className="langs" role="radiogroup">{(['easy','medium','hard'] as Diff[]).map(d=><button key={d} role="radio" aria-checked={st.diff===d} className={st.diff===d?'on':''} onClick={()=>set({diff:d})}>{t[d]}</button>)}</div></div>
  <label className="row"><input type="checkbox" checked={st.contrast} onChange={e=>set({contrast:e.target.checked})}/><span>{t.contrast}</span></label>
  <label className="row"><input type="checkbox" checked={st.sound} onChange={e=>set({sound:e.target.checked})}/><span>{t.sound}</span></label>
  <label className="row col"><span>{t.volume}</span><input type="range" min="0" max="1" step=".1" value={st.volume} disabled={!st.sound} onChange={e=>set({volume:+e.target.value})}/></label>
  <button className="btn" onClick={close}>{t.close}</button></div></div>;
}
function Calib({t,control,setControl,onLaunch,onBack}:{t:Dict;control:Control;setControl:(c:Control)=>void;onLaunch:()=>void;onBack:()=>void}){
 const tr=useTracker();const box=useRef<HTMLDivElement>(null);
 useEffect(()=>{tr.attach(box.current)},[control,tr.status]);
 useEffect(()=>{if(control!=='hand')tr.stop()},[control]);
 const msg:Record<string,string>={loading:t.camLoading,denied:t.camDenied,none:t.camNone,error:t.camError};
 const bad=['denied','none','error'].includes(tr.status);
 return <section className="screen center"><h2>{t.calib}</h2>
  <div className="langs big" role="radiogroup">{([['hand',t.ctrlHand],['pointer',t.ctrlPointer],['keys',t.ctrlKeys]] as [Control,string][]).map(([c,n])=>
   <button key={c} role="radio" aria-checked={control===c} className={control===c?'on':''} onClick={()=>setControl(c)}>{n}</button>)}</div>
  {control==='hand'&&<div className="calbox">
   <p>{t.camHelp}</p>
   <div className={'vid '+(tr.status==='ready'?'':'hide')} ref={box}/>
   {tr.status==='ready'&&<p className={'status '+(tr.points.length?'ok':'')} role="status">{tr.points.length?t.handYes:t.handNo}</p>}
   {msg[tr.status]&&<p className="note" role="alert">{msg[tr.status]}</p>}
   {(tr.status==='idle'||bad)&&<button className="btn alt" onClick={()=>tr.start()}>{t.camAsk}</button>}
   {bad&&<button className="btn" onClick={()=>setControl('pointer')}>{t.useMouse}</button>}
  </div>}
  {control==='pointer'&&<p>{t.pointerHelp}</p>}{control==='keys'&&<p>{t.keysHelp}</p>}
  <div className="btns"><button className="btn ghost" onClick={onBack}>{t.back}</button>
  <button className="btn" disabled={control==='hand'&&tr.status!=='ready'} onClick={onLaunch}>{t.launch}</button></div></section>;
}
export default function App(){
 const [st,setSt]=useState<State>(load);const [screen,setScreen]=useState<Screen>('home');
 const [control,setControl]=useState<Control>('pointer');const [open,setOpen]=useState(false);
 const [res,setRes]=useState<{n:number;ach:string[]}>({n:0,ach:[]});const [gk,setGk]=useState(0);
 const t=dict[st.lang];
 useEffect(()=>save(st),[st]);
 useEffect(()=>{document.documentElement.lang=st.lang},[st.lang]);
 useEffect(()=>{if(screen!=='calib'&&screen!=='game')tracker.stop()},[screen]);
 const set=(s:Partial<Settings>)=>setSt({...st,settings:{...st.settings,...s}});
 const go=(s:Screen)=>setScreen(s);
 const launch=()=>{setSt({...st,progress:{...st.progress,sessions:st.progress.sessions+1}});setGk(k=>k+1);go('game')};
 const finish=(n:number)=>{
  const pr=st.progress,np={...pr,missions:pr.missions+1,stars:pr.stars+n,best:Math.max(pr.best,n)};
  const earned=['first','collector','explorer','brave'].filter(a=>!pr.ach.includes(a)&&(a==='first'||(a==='collector'&&np.stars>=50)||(a==='explorer'&&np.sessions>=3)||(a==='brave'&&st.settings.diff==='hard')));
  np.ach=[...pr.ach,...earned];setSt({...st,progress:np});setRes({n,ach:earned});go('done');
 };
 const exit=()=>{go('galaxy')};
 const ach=(a:string)=>(t as Record<string,string>)['a_'+a];
 let body:ReactNode;
 if(screen==='home')body=<section className="screen center hero"><div className="logo big">COSMOTION</div><p className="tag">{t.tagline}</p><p className="intro">{t.intro}</p>
  <div className="btns"><button className="btn" onClick={()=>go(st.profileDone?'galaxy':'profile')}>{t.start}</button><button className="btn ghost" onClick={()=>go('how')}>{t.how}</button></div></section>;
 else if(screen==='how')body=<section className="screen center"><h2>{t.howTitle}</h2><ol className="how"><li>{t.how1}</li><li>{t.how2}</li><li>{t.how3}</li></ol><p className="note">{t.howNote}</p><button className="btn" onClick={()=>go('home')}>{t.back}</button></section>;
 else if(screen==='profile')body=<section className="screen center"><h2>{t.profile}</h2>
  <label className="field">{t.nick}<input value={st.nick} maxLength={16} onChange={e=>setSt({...st,nick:e.target.value})}/><small>{t.nickHint}</small></label>
  <div className="field">{t.avatar}<div className="avs" role="radiogroup">{AVATARS.map((a,i)=><button key={a} role="radio" aria-checked={st.avatar===i} className={st.avatar===i?'on':''} onClick={()=>setSt({...st,avatar:i})}>{a}</button>)}</div></div>
  <div className="field">{t.language}<div className="langs">{LANGS.map(([l,n])=><button key={l} className={l===st.lang?'on':''} onClick={()=>setSt({...st,lang:l})}>{n}</button>)}</div></div>
  <button className="btn" onClick={()=>{setSt({...st,profileDone:true});go('galaxy')}}>{t.next}</button></section>;
 else if(screen==='galaxy')body=<section className="screen center"><h2>{t.galaxy}</h2><p>{t.hello}, {st.nick||AVATARS[st.avatar]}!</p>
  <div className="planets">
   <button className="planet astra" onClick={()=>go('calib')}><span className="orb"/><b>ASTRA</b><small>{t.astraD}</small><em>{t.play}</em></button>
   <button className="planet orbit" disabled><span className="orb"/><b>ORBIT</b><small>{t.orbitD}</small><em>{t.soon}</em></button>
   <button className="planet nova" disabled><span className="orb"/><b>NOVA</b><small>{t.novaD}</small><em>{t.soon}</em></button></div>
  <button className="btn ghost" onClick={()=>go('progress')}>{t.myProgress}</button></section>;
 else if(screen==='calib')body=<Calib t={t} control={control} setControl={setControl} onLaunch={launch} onBack={()=>go('galaxy')}/>;
 else if(screen==='done')body=<section className="screen center done"><div className="burst">★</div><h2>{t.done}</h2><p>{t.doneMsg}</p>
  <p className="big">★ {res.n} — {t.collected}</p>{res.ach.map(a=><p key={a} className="badge">🏅 {t.badge}: {ach(a)}</p>)}
  <div className="btns"><button className="btn" onClick={launch}>{t.again}</button><button className="btn ghost" onClick={()=>go('galaxy')}>{t.toGalaxy}</button><button className="btn ghost" onClick={()=>go('progress')}>{t.myProgress}</button></div></section>;
 else if(screen==='progress'){const p=st.progress;body=<section className="screen center"><h2>{t.progress}</h2>
  <dl className="stats"><div><dt>{t.missionsDone}</dt><dd>{p.missions}</dd></div><div><dt>{t.starsTotal}</dt><dd>★ {p.stars}</dd></div><div><dt>{t.best}</dt><dd>{p.best}</dd></div><div><dt>{t.sessions}</dt><dd>{p.sessions}</dd></div></dl>
  <h3>{t.achievements}</h3>{p.ach.length?<ul className="achs">{p.ach.map(a=><li key={a}>🏅 {ach(a)}</li>)}</ul>:<p>{t.noAch}</p>}
  <button className="btn" onClick={()=>go('galaxy')}>{t.back}</button></section>}
 else body=<Game key={gk} control={control} settings={st.settings} t={t} avatar={AVATARS[st.avatar]} settingsOpen={open} onOpenSettings={()=>setOpen(true)} onDone={finish} onExit={exit}/>;
 return <div className={'app'+(st.settings.contrast?' hc':'')}>
  {screen!=='game'&&<header className="top"><button className="logo" onClick={()=>go('home')}>COSMOTION</button>
   <div className="langs" role="group" aria-label={t.language}>{LANGS.map(([l,n])=><button key={l} className={l===st.lang?'on':''} onClick={()=>setSt({...st,lang:l})}>{n}</button>)}</div>
   <button className="ghost sm" onClick={()=>go('progress')}>★</button><button className="ghost sm" onClick={()=>setOpen(true)}>{t.settings}</button></header>}
  <main>{body}</main>
  {open&&<SettingsPanel t={t} st={st.settings} set={set} lang={st.lang} setLang={l=>setSt({...st,lang:l})} close={()=>setOpen(false)}/>}
 </div>;
}

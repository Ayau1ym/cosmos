export type Lang='en'|'kk'|'ru';
export type Diff='easy'|'medium'|'hard';
export interface Settings{seated:boolean;oneHand:boolean;sens:number;size:number;diff:Diff;contrast:boolean;sound:boolean;volume:number}
export interface Progress{missions:number;stars:number;best:number;sessions:number;ach:string[]}
export interface State{nick:string;avatar:number;lang:Lang;settings:Settings;progress:Progress;profileDone:boolean}
export const AVATARS=['🧑‍🚀','🚀','🐱','🤖','🦊','👽'];
const nl=(navigator.language||'en').slice(0,2);
const def:State={nick:'',avatar:0,lang:nl==='ru'?'ru':nl==='kk'?'kk':'en',profileDone:false,
 settings:{seated:true,oneHand:true,sens:1,size:1,diff:'easy',contrast:false,sound:true,volume:.5},
 progress:{missions:0,stars:0,best:0,sessions:0,ach:[]}};
const KEY='cosmotion.v1';
export function load():State{try{const r=localStorage.getItem(KEY);if(r){const o=JSON.parse(r);return{...def,...o,settings:{...def.settings,...o.settings},progress:{...def.progress,...o.progress}}}}catch{}return def}
export const save=(s:State)=>{try{localStorage.setItem(KEY,JSON.stringify(s))}catch{}};

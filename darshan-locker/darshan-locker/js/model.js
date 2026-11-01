// Crowd forecast model. No DOM access, so it can be unit tested in Node.
import {SLOTS,LV,BUILTIN} from './data.js';

export const pad=n=>String(n).padStart(2,'0');
export const fmt=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
export const parse=s=>{const a=s.split('-').map(Number);return new Date(a[0],a[1]-1,a[2])};

/** Small deterministic string hash (FNV-1a). Gives each temple/day/slot a stable bit of variation. */
export function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}

/** Map a crowd index to one of the four levels (Low, Moderate, Busy, Peak). */
export function level(sc){return LV.find(l=>sc<l.max)}

/**
 * @param {() => {cfg:{cap:Object,special:Array}, agg:Map}} getCtx
 *   cfg: admin overrides (locker capacity per temple, extra special days)
 *   agg: bookings keyed "templeId|YYYY-MM-DD|slotId" -> {l: lockers, dv: devotees, n: passes}
 */
export function createModel(getCtx){
  const cap=t=>{const o=getCtx().cfg.cap&&getCtx().cfg.cap[t.id];return typeof o==='number'?o:t.cap};

  /** Combined festival multiplier for a temple on a date (built-in list plus admin-added days). */
  function special(tid,d){
    let boost=1;const names=[];
    BUILTIN.concat(getCtx().cfg.special||[]).forEach(e=>{
      if(e.temple!=='all'&&e.temple!==tid)return;
      const a=e.from||e.date,b=e.to||e.date;
      if(d>=a&&d<=b){boost=Math.max(boost,e.boost);names.push(e.name)}
    });
    return {boost,names};
  }

  /**
   * Crowd index for one temple, day and slot (roughly 0-100+).
   * base (temple popularity) x day multiplier x festival boost x slot factor
   * + deterministic variation (+/-5) + booking pressure (up to +40 when lockers are full).
   */
  function score(t,d,sid){
    const dow=parse(d).getDay();const slot=SLOTS.find(x=>x.id===sid);
    let m=(dow===0||dow===6)?1.3:1;if(t.w.includes(dow))m*=1.25;
    m*=special(t.id,d).boost;
    let sc=(14+t.p*3.2)*m*slot.f+((hash(t.id+d+sid)%1000)/1000*10-5);
    const a=getCtx().agg.get(t.id+'|'+d+'|'+sid);
    if(a)sc+=Math.min(a.l/cap(t),1)*40;
    return Math.max(2,Math.round(sc));
  }

  /** Per-day summary: slot scores, average, level, quietest slot index, and booked totals. */
  function dayInfo(t,d){
    const sc=SLOTS.map(s=>score(t,d,s.id));
    const avg=Math.round(sc.reduce((a,b)=>a+b,0)/sc.length);
    let best=0;sc.forEach((v,i)=>{if(v<sc[best])best=i});
    let passes=0,dev=0,lockers=0;
    SLOTS.forEach(s=>{const a=getCtx().agg.get(t.id+'|'+d+'|'+s.id);if(a){passes+=a.n;dev+=a.dv;lockers+=a.l}});
    return {sc,avg,lv:level(avg),best,passes,dev,lockers,cap:cap(t)*SLOTS.length};
  }

  function slotLeft(t,d,sid){const a=getCtx().agg.get(t.id+'|'+d+'|'+sid);return Math.max(0,cap(t)-(a?a.l:0))}

  return {cap,special,score,dayInfo,slotLeft};
}

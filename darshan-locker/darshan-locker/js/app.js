// Darshan Locker: UI and application state. Pure crowd maths lives in model.js, persistence in storage.js.
import {TEMPLES,BYID,STATES,SLOTS,LV,SIZES,HORIZON,FIRST} from './data.js';
import {createModel,hash,level,parse,fmt} from './model.js';
import {createStorage} from './storage.js';

const storage=createStorage();
/* ---------- state ---------- */
const S={tab:'book',state:'',q:'',tid:'tirumala',date:null,slot:null,size:'S',lockers:1,guests:2,name:'',phone:'',err:'',busy:false,done:null,
  flat:[],agg:new Map(),cfg:{cap:{},special:[]},db:null,uid:null,isAdmin:false,dbOK:false,
  at:'tirumala',aday:null,codeMsg:'',aerr:''};
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ---------- dates ---------- */
const NOW=new Date();
const TODAY=fmt(NOW);
const DAYS=Array.from({length:HORIZON},(_,i)=>fmt(new Date(NOW.getFullYear(),NOW.getMonth(),NOW.getDate()+i)));
const dlong=s=>parse(s).toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'});
const dshort=s=>parse(s).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
S.aday=TODAY;S.date=SLOTS.some(s=>slotOpen(TODAY,s))?TODAY:DAYS[1];

/* ---------- crowd model ---------- */
const {cap,special,score,dayInfo,slotLeft}=createModel(()=>({cfg:S.cfg,agg:S.agg}));
function slotOpen(d,s){return d!==TODAY||s.end>NOW.getHours()}
function bestOpenSlot(t,d){
  const info=dayInfo(t,d);let b=null;
  SLOTS.forEach((s,i)=>{if(!slotOpen(d,s)||slotLeft(t,d,s.id)<1)return;if(b===null||info.sc[i]<info.sc[b])b=i});
  return b===null?null:SLOTS[b].id;
}
const chip=lv=>'<span class="chip" style="--lv:var(--'+lv.k+')"><i></i>'+lv.t+'</span>';

/* ---------- db sync ---------- */
function rebuild(){
  const flat=[],agg=new Map();
  S._docs.forEach((items,docId)=>items.forEach(it=>{
    flat.push(Object.assign({},it,{_doc:docId}));
    if(it.st!=='cancelled'){
      const k=it.t+'|'+it.d+'|'+it.s;const a=agg.get(k)||{l:0,dv:0,n:0};
      a.l+=it.l;a.dv+=it.g;a.n++;agg.set(k,a);
    }
  }));
  S.flat=flat;S.agg=agg;
  renderTemples();renderDates();renderSlots();renderPasses();
  const ae=document.activeElement;
  if(!(ae&&$('admin').contains(ae)&&/INPUT|SELECT/.test(ae.tagName)))renderAdmin();
}
S._docs=new Map();
async function connect(){
  const sess=await storage.session();
  S.uid=sess.uid;S.isAdmin=sess.isAdmin;S.db=true;S.dbOK=true;
  $('tab-admin').hidden=!S.isAdmin;
  if(storage.kind==='local'){
    $('demo-note').hidden=false;
    $('demo-admin').textContent=S.isAdmin?'Switch to visitor view':'Switch to staff view';
    $('demo-admin').addEventListener('click',()=>{storage.toggleAdminDemo();location.hash='book';location.reload()});
  }
  syncHash();banner();
  storage.watchPasses(docs=>{S._docs=docs;rebuild();renderForm()});
  storage.watchConfig(cfg=>{S.cfg=cfg;rebuild()});
}
function banner(){
  let m='';
  if(!S.dbOK)m='Live bookings are not available in this view, so crowd levels show the typical-day estimate only and passes cannot be saved.';
  else if(!S.uid)m='Sign in to book a pass. You can still check crowd levels.';
  $('banner').innerHTML=m?'<div class="banner" role="status">'+esc(m)+'</div>':'';
}

/* ---------- booking view ---------- */
function renderStates(){
  $('st-state').innerHTML='<option value="">All states and UTs ('+TEMPLES.length+' temples)</option>'+STATES.map(s=>'<option'+(S.state===s?' selected':'')+'>'+esc(s)+'</option>').join('');
}
function filtered(){
  const q=S.q.trim().toLowerCase();
  return TEMPLES.filter(t=>(!S.state||t.s===S.state)&&(!q||(t.n+' '+t.c+' '+t.s+' '+t.d).toLowerCase().includes(q)));
}
function renderTemples(){
  const list=filtered();
  $('tcount').textContent=list.length+' shown';
  $('tlist').innerHTML=list.length?list.map(t=>{
    const info=dayInfo(t,TODAY);
    return '<button type="button" class="tbtn" data-act="pick" data-id="'+t.id+'" aria-pressed="'+(t.id===S.tid)+'"><b>'+esc(t.n)+'</b><span class="sub">'+esc(t.c)+', '+esc(t.s)+'</span><span class="row"><span class="sub">'+esc(t.d)+'</span>'+chip(info.lv)+'</span></button>';
  }).join(''):'<div class="empty">No temples match. Try another state or clear the search.</div>';
}
function renderHead(){
  const t=BYID[S.tid];const sp=special(t.id,S.date);
  $('thead').innerHTML='<span class="eyebrow">Selected temple</span><h2>'+esc(t.n)+'</h2><div class="meta">'+esc(t.c)+', '+esc(t.s)+' · '+esc(t.d)+' · '+cap(t)+' lockers per slot</div>'+
    (sp.names.length?'<div><span class="tag flame">Special day: '+esc(sp.names.join(', '))+'</span></div>':'');
}
function renderLegend(){
  $('legend').innerHTML=LV.map(l=>'<span class="chip" style="--lv:var(--'+l.k+')"><i></i>'+l.t+'</span>').join('');
}
function renderDates(){
  const t=BYID[S.tid];renderHead();
  $('dates').innerHTML=DAYS.map(d=>{
    const info=dayInfo(t,d),dt=parse(d),sp=special(t.id,d),closed=d===TODAY&&!SLOTS.some(s=>slotOpen(d,s));
    return '<button type="button" class="dbtn" data-act="date" data-d="'+d+'" aria-pressed="'+(d===S.date)+'"'+(closed?' disabled':'')+' style="--lv:var(--'+info.lv.k+')" aria-label="'+esc(dlong(d)+', '+info.lv.t+' crowd')+'">'+
      '<span class="wd">'+dt.toLocaleDateString('en-IN',{weekday:'short'})+'</span><span class="dn">'+dt.getDate()+'</span><span class="mo">'+dt.toLocaleDateString('en-IN',{month:'short'})+'</span>'+
      '<span class="lvbar"></span><span class="lvt">'+(closed?'Closed':info.lv.t)+'</span>'+(sp.names.length?'<span class="fest">Festival</span>':'')+'</button>';
  }).join('');
}
function renderSlots(){
  const t=BYID[S.tid];const info=dayInfo(t,S.date);
  const bestId=bestOpenSlot(t,S.date);
  $('slotnote').textContent=dlong(S.date);
  $('slots').innerHTML=SLOTS.map((s,i)=>{
    const sc=info.sc[i],lv=level(sc),left=slotLeft(t,S.date,s.id),open=slotOpen(S.date,s),full=left<1;
    const dis=!open||full;
    return '<button type="button" class="sbtn" data-act="slot" data-id="'+s.id+'" aria-pressed="'+(S.slot===s.id)+'"'+(dis?' disabled':'')+' style="--lv:var(--'+lv.k+')">'+
      '<span><span class="t">'+s.label+'</span><br><span class="n">'+s.note+(s.id===bestId?' · <span class="best">Quietest open slot</span>':'')+'</span></span>'+
      '<span class="m"><span class="meter" aria-hidden="true"><span style="width:'+Math.min(100,sc)+'%"></span></span></span>'+
      '<span class="r">'+chip(lv)+'<span class="muted">'+(!open?'Slot has passed':full?'No lockers left':left+' lockers left')+'</span></span></button>';
  }).join('');
}
function selectTemple(id){
  S.tid=id;S.done=null;S.err='';
  S.slot=bestOpenSlot(BYID[id],S.date);
  renderTemples();renderDates();renderSlots();renderForm();
}
function selectDate(d){
  S.date=d;S.done=null;S.err='';
  const t=BYID[S.tid];
  if(!S.slot||!slotOpen(d,SLOTS.find(s=>s.id===S.slot))||slotLeft(t,d,S.slot)<1)S.slot=bestOpenSlot(t,d);
  renderDates();renderSlots();renderForm();
}
function renderForm(){
  const t=BYID[S.tid],slot=SLOTS.find(s=>s.id===S.slot);
  const el=$('formcard');
  if(S.done){
    const p=S.done,pt=BYID[p.t],ps=SLOTS.find(s=>s.id===p.s);
    el.innerHTML='<header><h2>Pass confirmed</h2></header><div class="pass"><span class="eyebrow">Pass code</span><div class="code">'+esc(p.code)+'</div>'+
      '<dl><dt>Temple</dt><dd>'+esc(pt.n)+'</dd><dt>Day</dt><dd>'+esc(dlong(p.d))+'</dd><dt>Slot</dt><dd>'+esc(ps.label)+'</dd><dt>Devotees</dt><dd>'+p.g+'</dd><dt>Lockers</dt><dd>'+p.l+' × '+SIZES[p.z].n+'</dd><dt>Pay at counter</dt><dd>₹'+(p.l*SIZES[p.z].p)+'</dd></dl></div>'+
      '<p class="hint">Show this code at the locker counter. You can find it again under My passes.</p><button type="button" class="btn sec" data-act="again">Book another pass</button>';
    return;
  }
  const total=S.lockers*SIZES[S.size].p;
  const canBook=S.dbOK&&S.uid&&slot;
  el.innerHTML='<header><h2>4. Your pass</h2><span class="muted">'+esc(t.n.split(' ').slice(0,3).join(' '))+'</span></header>'+
  '<div class="form">'+
   '<div class="field"><label for="f-name">Full name</label><input type="text" id="f-name" autocomplete="name" value="'+esc(S.name)+'" placeholder="As on your ID"></div>'+
   '<div class="field"><label for="f-phone">Mobile number</label><input type="tel" id="f-phone" inputmode="numeric" autocomplete="tel" value="'+esc(S.phone)+'" placeholder="10-digit number"><span class="hint">Used by staff to find your pass. Only the last four digits are saved.</span></div>'+
   '<div class="field"><span class="lab" id="gl">Devotees visiting</span><div class="stepper" role="group" aria-labelledby="gl"><button type="button" data-act="gstep" data-v="-1" aria-label="Fewer devotees">−</button><output>'+S.guests+'</output><button type="button" data-act="gstep" data-v="1" aria-label="More devotees">+</button></div></div>'+
   '<div class="field"><span class="lab">Locker size</span><div class="sizes">'+Object.keys(SIZES).map(k=>'<button type="button" class="size" data-act="size" data-v="'+k+'" aria-pressed="'+(S.size===k)+'"><b>'+SIZES[k].n+' · ₹'+SIZES[k].p+'</b><span>'+SIZES[k].d+'</span></button>').join('')+'</div></div>'+
   '<div class="field"><span class="lab" id="ll">Number of lockers</span><div class="stepper" role="group" aria-labelledby="ll"><button type="button" data-act="lstep" data-v="-1" aria-label="Fewer lockers">−</button><output>'+S.lockers+'</output><button type="button" data-act="lstep" data-v="1" aria-label="More lockers">+</button></div></div>'+
   '<div class="sum"><div class="line"><span class="muted">Day</span><span>'+esc(dlong(S.date))+'</span></div><div class="line"><span class="muted">Slot</span><span>'+(slot?esc(slot.label):'Choose a slot')+'</span></div>'+
   '<div class="line tot"><span>Pay at counter</span><span>₹'+total+'</span></div></div>'+
   '<div class="err" id="ferr" role="alert">'+esc(S.err)+'</div>'+
   '<button type="button" class="btn" data-act="confirm"'+(canBook&&!S.busy?'':' disabled')+'>'+(S.busy?'Booking…':'Confirm pass')+'</button>'+
   (!slot?'<span class="hint">Choose an open time slot to continue.</span>':!S.dbOK?'<span class="hint">Booking is unavailable in this view.</span>':!S.uid?'<span class="hint">Sign in to confirm a pass.</span>':'')+
  '</div>';
}
function makeCode(t,d){
  const A='23456789ABCDEFGHJKMNPQRSTUVWXYZ';let r='';
  for(let i=0;i<4;i++)r+=A[Math.floor(Math.random()*A.length)];
  return t.id.replace(/[^a-z]/g,'').slice(0,3).toUpperCase()+'-'+d.slice(8,10)+d.slice(5,7)+'-'+r;
}
async function confirmBooking(){
  const t=BYID[S.tid];S.err='';
  const name=S.name.trim().replace(/\s+/g,' ');
  const ph=S.phone.replace(/[\s+\-]/g,'').replace(/^91(?=\d{10}$)/,'');
  if(name.length<2)S.err='Enter your full name.';
  else if(!/^[6-9]\d{9}$/.test(ph))S.err='Enter a valid 10-digit mobile number.';
  else if(!S.slot)S.err='Choose a time slot.';
  else if(slotLeft(t,S.date,S.slot)<S.lockers)S.err='Only '+slotLeft(t,S.date,S.slot)+' lockers are left in this slot. Reduce the number or pick another slot.';
  if(S.err){renderForm();return}
  S.busy=true;renderForm();
  try{
    const parts=name.split(' ');
    const short=parts[0]+(parts.length>1?' '+parts[parts.length-1][0].toUpperCase()+'.':'');
    let code;do{code=makeCode(t,S.date)}while(S.flat.some(i=>i.code===code));
    const item={id:'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),code,t:t.id,d:S.date,s:S.slot,g:S.guests,z:S.size,l:S.lockers,nm:short,ph:'•••• '+ph.slice(-4),st:'booked',at:Date.now()};
    const items=(await storage.getItems(S.uid)).slice(-59);
    items.push(item);
    await storage.setItems(S.uid,items);
    S.done=item;
  }catch(e){
    S.err=(e&&e.code==='quota_exceeded')?'Booking storage is full. Please contact the temple office.':'Could not save your pass. Check your connection and try again.';
  }
  S.busy=false;renderForm();
}

/* ---------- my passes ---------- */
function statusTag(st){const m={booked:'Booked',checked_in:'Checked in',cancelled:'Cancelled'};return '<span class="chip" style="--lv:var(--'+(st==='booked'?'mod':st==='checked_in'?'low':'peak')+')"><i></i>'+(m[st]||st)+'</span>'}
function renderPasses(){
  const mine=S.flat.filter(i=>S.uid&&i._doc===S.uid).sort((a,b)=>a.d===b.d?a.s.localeCompare(b.s):a.d.localeCompare(b.d));
  const el=$('plist');
  if(!S.uid){el.innerHTML='<div class="empty">Sign in to see your passes.</div>';return}
  if(!mine.length){el.innerHTML='<div class="empty">No passes yet. Book one from the first tab and it will appear here.</div>';return}
  el.innerHTML='<div class="plist">'+mine.map(i=>{
    const t=BYID[i.t],s=SLOTS.find(x=>x.id===i.s);
    return '<div class="pcard"><div class="code">'+esc(i.code)+'</div><b>'+esc(t.n)+'</b><span class="muted">'+esc(t.c)+'</span><span>'+esc(dlong(i.d))+' · '+s.label+'</span><span>'+i.g+' devotee'+(i.g>1?'s':'')+' · '+i.l+' × '+SIZES[i.z].n+' locker'+(i.l>1?'s':'')+' · ₹'+(i.l*SIZES[i.z].p)+'</span><div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:4px">'+statusTag(i.st)+
      (i.st==='booked'&&i.d>=TODAY?'<button type="button" class="btn sm line" data-act="cancel" data-id="'+esc(i.id)+'">Cancel pass</button>':'')+'</div></div>';
  }).join('')+'</div>';
}
async function patchItem(docId,itemId,patch){
  const items=await storage.getItems(docId);
  await storage.setItems(docId,items.map(i=>i.id===itemId?Object.assign({},i,patch):i));
}

/* ---------- admin ---------- */
function weekStats(t){
  let passes=0,lockers=0;
  DAYS.slice(0,7).forEach(d=>{const i=dayInfo(t,d);passes+=i.passes;lockers+=i.lockers});
  let peak=DAYS[0],pv=-1;DAYS.forEach(d=>{const a=dayInfo(t,d).avg;if(a>pv){pv=a;peak=d}});
  return {passes,lockers,peak,pv};
}
function renderAdmin(){
  const el=$('admin');if(!S.isAdmin){el.innerHTML='';return}
  const t=BYID[S.at];
  const infos=DAYS.map(d=>dayInfo(t,d));
  const w7=infos.slice(0,7);
  const passes7=w7.reduce((a,i)=>a+i.passes,0),dev7=w7.reduce((a,i)=>a+i.dev,0);
  let bi=0;infos.forEach((x,i)=>{if(x.avg>infos[bi].avg)bi=i});
  const today=infos[0];
  const rank=TEMPLES.map(x=>({t:x,w:weekStats(x)})).sort((a,b)=>b.w.passes-a.w.passes||b.w.pv-a.w.pv).slice(0,8);
  const hasSample=S.flat.some(i=>i._doc.indexOf('demo_')===0);

  let h='';
  h+='<div class="card"><div class="admin-top"><div class="field"><label for="a-temple">Temple</label><select id="a-temple">'+TEMPLES.map(x=>'<option value="'+x.id+'"'+(x.id===S.at?' selected':'')+'>'+esc(x.n+' – '+x.c.split(',')[0]+', '+x.s)+'</option>').join('')+'</select></div>'+
    '<div class="legend">'+LV.map(l=>'<span class="chip" style="--lv:var(--'+l.k+')"><i></i>'+l.t+'</span>').join('')+'</div></div></div>';

  h+='<div class="kpis">'+
   '<div class="kpi"><span class="l">Passes, next 7 days</span><span class="v">'+passes7+'</span><span class="l">'+dev7+' devotees</span></div>'+
   '<div class="kpi"><span class="l">Lockers booked today</span><span class="v">'+today.lockers+' <span class="l">of '+today.cap+'</span></span><span class="l">'+today.passes+' passes today</span></div>'+
   '<div class="kpi"><span class="l">Busiest day ahead</span><span class="v">'+esc(dshort(DAYS[bi]))+'</span><span>'+chip(infos[bi].lv)+'</span></div>'+
   '<div class="kpi"><span class="l">Quietest slot today</span><span class="v" style="font-size:20px">'+SLOTS[today.best].label+'</span><span>'+chip(level(today.sc[today.best]))+'</span></div></div>';

  h+='<div class="card"><header><h2>Expected crowd, next '+HORIZON+' days</h2><span class="muted">Daily average across slots</span></header><div class="chartbox">'+chart(t,infos)+'</div></div>';

  h+='<div class="card"><header><h2>Day by slot</h2><span class="muted">Letter shows the level, number is the crowd index</span></header><div class="tablebox"><table class="heat"><thead><tr><th>Day</th>'+SLOTS.map(s=>'<th>'+s.label.replace(' – ','–').replace(/ ?(AM|PM)/g,'$1')+'</th>').join('')+'<th>Passes</th></tr></thead><tbody>'+
   DAYS.map((d,di)=>{const i=infos[di];const sp=special(t.id,d);
     return '<tr class="'+(d===S.aday?'sel':'')+'"><th scope="row"><button type="button" class="rowbtn" data-act="aday" data-d="'+d+'">'+esc(dlong(d))+'</button>'+(sp.names.length?' <span class="tag flame">'+esc(sp.names[0])+'</span>':'')+'</th>'+
      i.sc.map((sc,si)=>{const lv=level(sc);const a=S.agg.get(t.id+'|'+d+'|'+SLOTS[si].id);
        return '<td><div class="hc" style="--lv:var(--'+lv.k+');--mix:'+lv.mix+'%" data-tip="'+esc(SLOTS[si].label+' · '+lv.t+' ('+sc+') · '+(a?a.n+' passes, '+a.l+' lockers':'no passes yet'))+'"><b>'+lv.L+'</b><span>'+sc+'</span></div></td>'}).join('')+
      '<td>'+i.passes+'</td></tr>'}).join('')+'</tbody></table></div></div>';

  const dayItems=S.flat.filter(i=>i.t===t.id&&i.d===S.aday).sort((a,b)=>a.s.localeCompare(b.s)||a.code.localeCompare(b.code));
  const di=infos[DAYS.indexOf(S.aday)]||infos[0];
  h+='<div class="card"><header><h2>Passes on '+esc(dlong(S.aday))+'</h2><span>'+chip(di.lv)+'</span></header>'+
   '<div class="inline" style="margin-bottom:12px"><div class="field"><label for="a-code">Check in a pass by code</label><input type="text" id="a-code" placeholder="e.g. TIR-0811-K7QM" autocomplete="off" style="text-transform:uppercase"></div><button type="button" class="btn sm" data-act="codecheck" style="min-height:44px">Check in</button></div>'+
   '<div class="err" role="status" id="codemsg" style="color:var(--ink)">'+esc(S.codeMsg)+'</div>'+
   (dayItems.length?'<div class="tablebox"><table><thead><tr><th>Code</th><th>Name</th><th>Phone</th><th>Slot</th><th>Devotees</th><th>Lockers</th><th>Status</th><th></th></tr></thead><tbody>'+
    dayItems.map(i=>'<tr><td class="mono">'+esc(i.code)+(i._doc.indexOf('demo_')===0?' <span class="tag">Sample</span>':'')+'</td><td>'+esc(i.nm)+'</td><td class="mono">'+esc(i.ph)+'</td><td>'+esc(SLOTS.find(s=>s.id===i.s).label)+'</td><td>'+i.g+'</td><td>'+i.l+' × '+SIZES[i.z].n+'</td><td>'+statusTag(i.st)+'</td><td>'+
      (i.st==='booked'&&i.d===TODAY?'<button type="button" class="btn sm" data-act="checkin" data-doc="'+esc(i._doc)+'" data-id="'+esc(i.id)+'">Check in</button>':'')+'</td></tr>').join('')+'</tbody></table></div>'
   :'<div class="empty">No passes booked for this day yet. Expected crowd is '+di.lv.t.toLowerCase()+' (index '+di.avg+').</div>')+'</div>';

  h+='<div class="card"><header><h2>Temples this week</h2><span class="muted">Ranked by passes in the next 7 days</span></header><div class="tablebox"><table><thead><tr><th>Temple</th><th>State</th><th>Passes (7 days)</th><th>Lockers (7 days)</th><th>Busiest day</th></tr></thead><tbody>'+
   rank.map(r=>'<tr class="'+(r.t.id===S.at?'sel':'')+'"><th scope="row"><button type="button" class="rowbtn" data-act="atemple" data-id="'+r.t.id+'">'+esc(r.t.n)+'</button></th><td>'+esc(r.t.s)+'</td><td>'+r.w.passes+'</td><td>'+r.w.lockers+'</td><td>'+esc(dshort(r.w.peak))+' '+chip(level(r.w.pv))+'</td></tr>').join('')+'</tbody></table></div></div>';

  const mySp=(S.cfg.special||[]).map((e,i)=>({e,i})).filter(x=>x.e.temple==='all'||x.e.temple===t.id);
  h+='<div class="two"><div class="card"><header><h2>Locker capacity</h2></header><p class="muted" style="margin-top:0">Lockers available in each time slot at '+esc(t.n)+'.</p><div class="inline"><div class="field"><label for="a-cap">Lockers per slot</label><input type="number" id="a-cap" min="1" max="5000" value="'+cap(t)+'"></div><button type="button" class="btn sm" data-act="savecap" style="min-height:44px">Save</button></div><div class="err" id="aerr" role="alert">'+esc(S.aerr)+'</div></div>'+
   '<div class="card"><header><h2>Special days</h2></header><p class="muted" style="margin-top:0">Mark a festival or event so the forecast expects a larger crowd.</p>'+
   '<div class="inline"><div class="field"><label for="sp-date">Date</label><input type="date" id="sp-date" min="'+TODAY+'"></div><div class="field"><label for="sp-name">Name</label><input type="text" id="sp-name" placeholder="Brahmotsavam"></div></div>'+
   '<div class="inline" style="margin-top:8px"><div class="field"><label for="sp-boost">Expected increase</label><select id="sp-boost"><option value="1.2">Slightly busier</option><option value="1.5" selected>Much busier</option><option value="2">Extremely busy</option></select></div><div class="field"><label for="sp-scope">Applies to</label><select id="sp-scope"><option value="'+t.id+'">This temple</option><option value="all">All temples</option></select></div><button type="button" class="btn sm" data-act="addsp" style="min-height:44px">Add</button></div>'+
   (mySp.length?'<ul class="spl">'+mySp.map(x=>'<li><span>'+esc(x.e.date?dshort(x.e.date):'')+' · '+esc(x.e.name)+' <span class="muted">('+(x.e.temple==='all'?'all temples':'this temple')+')</span></span><button type="button" class="btn sm line" data-act="delsp" data-i="'+x.i+'">Remove</button></li>').join('')+'</ul>':'')+'</div></div>';

  h+='<div class="card"><header><h2>Sample passes</h2></header><p class="muted" style="margin-top:0">Fill the next two weeks with example bookings at twelve major temples to try the dashboard. Sample passes are labelled and can be removed at any time.</p><div class="inline"><button type="button" class="btn sm" data-act="loadsample">'+(hasSample?'Refresh sample passes':'Load sample passes')+'</button>'+(hasSample?'<button type="button" class="btn sm line" data-act="clearsample">Remove sample passes</button>':'')+'</div></div>';
  el.innerHTML=h;
}
function chart(t,infos){
  const W=760,H=250,L=34,R=74,Tp=12,B=44,n=infos.length;
  const ymax=Math.max(100,Math.ceil(Math.max.apply(null,infos.map(i=>i.avg))/20)*20);
  const iw=(W-L-R)/n,bw=Math.min(24,iw-6);
  const y=v=>Tp+(H-Tp-B)*(1-v/ymax);
  let s='<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Bar chart of expected crowd index for each of the next '+n+' days">';
  [0,38,58,82].forEach((v,i)=>{
    s+='<line class="'+(v===0?'grid':'thr')+'" x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'"/>';
    s+='<text x="'+(W-R+6)+'" y="'+(y(v)+4)+'">'+(v===0?'0':['','Moderate','Busy','Peak'][i]+' '+v)+'</text>';
  });
  if(ymax>82)s+='<text x="'+(L-6)+'" y="'+(y(ymax)+4)+'" text-anchor="end">'+ymax+'</text>';
  infos.forEach((inf,i)=>{
    const d=DAYS[i],x=L+i*iw+(iw-bw)/2,top=y(inf.avg),h=y(0)-top;
    const sp=special(t.id,d);
    const tip=dlong(d)+' · '+inf.lv.t+' (index '+inf.avg+') · '+inf.passes+' passes, '+inf.lockers+' lockers'+(sp.names.length?' · '+sp.names.join(', '):'');
    s+='<rect class="bar" data-act="aday" data-d="'+d+'" data-tip="'+esc(tip)+'" x="'+x+'" y="'+top+'" width="'+bw+'" height="'+h+'" rx="3" style="fill:var(--'+inf.lv.k+')"/>';
    s+='<text x="'+(x+bw/2)+'" y="'+(H-B+15)+'" text-anchor="middle">'+parse(d).getDate()+'</text>';
    s+='<text x="'+(x+bw/2)+'" y="'+(H-B+28)+'" text-anchor="middle">'+'SMTWTFS'[parse(d).getDay()]+'</text>';
    if(sp.names.length)s+='<circle cx="'+(x+bw/2)+'" cy="'+(H-B+38)+'" r="2.5" style="fill:var(--flame)"/>';
    if(d===S.aday)s+='<rect class="selbox" x="'+(x-2)+'" y="'+(top-2)+'" width="'+(bw+4)+'" height="'+(h+4)+'" rx="4"/>';
  });
  s+='</svg><div class="legend" style="margin-top:6px"><span><svg width="8" height="8" aria-hidden="true"><circle cx="4" cy="4" r="3" style="fill:var(--flame)"/></svg> Special day</span><span>Select a bar to see that day’s passes</span></div>';
  return s;
}

/* ---------- sample data ---------- */
const SAMPLE_IDS=['tirumala','kashi','shirdi','mahakal','somnath','vaishno','jagannath','meenakshi','sabarimala','siddhivinayak','ayodhya','kamakhya'];
function sampleItems(t){
  const items=[];
  for(let k=0;k<14;k++){
    const d=DAYS[k];const dow=parse(d).getDay();
    const cnt=Math.round(t.p/3)+(hash(t.id+d)%3)+((dow===0||dow===6)?2:0);
    for(let j=0;j<cnt;j++){
      const h=hash(t.id+d+j);const si=h%SLOTS.length;const s=SLOTS[si];
      if(d===TODAY&&s.end<=NOW.getHours())continue;
      const g=1+(h>>3)%5;
      items.push({id:'x'+t.id.slice(0,4)+k+'_'+j,code:makeCode(t,d),t:t.id,d,s:s.id,g,z:['S','M','L'][(h>>5)%3],l:g>3?2:1,
        nm:FIRST[(h>>7)%FIRST.length]+' '+String.fromCharCode(65+(h>>11)%26)+'.',ph:'•••• '+String(1000+(h>>9)%9000),st:'booked',at:Date.now()});
    }
  }
  return items;
}

/* ---------- events ---------- */
document.addEventListener('click',async e=>{
  const tabBtn=e.target.closest('[data-tab]');
  if(tabBtn){setTab(tabBtn.dataset.tab);return}
  const b=e.target.closest('[data-act]');if(!b)return;
  const a=b.dataset.act;
  if(a==='pick')selectTemple(b.dataset.id);
  else if(a==='date')selectDate(b.dataset.d);
  else if(a==='slot'){S.slot=b.dataset.id;S.done=null;renderSlots();renderForm()}
  else if(a==='size'){S.size=b.dataset.v;renderForm()}
  else if(a==='gstep'){S.guests=Math.min(10,Math.max(1,S.guests+Number(b.dataset.v)));renderForm()}
  else if(a==='lstep'){S.lockers=Math.min(6,Math.max(1,S.lockers+Number(b.dataset.v)));renderForm()}
  else if(a==='confirm')confirmBooking();
  else if(a==='again'){S.done=null;S.err='';renderSlots();renderDates();renderForm()}
  else if(a==='cancel'){try{await patchItem(S.uid,b.dataset.id,{st:'cancelled'})}catch(x){}}
  else if(a==='aday'){S.aday=b.dataset.d;S.codeMsg='';renderAdmin()}
  else if(a==='atemple'){S.at=b.dataset.id;S.codeMsg='';renderAdmin()}
  else if(a==='checkin'){try{await patchItem(b.dataset.doc,b.dataset.id,{st:'checked_in'})}catch(x){S.codeMsg='Could not check in. Try again.';renderAdmin()}}
  else if(a==='codecheck')codeCheck();
  else if(a==='savecap')saveCap();
  else if(a==='addsp')addSpecial();
  else if(a==='delsp')delSpecial(Number(b.dataset.i));
  else if(a==='loadsample')loadSample(b);
  else if(a==='clearsample')clearSample(b);
});
document.addEventListener('input',e=>{
  const id=e.target.id;
  if(id==='st-q'){S.q=e.target.value;renderTemples()}
  else if(id==='f-name')S.name=e.target.value;
  else if(id==='f-phone')S.phone=e.target.value;
});
document.addEventListener('change',e=>{
  const id=e.target.id;
  if(id==='st-state'){S.state=e.target.value;renderTemples()}
  else if(id==='a-temple'){S.at=e.target.value;S.codeMsg='';S.aerr='';renderAdmin()}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.id==='a-code'){e.preventDefault();codeCheck()}
});
async function codeCheck(){
  const v=($('a-code').value||'').trim().toUpperCase();
  if(!v){S.codeMsg='Enter a pass code.';renderAdmin();return}
  const it=S.flat.find(i=>i.code===v);
  if(!it)S.codeMsg='No pass found with code '+v+'.';
  else if(it.st==='cancelled')S.codeMsg='This pass was cancelled.';
  else if(it.st==='checked_in')S.codeMsg='Already checked in: '+it.nm+'.';
  else if(it.d!==TODAY)S.codeMsg='This pass is for '+dlong(it.d)+', not today.';
  else{
    try{await patchItem(it._doc,it.id,{st:'checked_in'});S.codeMsg='Checked in: '+it.nm+' · '+BYID[it.t].n+' · '+it.l+' × '+SIZES[it.z].n+' locker'+(it.l>1?'s':'')+'.'}
    catch(x){S.codeMsg='Could not check in. Try again.'}
  }
  renderAdmin();
}
async function writeCfg(next){
  await storage.setConfig({cap:next.cap||{},special:next.special||[]});
}
async function saveCap(){
  const v=Math.round(Number($('a-cap').value));
  if(!(v>=1&&v<=5000)){S.aerr='Enter a number between 1 and 5000.';renderAdmin();return}
  try{S.aerr='';await writeCfg({cap:Object.assign({},S.cfg.cap,{[S.at]:v}),special:S.cfg.special})}catch(x){S.aerr='Could not save. Try again.';renderAdmin()}
}
async function addSpecial(){
  const date=$('sp-date').value,name=$('sp-name').value.trim();
  if(!date||!name){S.aerr='Add a date and a name for the special day.';renderAdmin();return}
  try{S.aerr='';await writeCfg({cap:S.cfg.cap,special:(S.cfg.special||[]).concat([{date,name,boost:Number($('sp-boost').value),temple:$('sp-scope').value}])})}catch(x){S.aerr='Could not save. Try again.';renderAdmin()}
}
async function delSpecial(i){
  try{await writeCfg({cap:S.cfg.cap,special:(S.cfg.special||[]).filter((_,k)=>k!==i)})}catch(x){}
}
async function loadSample(b){
  b.disabled=true;b.textContent='Loading…';
  try{await Promise.all(SAMPLE_IDS.map(id=>storage.setItems('demo_'+id,sampleItems(BYID[id]))))}catch(x){S.aerr='Could not load sample passes.'}
  renderAdmin();
}
async function clearSample(b){
  b.disabled=true;
  try{await Promise.all(SAMPLE_IDS.map(id=>storage.deleteDoc('demo_'+id)))}catch(x){}
  renderAdmin();
}

/* ---------- tabs, tooltip ---------- */
function setTab(t){
  if(t==='admin'&&!S.isAdmin)t='book';
  S.tab=t;
  ['book','passes','admin'].forEach(k=>{$('v-'+k).hidden=k!==t;document.querySelector('[data-tab="'+k+'"]').setAttribute('aria-selected',String(k===t))});
  if(location.hash!=='#'+t){try{history.replaceState(null,'','#'+t)}catch(e){location.hash=t}}
  if(t==='admin')renderAdmin();
  if(t==='passes')renderPasses();
}
function syncHash(){const h=location.hash.replace('#','');setTab(['book','passes','admin'].includes(h)?h:S.tab)}
window.addEventListener('hashchange',syncHash);
const tip=$('tip');
function showTip(e){
  const el=e.target.closest&&e.target.closest('[data-tip]');
  if(!el){tip.style.display='none';return}
  tip.textContent=el.dataset.tip;tip.style.display='block';
  const w=tip.offsetWidth,x=Math.min(e.clientX+14,window.innerWidth-w-8);
  tip.style.left=Math.max(8,x)+'px';tip.style.top=(e.clientY+16)+'px';
}
document.addEventListener('mousemove',showTip);
document.addEventListener('mouseleave',()=>{tip.style.display='none'});
document.addEventListener('scroll',()=>{tip.style.display='none'},true);

/* ---------- boot ---------- */
S.slot=bestOpenSlot(BYID[S.tid],S.date);
renderStates();renderLegend();renderTemples();renderDates();renderSlots();renderForm();renderPasses();banner();
connect();

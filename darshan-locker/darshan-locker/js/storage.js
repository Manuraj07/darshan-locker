// Persistence layer. The UI only talks to this interface, so the demo adapter below
// (browser localStorage) can be swapped for Firebase, Supabase or your own API.
// See docs/backend-guide.md for the contract.
//
// Data shape
//   passes: one document per user, id = user id, value = array of pass items.
//           Items from sample data live in documents named "demo_<templeId>".
//   config: { cap: { [templeId]: lockersPerSlot }, special: [{date,name,boost,temple}] }

const KEY_PASSES='darshan:passes:v1';
const KEY_CONFIG='darshan:config:v1';
const KEY_UID='darshan:uid';
const KEY_ADMIN='darshan:admin';

const memory={};
function read(key,fallback){
  try{const v=localStorage.getItem(key);return v?JSON.parse(v):fallback}
  catch(e){return key in memory?JSON.parse(memory[key]):fallback}
}
function write(key,value){
  const raw=JSON.stringify(value);
  try{localStorage.setItem(key,raw)}
  catch(e){memory[key]=raw}
}

export function createStorage(){
  const passListeners=new Set(),configListeners=new Set();
  const docs=()=>read(KEY_PASSES,{});
  const config=()=>{const c=read(KEY_CONFIG,{});return {cap:c.cap||{},special:Array.isArray(c.special)?c.special:[]}};
  const emitPasses=()=>{const m=new Map(Object.entries(docs()));passListeners.forEach(f=>f(m))};
  const emitConfig=()=>configListeners.forEach(f=>f(config()));
  // Keep several open tabs in sync.
  window.addEventListener('storage',e=>{if(e.key===KEY_PASSES)emitPasses();if(e.key===KEY_CONFIG)emitConfig()});

  return {
    kind:'local',
    /** Who is using the app. Replace with real authentication in production. */
    async session(){
      let uid=read(KEY_UID,null);
      if(!uid){uid='u_'+Math.random().toString(36).slice(2,12);write(KEY_UID,uid)}
      return {uid,isAdmin:read(KEY_ADMIN,false)===true};
    },
    /** Demo only: lets a reviewer flip between visitor and staff views. */
    toggleAdminDemo(){write(KEY_ADMIN,!(read(KEY_ADMIN,false)===true))},
    watchPasses(cb){passListeners.add(cb);cb(new Map(Object.entries(docs())));return()=>passListeners.delete(cb)},
    watchConfig(cb){configListeners.add(cb);cb(config());return()=>configListeners.delete(cb)},
    async getItems(docId){return (docs()[docId]||[]).slice()},
    async setItems(docId,items){const d=docs();d[docId]=items;write(KEY_PASSES,d);emitPasses()},
    async deleteDoc(docId){const d=docs();delete d[docId];write(KEY_PASSES,d);emitPasses()},
    async setConfig(c){write(KEY_CONFIG,{cap:c.cap||{},special:c.special||[]});emitConfig()}
  };
}

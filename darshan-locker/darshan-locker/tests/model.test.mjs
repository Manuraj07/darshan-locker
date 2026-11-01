import test from 'node:test';
import assert from 'node:assert/strict';
import {createModel,level,hash,parse,fmt} from '../js/model.js';
import {BYID,SLOTS,TEMPLES} from '../js/data.js';

const empty=()=>({cfg:{cap:{},special:[]},agg:new Map()});
const fresh=ctx=>createModel(()=>ctx);

test('level thresholds', () => {
  assert.equal(level(10).k,'low');
  assert.equal(level(37).k,'low');
  assert.equal(level(38).k,'mod');
  assert.equal(level(58).k,'busy');
  assert.equal(level(82).k,'peak');
  assert.equal(level(400).k,'peak');
});

test('date helpers round-trip', () => {
  assert.equal(fmt(parse('2026-11-08')),'2026-11-08');
  assert.equal(parse('2026-11-08').getDay(),0); // Sunday
});

test('hash is deterministic', () => {
  assert.equal(hash('kashi2026-11-08s1'),hash('kashi2026-11-08s1'));
  assert.notEqual(hash('a'),hash('b'));
});

test('every temple has a unique id and a known state', () => {
  const ids=new Set(TEMPLES.map(t=>t.id));
  assert.equal(ids.size,TEMPLES.length);
  TEMPLES.forEach(t=>{assert.ok(t.s&&t.c&&t.n);assert.ok(t.p>=1&&t.p<=10);assert.ok(t.cap>0)});
});

test('score is stable for the same inputs', () => {
  const m=fresh(empty());
  const a=m.score(BYID.kashi,'2026-11-09','s3'),b=m.score(BYID.kashi,'2026-11-09','s3');
  assert.equal(a,b);
});

test('weekend is busier than a weekday for the same temple and slot', () => {
  const m=fresh(empty());
  // 2026-11-04 is a Wednesday, 2026-11-07 is a Saturday. Use a temple with no deity-day boost on either.
  const wk=m.score(BYID.udupi,'2026-11-04','s3'),we=m.score(BYID.udupi,'2026-11-07','s3');
  assert.ok(we>wk,`${we} should exceed ${wk}`);
});

test('a festival day raises the score', () => {
  const m=fresh(empty());
  const plain=m.score(BYID.somnath,'2026-11-10','s2'),diwali=m.score(BYID.somnath,'2026-11-08','s2');
  assert.ok(diwali>plain);
  assert.deepEqual(m.special('somnath','2026-11-08').names,['Diwali']);
});

test('temple-specific special days only affect that temple', () => {
  const m=fresh(empty());
  assert.equal(m.special('kashi','2026-11-23').boost,1.5);
  assert.equal(m.special('somnath','2026-11-23').boost,1);
});

test('admin-added special days apply', () => {
  const ctx=empty();ctx.cfg.special=[{date:'2026-11-12',name:'Local fair',boost:2,temple:'udupi'}];
  const m=fresh(ctx);
  assert.equal(m.special('udupi','2026-11-12').boost,2);
  assert.equal(m.special('kashi','2026-11-12').boost,1);
});

test('bookings add pressure and reduce lockers left', () => {
  const ctx=empty(),m=fresh(ctx),t=BYID.udupi;
  const before=m.score(t,'2026-11-05','s2');
  ctx.agg.set('udupi|2026-11-05|s2',{l:t.cap,dv:100,n:50});
  assert.ok(m.score(t,'2026-11-05','s2')>=before+39);
  assert.equal(m.slotLeft(t,'2026-11-05','s2'),0);
});

test('capacity override replaces the default', () => {
  const ctx=empty(),m=fresh(ctx),t=BYID.udupi;
  assert.equal(m.cap(t),t.cap);
  ctx.cfg.cap.udupi=10;
  assert.equal(m.cap(t),10);
  assert.equal(m.slotLeft(t,'2026-11-05','s1'),10);
});

test('dayInfo returns one score per slot and the quietest slot', () => {
  const m=fresh(empty());
  const i=m.dayInfo(BYID.tirumala,'2026-11-09');
  assert.equal(i.sc.length,SLOTS.length);
  assert.equal(i.sc[i.best],Math.min(...i.sc));
  assert.equal(i.cap,BYID.tirumala.cap*SLOTS.length);
});

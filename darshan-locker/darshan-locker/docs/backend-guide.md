# Backend guide

`js/app.js` never touches `localStorage` directly. It calls an object returned by `createStorage()` in `js/storage.js`. To move to a real backend, write another adapter with the same methods and return it from `createStorage()`.

## Interface

```js
{
  kind: 'remote',                       // 'local' shows the demo footer controls
  session()        -> Promise<{ uid: string, isAdmin: boolean }>,
  watchPasses(cb)  -> unsubscribe,      // cb(Map<docId, PassItem[]>) now and on every change
  watchConfig(cb)  -> unsubscribe,      // cb({ cap: {templeId: number}, special: Special[] })
  getItems(docId)  -> Promise<PassItem[]>,
  setItems(docId, items) -> Promise<void>,
  deleteDoc(docId) -> Promise<void>,
  setConfig(config) -> Promise<void>
}
```

`PassItem`:

```js
{ id, code, t: templeId, d: 'YYYY-MM-DD', s: slotId, g: devotees, z: 'S'|'M'|'L',
  l: lockerCount, nm: 'Anita V.', ph: '•••• 3210', st: 'booked'|'checked_in'|'cancelled', at: epochMs }
```

`Special`: `{ date, name, boost, temple: templeId | 'all' }` (a range uses `from` and `to` instead of `date`).

## Suggested production setup

1. **Auth:** phone OTP for devotees; staff accounts with an `admin` role claim. `session()` returns `isAdmin` from that claim.
2. **Tables:** `passes` (one row per pass, indexed by temple and date), `config`, `temples` (move `js/data.js` here so temples manage their own capacity).
3. **Security rules:** a devotee can create and cancel only their own passes. Only staff can read all passes, check in, and change config.
4. **Capacity:** enforce locker limits in a server function or database transaction when a pass is created. The browser check is only for fast feedback.
5. **Privacy:** keep the current approach of storing only first name plus initial and the last four phone digits. If you must store full numbers for SMS, keep them in a separate staff-only table.

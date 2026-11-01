# Crowd model

The forecast lives in `js/model.js` and has no DOM dependencies, so it is covered by unit tests (`npm test`).

## Formula

```
index = (14 + 3.2 x popularity)
        x dayMultiplier
        x festivalBoost
        x slotFactor
        + variation
        + bookingPressure
```

| Part | Value | Notes |
|---|---|---|
| popularity | 1 to 10 | Set per temple in `js/data.js` |
| dayMultiplier | 1.0 weekday, 1.3 Saturday or Sunday | Multiplied by 1.25 on a temple's special weekdays |
| festivalBoost | 1.0 and up | Largest boost that applies on that date. Built-in days are in `BUILTIN`; staff can add more |
| slotFactor | 1.0 to 1.4 | Higher for morning darshan and the evening aarti |
| variation | -5 to +5 | Deterministic per temple, day and slot, so the forecast does not flicker between reloads |
| bookingPressure | 0 to +40 | `lockersBooked / capacity x 40` for that slot |

## Levels

| Index | Level |
|---|---|
| below 38 | Low |
| 38 to 57 | Moderate |
| 58 to 81 | Busy |
| 82 and above | Peak |

A day's level is the rounded average of its six slot indexes. The quietest open slot is the lowest index among slots that have not passed and still have lockers.

## Honest caveats

- Weights are hand-picked, not fitted to data.
- Booking pressure only counts locker bookings, which are a subset of real visitors.
- Festival dates in `BUILTIN` were taken from a public festival calendar for November 2026. Verify dates before relying on them, and add more through the staff dashboard.

## Improving it

With real visitor counts per slot, replace the hand-picked weights with a model fitted to history (day of week, month, festival flags, weather) and keep `bookingPressure` as a live adjustment.

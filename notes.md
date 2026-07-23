# Notes

## Enforce booking slot granularity (follow-up)

Bookings are intended to always start/end on the facility's `slotGranularityMinutes`
boundary (e.g. only `:00`/`:30` for 30-min granularity) — no arbitrary times.

This is currently **not enforced anywhere**:

- `booking.service.ts` never references `slotGranularityMinutes`.
- The only booking-creation surfaces today are the admin forms
  (`src/app/(admin)/bookings/page.tsx`, `src/app/(admin)/recurring-bookings/page.tsx`),
  which use plain `<input type="time">` with no `step` attribute — any minute value
  is currently accepted.

To close the gap:

- Add `step={facility.slotGranularityMinutes * 60}` to the start/end time inputs in
  both admin forms.
- Add a service-layer check in `booking.service.ts` rejecting `startTime`/`endTime`
  values that aren't multiples of the facility's `slotGranularityMinutes`.

Raised while reviewing the dashboard "Today's courts" timeline, which places
bookings by slot-column span and assumes this invariant holds.

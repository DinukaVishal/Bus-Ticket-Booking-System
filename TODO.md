# Automatic Support Ticket Generation - Implementation TODO

## Completed Steps

- [x] Explore repo (support module, booking flow, payment, QR scanner, live tracking, mobile)
- [x] Approved implementation plan

## Implementation Steps

- [x] 1. Supabase migration `20260522_add_auto_support_tickets.sql`
  - [x] Add `booking_id` + `source` columns to `support_tickets` (+ indexes)
  - [x] Create `support_settings` table with `bus_delay_threshold_minutes = 30`
  - [x] Create `auto_create_support_ticket()` SECURITY DEFINER RPC (user lookup, dedup, notifications)
  - [x] RLS policies + grants for `support_settings`
- [x] 2. Update `types/support.ts` (add `booking_id`, `source`; `CreateTicketInput.bookingId`)
- [x] 3. Update `supportApi.ts` (pass `booking_id`; add `fetchBookingById`)
- [x] 4. Create `lib/support/autoTicket.ts` (typed event generators + `fetchBusDelayThreshold`)
- [x] 5. Add `useBusDelayThreshold` hook in `hooks/useSupport.ts`
- [x] 6. Update `CreateTicket.tsx` to pre-fill booking info from `?bookingId=`
- [x] 7. Add "Contact Support" link in `BookingConfirmation.tsx`
- [x] 8. Add "Get Help" link + refund auto-ticket in `MyBookings.tsx`
- [x] 9. Show related booking info in `TicketDetails.tsx`
- [x] 10. Wire payment failure auto-ticket in `usePayment.ts`
- [x] 11. Wire booking error auto-ticket in `useBookings.ts`
- [x] 12. Wire QR validation failure auto-ticket in `TicketScanner.tsx`
- [x] 13. Wire bus delay (> threshold) auto-ticket in `LiveTracking.tsx`
- [x] 14. Build / type-check web app (`npm run build` → `✓ 3546 modules transformed`, dist generated)

## Follow-up

- Run migration against Supabase (via supabase CLI or SQL editor)
- `npm run build` in `bus-ticket-booking-web`


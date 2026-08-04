import { supabase } from '@/integrations/supabase/client';
import type { TicketPriority } from '@/types/support';

/**
 * Automatic Support Ticket Generation helpers.
 *
 * All functions call the `auto_create_support_ticket` SECURITY DEFINER RPC
 * which:
 *   - bypasses the normal "user_id must equal auth.uid()" RLS policy
 *     so it can represent system events for any booking owner,
 *   - prevents duplicate open tickets for the same (user, category, booking),
 *   - creates a notification for the affected user.
 *
 * They are safe to call from the booking, payment, QR scanner and live
 * tracking flows and will no-op gracefully if anything goes wrong.
 */

export interface AutoTicketResult {
  id?: string;
  ticket_number?: string;
  created?: boolean;
  reason?: string;
  error?: string;
}

interface AutoTicketInput {
  category: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  bookingId?: string | null;
  userId?: string | null;
}

/**
 * Core function — calls the auto_create_support_ticket RPC.
 */
export async function autoCreateSupportTicket(input: AutoTicketInput): Promise<AutoTicketResult | null> {
  try {
    const { data, error } = await supabase.rpc('auto_create_support_ticket', {
      _category: input.category,
      _subject: input.subject,
      _description: input.description,
      _priority: input.priority,
      _booking_id: input.bookingId || null,
      _user_id: input.userId || null,
    });
    if (error) throw error;
    return (data ?? null) as AutoTicketResult | null;
  } catch (err) {
    // Never break the main flow because a support ticket couldn't be created.
    console.error('[autoTicket] Failed to auto-create support ticket:', err);
    return null;
  }
}

// ---------------------------------------------------------------------
// Event generators
// ---------------------------------------------------------------------

/** 1. Payment failed for a booking attempt. */
export function paymentFailureTicket(input: {
  bookingId?: string | null;
  userId?: string | null;
  routeName?: string;
  amount?: number;
}): Promise<AutoTicketResult | null> {
  const { bookingId, userId, routeName, amount } = input;
  const bookingLabel = bookingId ? ` (Booking ${bookingId})` : '';
  const routeLabel = routeName ? ` for route ${routeName}` : '';
  const amountLabel = amount != null ? ` of LKR ${amount.toLocaleString()}` : '';
  return autoCreateSupportTicket({
    category: 'Payment Problem',
    subject: `Payment failed${bookingLabel}`,
    description:
      `A payment${amountLabel}${routeLabel} could not be completed.` +
      (bookingId ? `\nRelated booking: ${bookingId}` : '') +
      `\n\nPlease review the transaction and contact the customer to arrange an alternative payment method or retry.`,
    priority: 'Critical',
    bookingId,
    userId,
  });
}

/** 2. Booking cancelled → refund request. */
export function refundRequestTicket(input: {
  bookingId?: string | null;
  userId?: string | null;
  routeName?: string;
  seatNumbers?: number[];
  amount?: number;
}): Promise<AutoTicketResult | null> {
  const { bookingId, userId, routeName, seatNumbers, amount } = input;
  const bookingLabel = bookingId ? ` (Booking ${bookingId})` : '';
  const seats = seatNumbers && seatNumbers.length ? `Seats: ${seatNumbers.join(', ')}` : '';
  const amountLabel = amount != null ? ` Amount: LKR ${amount.toLocaleString()}.` : '';
  return autoCreateSupportTicket({
    category: 'Refund Request',
    subject: `Refund required for cancelled booking${bookingLabel}`,
    description:
      `A confirmed booking${bookingLabel} was cancelled${routeName ? ` on route ${routeName}` : ''}.` +
      `${seats ? `\n${seats}.` : ''}${amountLabel}` +
      `\n\nA refund must be processed back to the customer's original payment method.`,
    priority: 'High',
    bookingId,
    userId,
  });
}

/** 3. Booking creation/confirmation error. */
export function bookingErrorTicket(input: {
  bookingId?: string | null;
  userId?: string | null;
  routeName?: string;
  message?: string;
}): Promise<AutoTicketResult | null> {
  const { bookingId, userId, routeName, message } = input;
  return autoCreateSupportTicket({
    category: 'Booking Issue',
    subject: `Booking error occurred${bookingId ? ` (${bookingId})` : ''}`,
    description:
      `An error occurred while creating or confirming a booking${routeName ? ` on route ${routeName}` : ''}.` +
      (bookingId ? `\nRelated booking: ${bookingId}` : '') +
      (message ? `\n\nSystem message: ${message}` : '') +
      `\n\nPlease investigate and help the customer complete or recover their booking.`,
    priority: 'High',
    bookingId,
    userId,
  });
}

/** 4. QR ticket validation failed. */
export function qrValidationFailureTicket(input: {
  bookingId?: string | null;
  userId?: string | null;
  routeName?: string;
  reason?: string;
}): Promise<AutoTicketResult | null> {
  const { bookingId, userId, routeName, reason } = input;
  return autoCreateSupportTicket({
    category: 'Booking Issue',
    subject: `QR ticket validation failed${bookingId ? ` (${bookingId})` : ''}`,
    description:
      `A passenger's QR ticket could not be validated${routeName ? ` for route ${routeName}` : ''}.` +
      (bookingId ? `\nRelated booking: ${bookingId}` : '') +
      (reason ? `\n\nReason: ${reason}` : '') +
      `\n\nPlease verify the booking status and assist the passenger.`,
    priority: 'Medium',
    bookingId,
    userId,
  });
}

/** 5. Bus delay exceeded the configured threshold. */
export function busDelayTicket(input: {
  bookingId?: string | null;
  userId?: string | null;
  routeName?: string;
  scheduledDeparture?: string;
  delayMinutes?: number;
}): Promise<AutoTicketResult | null> {
  const { bookingId, userId, routeName, scheduledDeparture, delayMinutes } = input;
  return autoCreateSupportTicket({
    category: 'Bus Delay',
    subject: `Bus delay reported${bookingId ? ` (${bookingId})` : ''}`,
    description:
      `The bus${routeName ? ` for route ${routeName}` : ''} is delayed.` +
      (scheduledDeparture ? `\nScheduled departure: ${scheduledDeparture}` : '') +
      (delayMinutes != null ? `\nDelay: approximately ${delayMinutes} minutes.` : '') +
      (bookingId ? `\nRelated booking: ${bookingId}` : '') +
      `\n\nPlease provide the customer with updated departure/arrival information.`,
    priority: 'Medium',
    bookingId,
    userId,
  });
}

// ---------------------------------------------------------------------
// Configurable settings
// ---------------------------------------------------------------------

/**
 * Reads the configurable bus-delay threshold (minutes) from the
 * `support_settings` table. Falls back to 30 minutes.
 */
export async function fetchBusDelayThreshold(): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('support_settings')
      .select('value')
      .eq('key', 'bus_delay_threshold_minutes')
      .maybeSingle();
    if (error) throw error;
    const raw = data?.value;
    const parsed = typeof raw === 'string' ? Number(raw) : Number(raw);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  } catch (err) {
    console.error('[autoTicket] Failed to read bus delay threshold:', err);
  }
  return 30;
}

/**
 * Convenience helper: only auto-creates a Bus Delay ticket when the
 * observed delay actually exceeds the configured threshold.
 */
export async function createBusDelayTicketIfExceeded(input: {
  bookingId?: string | null;
  userId?: string | null;
  routeName?: string;
  scheduledDeparture?: string;
  delayMinutes: number;
}): Promise<AutoTicketResult | null> {
  const threshold = await fetchBusDelayThreshold();
  if (input.delayMinutes < threshold) return null;
  return busDelayTicket({
    bookingId: input.bookingId,
    userId: input.userId,
    routeName: input.routeName,
    scheduledDeparture: input.scheduledDeparture,
    delayMinutes: input.delayMinutes,
  });
}


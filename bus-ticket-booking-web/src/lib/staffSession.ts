// =====================================================================
// Staff session helpers.
// Staff log in via a bus staff access code (stored in localStorage),
// consistent with the existing StaffLogin / StaffDashboard flow.
// =====================================================================

const STAFF_SESSION_KEY = 'bus_staff_session';

export interface StaffSession {
  busId: string;
  busNumber: string;
  busType: string;
  totalSeats: number;
  accessCode: string;
  isActive: boolean;
  loginTime: string;
}

/**
 * Returns the current staff session (if any), or null.
 */
export function getStaffSession(): StaffSession | null {
  try {
    const raw = localStorage.getItem(STAFF_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.busId) return null;
    return {
      ...parsed,
      isActive: parsed.isActive ?? true,
    } as StaffSession;
  } catch {
    return null;
  }
}

/**
 * True when a staff access-code session is active.
 */
export function isStaffLoggedIn(): boolean {
  return getStaffSession() !== null;
}

/**
 * Returns the owner_buses id bound to the current staff session.
 */
export function getStaffBusId(): string | null {
  return getStaffSession()?.busId ?? null;
}

/**
 * Returns the bus owner id for the current staff session (via their bus),
 * or null. Requires a supabase query; kept async for callers that need it.
 */
export async function getStaffOwnerId(): Promise<string | null> {
  const busId = getStaffBusId();
  if (!busId) return null;
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase
      .from('owner_buses')
      .select('bus_owner_id')
      .eq('id', busId)
      .single();
    return data?.bus_owner_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Clears the staff session (used on logout).
 */
export function clearStaffSession(): void {
  localStorage.removeItem(STAFF_SESSION_KEY);
}


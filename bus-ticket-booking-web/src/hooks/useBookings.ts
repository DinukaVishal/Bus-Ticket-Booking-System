import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
<<<<<<< HEAD:src/hooks/useBookings.ts
import { Booking, BookingStatus } from '@/types/booking';
import { useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
=======
import { Booking } from '@/types/booking';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { bookingErrorTicket } from '@/lib/support/autoTicket';
>>>>>>> origin/dev:bus-ticket-booking-web/src/hooks/useBookings.ts

export function useBookings() {
  const queryClient = useQueryClient();

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['bookings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['bookings'],
    queryFn: async (): Promise<Booking[]> => {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data.map(booking => ({
        id: booking.booking_id,
        routeId: booking.route_id,
        tripId: booking.trip_id,
        routeName: booking.route_name,
        date: booking.date,
        seatNumber: booking.seat_number,
        passengerName: booking.passenger_name,
        phoneNumber: booking.phone_number,
<<<<<<< HEAD:src/hooks/useBookings.ts
        guestEmail: booking.guest_email,
        status: booking.status as BookingStatus,
=======
        gender: booking.gender as 'male' | 'female',
        status: booking.status as 'confirmed' | 'cancelled',
>>>>>>> origin/dev:bus-ticket-booking-web/src/hooks/useBookings.ts
        createdAt: booking.created_at,
        completedAt: booking.completed_at,
      }));
    },
  });
}

export function useMyBookings() {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    const channel = supabase
      .channel('my-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['my-bookings', user?.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  const query = useQuery({
    queryKey: ['my-bookings', user?.id],
    enabled: !authLoading && !!user,
    queryFn: async (): Promise<Booking[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) {
        console.error('Error fetching bookings:', error);
        return [];
      }
      
      console.log('useMyBookings - fetched bookings:', data.length, data);
      return data.map(booking => ({
        id: booking.booking_id,
        routeId: booking.route_id,
        tripId: booking.trip_id,
        routeName: booking.route_name,
        date: booking.date,
        seatNumber: booking.seat_number,
        passengerName: booking.passenger_name,
        phoneNumber: booking.phone_number,
<<<<<<< HEAD:src/hooks/useBookings.ts
        guestEmail: booking.guest_email,
        status: booking.status as BookingStatus,
=======
        gender: booking.gender as 'male' | 'female',
        status: booking.status as 'confirmed' | 'cancelled',
>>>>>>> origin/dev:bus-ticket-booking-web/src/hooks/useBookings.ts
        createdAt: booking.created_at,
        completedAt: booking.completed_at,
      }));
    },
  });

  return {
    data: query.data || [],
    isLoading: authLoading || query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isSuccess: query.isSuccess,
    isError: query.isError,
  };
}

export function useBookedSeats(tripId: string | undefined, date: string | undefined) {
  const queryClient = useQueryClient();

  // Set up realtime subscription for this specific trip/date
  useEffect(() => {
    if (!tripId || !date) return;

    const channel = supabase
      .channel(`booked-seats-${tripId}-${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['booked-seats', tripId, date] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, date, queryClient]);

  return useQuery({
    queryKey: ['booked-seats', tripId, date],
    queryFn: async (): Promise<{seatNumber: number, gender: 'male' | 'female'}[]> => {
      if (!tripId || !date) return [];
      
      const { data, error } = await supabase
<<<<<<< HEAD:src/hooks/useBookings.ts
        .rpc('get_blocked_seats', {
          _route_id: routeId,
=======
        .rpc('get_booked_seats', {
          _trip_id: tripId,
>>>>>>> origin/dev:bus-ticket-booking-web/src/hooks/useBookings.ts
          _date: date,
        });
      
      if (error) throw error;
<<<<<<< HEAD:src/hooks/useBookings.ts

      return (data ?? [])
        .map((b: { seat_number: number | string }) => Number(b.seat_number))
        .filter((seatNumber) => Number.isInteger(seatNumber) && seatNumber > 0);
=======
      
      return (data || []).map((b: any) => ({
        seatNumber: b.seat_number,
        gender: b.gender && String(b.gender).toLowerCase() === 'female' ? 'female' : 'male',
      }));
>>>>>>> origin/dev:bus-ticket-booking-web/src/hooks/useBookings.ts
    },
    enabled: !!tripId && !!date,
  });
}

export function useSeatHolds() {
  const queryClient = useQueryClient();

  const holdSeats = useMutation({
    mutationFn: async (input: { routeId: string; date: string; seatNumbers: number[]; holdToken: string }) => {
      const { data, error } = await supabase.rpc('hold_seats', {
        _route_id: input.routeId,
        _date: input.date,
        _seat_numbers: input.seatNumbers,
        _hold_token: input.holdToken,
      });
      if (error) throw error;
      return (data ?? []).map((row: { seat_number: number | string }) => Number(row.seat_number));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booked-seats'] });
    },
  });

  const releaseHold = useMutation({
    mutationFn: async (holdToken: string) => {
      const { error } = await supabase.rpc('release_hold', {
        _hold_token: holdToken,
      });
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booked-seats'] });
    },
  });

  return { holdSeats, releaseHold };
}

async function generateBookingId(): Promise<string> {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `BK${randomNum}`;
}

interface MultipleBookingInput {
  tripId: string;
  routeId: string;
  routeName: string;
  date: string;
  seatNumbers: number[];
  passengerName: string;
  phoneNumber: string;
<<<<<<< HEAD:src/hooks/useBookings.ts
  guestEmail?: string | null;
  status: BookingStatus;
=======
  gender: 'male' | 'female';
  status: 'confirmed' | 'cancelled';
  paymentId?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
>>>>>>> origin/dev:bus-ticket-booking-web/src/hooks/useBookings.ts
}

export function useAddMultipleBookings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: MultipleBookingInput): Promise<Booking[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? null;

      const baseId = `BK${Math.floor(100000 + Math.random() * 900000)}`;
      
      const bookingsToInsert = input.seatNumbers.map((seatNumber, index) => ({
        booking_id: `${baseId}-${index + 1}`,
        route_id: input.routeId,
        trip_id: input.tripId,
        route_name: input.routeName,
        date: input.date,
        seat_number: seatNumber,
        passenger_name: input.passengerName,
        phone_number: input.phoneNumber,
<<<<<<< HEAD:src/hooks/useBookings.ts
        guest_email: input.guestEmail ?? null,
        status: input.status,
        user_id: userId,
=======
        gender: input.gender,
        status: input.status,
        user_id: user.id,
        payment_id: input.paymentId || null,
        payment_status: input.paymentStatus || 'pending',
>>>>>>> origin/dev:bus-ticket-booking-web/src/hooks/useBookings.ts
      }));

      const { data, error } = await supabase
        .from('bookings')
        .insert(bookingsToInsert)
        .select();
      
      if (error) {
        // Check for unique constraint violation (double booking)
        if (error.code === '23505') {
          throw new Error('Some seats have already been booked. Please select different seats.');
        }
        throw error;
      }
      
      return data.map(booking => ({
        id: booking.booking_id,
        routeId: booking.route_id,
        tripId: booking.trip_id,
        routeName: booking.route_name,
        date: booking.date,
        seatNumber: booking.seat_number,
        passengerName: booking.passenger_name,
        phoneNumber: booking.phone_number,
<<<<<<< HEAD:src/hooks/useBookings.ts
        guestEmail: booking.guest_email,
        status: booking.status as BookingStatus,
=======
        gender: booking.gender as 'male' | 'female',
        status: booking.status as 'confirmed' | 'cancelled',
        payment_status: booking.payment_status as 'pending' | 'paid' | 'failed' | 'refunded',
        payment_id: booking.payment_id,
>>>>>>> origin/dev:bus-ticket-booking-web/src/hooks/useBookings.ts
        createdAt: booking.created_at,
        completedAt: booking.completed_at,
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booked-seats'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (error, input) => {
      // Auto-generate a support ticket when a booking cannot be created
      bookingErrorTicket({
        routeName: input.routeName,
        message: error?.message || 'Booking creation failed.',
      });
    },
  });
}

export function useAddBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (booking: Omit<Booking, 'id' | 'createdAt'> & { guestEmail?: string | null }): Promise<Booking> => {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? null;
      
      const bookingId = await generateBookingId();
      
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          booking_id: bookingId,
          route_id: booking.routeId,
          route_name: booking.routeName,
          date: booking.date,
          seat_number: booking.seatNumber,
          passenger_name: booking.passengerName,
          phone_number: booking.phoneNumber,
          guest_email: booking.guestEmail ?? null,
          status: booking.status,
          user_id: userId,
        })
        .select()
        .single();
      
      if (error) {
        // Check for unique constraint violation (double booking)
        if (error.code === '23505') {
          throw new Error('This seat has already been booked. Please select another seat.');
        }
        throw error;
      }
      
      return {
        id: data.booking_id,
        routeId: data.route_id,
        tripId: data.trip_id,
        routeName: data.route_name,
        date: data.date,
        seatNumber: data.seat_number,
        passengerName: data.passenger_name,
        phoneNumber: data.phone_number,
<<<<<<< HEAD:src/hooks/useBookings.ts
        guestEmail: data.guest_email,
        status: data.status as BookingStatus,
=======
        gender: data.gender || 'male',
        status: data.status as 'confirmed' | 'cancelled',
>>>>>>> origin/dev:bus-ticket-booking-web/src/hooks/useBookings.ts
        createdAt: data.created_at,
        completedAt: data.completed_at,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booked-seats'] });
    },
    onError: (error, booking) => {
      // Auto-generate a support ticket when a booking cannot be created
      bookingErrorTicket({
        routeName: booking.routeName,
        message: error?.message || 'Booking creation failed.',
      });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: BookingStatus }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('booking_id', bookingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booked-seats'] });
    },
  });
}

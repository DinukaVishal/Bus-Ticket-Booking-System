import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Booking } from '@/types/booking';
import { useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';

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
        routeName: booking.route_name,
        date: booking.date,
        seatNumber: booking.seat_number,
        passengerName: booking.passenger_name,
        phoneNumber: booking.phone_number,
        status: booking.status as 'confirmed' | 'cancelled',
        createdAt: booking.created_at,
      }));
    },
  });
}

export function useMyBookings() {
  const { user } = useAuthContext();
  const queryClient = useQueryClient();

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

  return useQuery({
    queryKey: ['my-bookings', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Booking[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      
      return data.map(booking => ({
        id: booking.booking_id,
        routeId: booking.route_id,
        routeName: booking.route_name,
        date: booking.date,
        seatNumber: booking.seat_number,
        passengerName: booking.passenger_name,
        phoneNumber: booking.phone_number,
        status: booking.status as 'confirmed' | 'cancelled',
        createdAt: booking.created_at,
      }));
    },
  });
}

export function useBookedSeats(routeId: string | undefined, date: string | undefined) {
  const queryClient = useQueryClient();

  // Set up realtime subscription for this specific route/date
  useEffect(() => {
    if (!routeId || !date) return;

    const channel = supabase
      .channel(`booked-seats-${routeId}-${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['booked-seats', routeId, date] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [routeId, date, queryClient]);

  return useQuery({
    queryKey: ['booked-seats', routeId, date],
    queryFn: async (): Promise<number[]> => {
      if (!routeId || !date) return [];
      
      // Use the secure RPC function that only returns seat numbers (no personal data)
      const { data, error } = await supabase
        .rpc('get_booked_seats', {
          _route_id: routeId,
          _date: date,
        });
      
      if (error) throw error;
      
      return data.map((b: { seat_number: number }) => b.seat_number);
    },
    enabled: !!routeId && !!date,
  });
}

async function generateBookingId(): Promise<string> {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `BK${randomNum}`;
}

interface MultipleBookingInput {
  routeId: string;
  routeName: string;
  date: string;
  seatNumbers: number[];
  passengerName: string;
  phoneNumber: string;
  status: 'confirmed' | 'cancelled';
}

export function useAddMultipleBookings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: MultipleBookingInput): Promise<Booking[]> => {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to make a booking.');
      }

      // Generate a unique base booking ID
      const baseId = `BK${Math.floor(100000 + Math.random() * 900000)}`;
      
      // Prepare all bookings
      const bookingsToInsert = input.seatNumbers.map((seatNumber, index) => ({
        booking_id: `${baseId}-${index + 1}`,
        route_id: input.routeId,
        route_name: input.routeName,
        date: input.date,
        seat_number: seatNumber,
        passenger_name: input.passengerName,
        phone_number: input.phoneNumber,
        status: input.status,
        user_id: user.id,
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
        routeName: booking.route_name,
        date: booking.date,
        seatNumber: booking.seat_number,
        passengerName: booking.passenger_name,
        phoneNumber: booking.phone_number,
        status: booking.status as 'confirmed' | 'cancelled',
        createdAt: booking.created_at,
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booked-seats'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });
}

export function useAddBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (booking: Omit<Booking, 'id' | 'createdAt'>): Promise<Booking> => {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to make a booking.');
      }
      
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
          status: booking.status,
          user_id: user.id,
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
        routeName: data.route_name,
        date: data.date,
        seatNumber: data.seat_number,
        passengerName: data.passenger_name,
        phoneNumber: data.phone_number,
        status: data.status as 'confirmed' | 'cancelled',
        createdAt: data.created_at,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booked-seats'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: 'confirmed' | 'cancelled' }) => {
      const { error } = await supabase
        .from('bookings')
        .update({ status })
        .eq('booking_id', bookingId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booked-seats'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
  });
}

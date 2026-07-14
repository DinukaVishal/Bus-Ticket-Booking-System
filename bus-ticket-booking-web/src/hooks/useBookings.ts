import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Booking, CancelRequest } from '@/types/booking';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

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
        payment_method: booking.payment_method,
        gender: booking.gender as 'male' | 'female',
        status: booking.status as 'confirmed' | 'cancelled',
        createdAt: booking.created_at,
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
        payment_method: booking.payment_method,
        gender: booking.gender as 'male' | 'female',
        status: booking.status as 'confirmed' | 'cancelled',
        createdAt: booking.created_at,
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

export function useMyCancelRequests() {
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ['my-cancel-requests', user?.id],
    enabled: !authLoading && !!user,
    queryFn: async (): Promise<CancelRequest[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('cancel_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((request: any) => ({
        cancel_request_id: request.id,
        bookingId: request.booking_id,
        bookingIds: request.booking_ids || [request.booking_id],
        seatNumbers: request.seat_numbers || (request.seat_number ? [request.seat_number] : []),
        userId: request.user_id,
        routeId: request.route_id,
        tripId: request.trip_id,
        travelDate: request.travel_date,
        requestedAt: request.requested_at,
        status: request.status as 'pending' | 'approved' | 'rejected',
        refundAmount: Number(request.refund_amount ?? 0),
        processedAt: request.processed_at,
        note: request.note,
      }));
    },
  });

  return {
    data: query.data || [],
    isLoading: authLoading || query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useOwnerCancelRequests() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['owner-cancel-requests'],
    queryFn: async (): Promise<CancelRequest[]> => {
      const { data, error } = await supabase
        .from('owner_cancel_requests')
        .select('*')
        .order('requested_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((request: any) => ({
        cancel_request_id: request.cancel_request_id,
        bookingId: request.booking_id,
        bookingIds: request.booking_ids || [request.booking_id],
        seatNumbers: request.seat_numbers || (request.seat_number ? [request.seat_number] : []),
        userId: request.user_id,
        routeId: request.route_id,
        tripId: request.trip_id,
        travelDate: request.travel_date,
        requestedAt: request.requested_at,
        status: request.status as 'pending' | 'approved' | 'rejected',
        refundAmount: Number(request.refund_amount ?? 0),
        processedAt: request.processed_at,
        note: request.note,
        passengerName: request.passenger_name,
      }));
    },
  });

  return {
    data: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
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
        .rpc('get_booked_seats', {
          _trip_id: tripId,
          _date: date,
        });
      
      if (error) throw error;
      
      return (data || []).map((b: any) => ({
        seatNumber: b.seat_number,
        gender: b.gender && String(b.gender).toLowerCase() === 'female' ? 'female' : 'male',
      }));
    },
    enabled: !!tripId && !!date,
  });
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
  gender: 'male' | 'female';
  status: 'confirmed' | 'cancelled';
  paymentId?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
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
        trip_id: input.tripId,
        route_name: input.routeName,
        date: input.date,
        seat_number: seatNumber,
        passenger_name: input.passengerName,
        phone_number: input.phoneNumber,
        payment_method: 'Card',
        gender: input.gender,
        status: input.status,
        user_id: user.id,
        payment_id: input.paymentId || null,
        payment_status: input.paymentStatus || 'pending',
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
        payment_method: booking.payment_method,
        gender: booking.gender as 'male' | 'female',
        status: booking.status as 'confirmed' | 'cancelled',
        payment_status: booking.payment_status as 'pending' | 'paid' | 'failed' | 'refunded',
        payment_id: booking.payment_id,
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
          payment_method: 'Card',
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
        tripId: data.trip_id,
        routeName: data.route_name,
        date: data.date,
        seatNumber: data.seat_number,
        passengerName: data.passenger_name,
        phoneNumber: data.phone_number,
        payment_method: data.payment_method,
        gender: data.gender || 'male',
        status: data.status as 'confirmed' | 'cancelled',
        createdAt: data.created_at,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booked-seats'] });
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
    },
  });
}

export function useRequestCancel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingIds, seatNumbers, routeId, tripId, travelDate, refundAmount, note }: { bookingIds: string[]; seatNumbers: number[]; routeId?: string; tripId?: string; travelDate?: string; refundAmount: number; note?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('You must be logged in to request a refund.');
      }

      const representativeBookingId = bookingIds[0];
      const { data, error } = await supabase
        .from('cancel_requests')
        .insert({
          booking_id: representativeBookingId,
          booking_ids: bookingIds,
          seat_numbers: seatNumbers,
          user_id: user.id,
          route_id: routeId || null,
          trip_id: tripId || null,
          travel_date: travelDate || null,
          refund_amount: refundAmount,
          note: note || null,
        })
        .select();

      if (error) throw error;

      return data as CancelRequest[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['my-cancel-requests'] });
      queryClient.invalidateQueries({ queryKey: ['owner-cancel-requests'] });
    },
  });
}

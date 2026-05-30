import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/booking_models.dart';

class SupabaseService {
  static const _supabaseUrl = 'https://qiuuchynzecmblfgzdvo.supabase.co';
  static const _supabaseAnonKey = 'sb_publishable_H98wtolKPiZHMhTgURMmBQ_q-hPL23I';

  static Future<void> initialize() async {
    await Supabase.initialize(
      url: _supabaseUrl,
      anonKey: _supabaseAnonKey,
      authOptions: FlutterAuthClientOptions(
        authFlowType: AuthFlowType.pkce,
      ),
    );
  }

  static Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    return await Supabase.instance.client.auth.signInWithPassword(
      email: email,
      password: password,
    );
  }

  static Future<AuthResponse> signUp({
    required String email,
    required String password,
  }) async {
    return await Supabase.instance.client.auth.signUp(
      email: email,
      password: password,
    );
  }

  static Future<void> signOut() async {
    await Supabase.instance.client.auth.signOut();
  }

  static User? get currentUser => Supabase.instance.client.auth.currentUser;

  static Future<List<RouteOption>> fetchRoutes() async {
    final client = Supabase.instance.client;

    final routesResponse = await client
        .from('routes')
        .select('id, name, from_city, to_city, departure_time, bus_type, total_seats')
        .order('name');
    final routesData = routesResponse as List<dynamic>?;

    final tripsResponse = await client
        .from('trips')
        .select('id, route_id, departure_time, arrival_time, price, bus_number, driver_name, driver_phone, conductor_name, conductor_phone, is_active')
        .eq('is_active', true)
        .order('departure_time');
    final tripsData = tripsResponse as List<dynamic>?;

    if (routesData == null || tripsData == null) {
      return [];
    }

    final routes = <RouteOption>[];
    final trips = tripsData.map((item) => Map<String, dynamic>.from(item as Map)).toList();

    for (final routeItem in routesData.map((item) => Map<String, dynamic>.from(item as Map))) {
      final routeId = routeItem['id'] as String? ?? '';
      final routeTrips = trips
          .where((trip) => trip['route_id'] == routeId)
          .map((trip) {
        return TripOption(
          id: trip['id'] as String? ?? '',
          departureTime: trip['departure_time'] as String? ?? '',
          arrivalTime: trip['arrival_time'] as String? ?? '',
          price: (trip['price'] as num?)?.toDouble() ?? 0,
          busNumber: trip['bus_number'] as String? ?? '',
          driverName: trip['driver_name'] as String? ?? '',
          driverPhone: trip['driver_phone'] as String? ?? '',
          conductorName: trip['conductor_name'] as String? ?? '',
          conductorPhone: trip['conductor_phone'] as String? ?? '',
        );
      }).toList();

      if (routeTrips.isEmpty) {
        continue;
      }

      final busType = busTypeFromString(routeItem['bus_type'] as String?);
      final totalSeats = ((routeItem['total_seats'] as num?)?.toInt()) ?? busTypeConfigs[busType]!.defaultSeats;

      routes.add(RouteOption(
        id: routeId,
        name: routeItem['name'] as String? ?? '',
        from: routeItem['from_city'] as String? ?? '',
        to: routeItem['to_city'] as String? ?? '',
        duration: routeItem['duration'] as String? ?? routeItem['departure_time'] as String? ?? '',
        busType: busType,
        totalSeats: totalSeats,
        serviceType: busTypeConfigs[busType]!.name,
        trips: routeTrips,
      ));
    }

    return routes;
  }

  static Future<List<int>> fetchBookedSeats({
    required String tripId,
    required DateTime travelDate,
  }) async {
    final client = Supabase.instance.client;
    final dateString = travelDate.toIso8601String().split('T').first;

    final response = await client.rpc('get_booked_seats', params: {
      '_trip_id': tripId,
      '_date': dateString,
    });
    final records = response as List<dynamic>?;
    if (records == null) return [];

    return records
        .map((child) {
          if (child is Map<String, dynamic>) {
            return child['seat_number'] as int? ?? 0;
          }
          return 0;
        })
        .where((seatNumber) => seatNumber > 0)
        .toList();
  }

  static Future<void> createBooking({
    required RouteOption route,
    required TripOption trip,
    required DateTime travelDate,
    required int seatNumber,
    required String passengerName,
    required String passengerPhone,
  }) async {
    final client = Supabase.instance.client;
    final bookingId = 'BKG-${DateTime.now().millisecondsSinceEpoch}';
    final userId = currentUser?.id;

    await client.from('bookings').insert({
      'booking_id': bookingId,
      'user_id': userId,
      'route_id': route.id,
      'route_name': route.name,
      'trip_id': trip.id,
      'date': travelDate.toIso8601String().split('T').first,
      'seat_number': seatNumber,
      'passenger_name': passengerName,
      'passenger_phone': passengerPhone,
      'status': 'confirmed',
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  static Future<List<BookingRecord>> fetchMyBookings() async {
    final userId = currentUser?.id;
    if (userId == null) return [];
    final client = Supabase.instance.client;

    final response = await client
        .from('bookings')
        .select('booking_id, route_name, trip_id, date, seat_number, passenger_name, status, created_at')
        .eq('user_id', userId)
        .order('date', ascending: false);
    final bookingsData = response as List<dynamic>?;

    return bookingsData
            ?.map((item) {
              final record = Map<String, dynamic>.from(item as Map);
              return BookingRecord(
                bookingId: record['booking_id'] as String? ?? '',
                routeName: record['route_name'] as String? ?? '',
                tripId: record['trip_id'] as String? ?? '',
                travelDate: DateTime.tryParse(record['date'] as String? ?? '') ?? DateTime.now(),
                seatNumber: record['seat_number'] as int? ?? 0,
                passengerName: record['passenger_name'] as String? ?? '',
                status: record['status'] as String? ?? 'unknown',
                createdAt: DateTime.tryParse(record['created_at'] as String? ?? '') ?? DateTime.now(),
              );
            })
            .toList() ??
        [];
  }
}

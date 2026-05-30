enum BusType { rosa, luxuryAc, superLong, normal }

class BusTypeConfig {
  final BusType type;
  final String name;
  final String sinhalaName;
  final int defaultSeats;
  final int jumpSeats;
  final bool isAC;

  const BusTypeConfig({
    required this.type,
    required this.name,
    required this.sinhalaName,
    required this.defaultSeats,
    required this.jumpSeats,
    required this.isAC,
  });
}

const busTypeConfigs = {
  BusType.rosa: BusTypeConfig(
    type: BusType.rosa,
    name: 'Rosa / Coaster',
    sinhalaName: 'රෝසා / කෝස්ටර්',
    defaultSeats: 26,
    jumpSeats: 6,
    isAC: false,
  ),
  BusType.luxuryAc: BusTypeConfig(
    type: BusType.luxuryAc,
    name: 'Luxury A/C',
    sinhalaName: 'ලක්ශරි A/C',
    defaultSeats: 45,
    jumpSeats: 0,
    isAC: true,
  ),
  BusType.superLong: BusTypeConfig(
    type: BusType.superLong,
    name: 'Super Long',
    sinhalaName: 'සුපර් ලොන්ග්',
    defaultSeats: 54,
    jumpSeats: 0,
    isAC: true,
  ),
  BusType.normal: BusTypeConfig(
    type: BusType.normal,
    name: 'Normal',
    sinhalaName: 'සාමාන්‍ය',
    defaultSeats: 54,
    jumpSeats: 0,
    isAC: false,
  ),
};

BusType busTypeFromString(String? value) {
  switch (value) {
    case 'rosa':
      return BusType.rosa;
    case 'luxury_ac':
    case 'ac':
      return BusType.luxuryAc;
    case 'super_long':
      return BusType.superLong;
    case 'normal':
      return BusType.normal;
  }

  return BusType.normal;
}

String busTypeToString(BusType type) {
  switch (type) {
    case BusType.rosa:
      return 'rosa';
    case BusType.luxuryAc:
      return 'luxury_ac';
    case BusType.superLong:
      return 'super_long';
    case BusType.normal:
      return 'normal';
  }
}

class TripOption {
  final String id;
  final String departureTime;
  final String arrivalTime;
  final double price;
  final String busNumber;
  final String driverName;
  final String driverPhone;
  final String conductorName;
  final String conductorPhone;

  const TripOption({
    required this.id,
    required this.departureTime,
    required this.arrivalTime,
    required this.price,
    required this.busNumber,
    required this.driverName,
    required this.driverPhone,
    required this.conductorName,
    required this.conductorPhone,
  });
}

class RouteOption {
  final String id;
  final String name;
  final String from;
  final String to;
  final String duration;
  final BusType busType;
  final int totalSeats;
  final String serviceType;
  final List<TripOption> trips;

  const RouteOption({
    required this.id,
    required this.name,
    required this.from,
    required this.to,
    required this.duration,
    required this.busType,
    required this.totalSeats,
    required this.serviceType,
    required this.trips,
  });
}

class BookingSelection {
  final RouteOption route;
  final TripOption trip;
  final DateTime travelDate;
  final int seatNumber;
  final String passengerName;
  final String passengerPhone;

  const BookingSelection({
    required this.route,
    required this.trip,
    required this.travelDate,
    required this.seatNumber,
    required this.passengerName,
    required this.passengerPhone,
  });
}

class BookingRecord {
  final String bookingId;
  final String routeName;
  final String tripId;
  final DateTime travelDate;
  final int seatNumber;
  final String passengerName;
  final String status;
  final DateTime createdAt;

  const BookingRecord({
    required this.bookingId,
    required this.routeName,
    required this.tripId,
    required this.travelDate,
    required this.seatNumber,
    required this.passengerName,
    required this.status,
    required this.createdAt,
  });
}

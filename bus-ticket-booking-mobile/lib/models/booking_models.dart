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
  final String gender;
  final String paymentMethod;
  final String status;
  final DateTime createdAt;

  const BookingRecord({
    required this.bookingId,
    required this.routeName,
    required this.tripId,
    required this.travelDate,
    required this.seatNumber,
    required this.passengerName,
    required this.gender,
    required this.paymentMethod,
    required this.status,
    required this.createdAt,
  });
}

// ===== OWNER DASHBOARD MODELS =====

class BusDriver {
  final String? id;
  final String name;
  final String phone;
  final String licenseNumber;
  final DateTime? licenseExpiry;
  final String? accessCode;

  const BusDriver({
    this.id,
    required this.name,
    required this.phone,
    required this.licenseNumber,
    this.licenseExpiry,
    this.accessCode,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'license_number': licenseNumber,
      'license_expiry': licenseExpiry?.toIso8601String(),
      'access_code': accessCode,
    };
  }

  factory BusDriver.fromJson(Map<String, dynamic> json) {
    return BusDriver(
      id: json['id'] as String?,
      name: json['driver_name'] as String? ?? json['name'] as String? ?? '',
      phone: json['driver_phone'] as String? ?? json['phone'] as String? ?? '',
      licenseNumber: json['license_number'] as String? ?? '',
      licenseExpiry: json['license_expiry'] != null ? DateTime.parse(json['license_expiry'] as String) : null,
      accessCode: json['access_code'] as String?,
    );
  }
}

class BusConductor {
  final String? id;
  final String name;
  final String phone;
  final String? idNumber;
  final String? accessCode;

  const BusConductor({
    this.id,
    required this.name,
    required this.phone,
    this.idNumber,
    this.accessCode,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'phone': phone,
      'id_number': idNumber,
      'access_code': accessCode,
    };
  }

  factory BusConductor.fromJson(Map<String, dynamic> json) {
    return BusConductor(
      id: json['id'] as String?,
      name: json['conductor_name'] as String? ?? json['name'] as String? ?? '',
      phone: json['conductor_phone'] as String? ?? json['phone'] as String? ?? '',
      idNumber: json['id_number'] as String?,
      accessCode: json['access_code'] as String?,
    );
  }
}

class ViaPoint {
  final String? id;
  final String city;
  final double? latitude;
  final double? longitude;
  final int sequenceOrder;

  const ViaPoint({
    this.id,
    required this.city,
    this.latitude,
    this.longitude,
    required this.sequenceOrder,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'city': city,
      'latitude': latitude,
      'longitude': longitude,
      'sequence_order': sequenceOrder,
    };
  }

  factory ViaPoint.fromJson(Map<String, dynamic> json) {
    return ViaPoint(
      id: json['id'] as String?,
      city: json['city'] as String? ?? '',
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      sequenceOrder: json['sequence_order'] as int? ?? 0,
    );
  }
}

class BusRoute {
  final String? id;
  final String name;
  final String from;
  final String to;
  final List<ViaPoint> viaPoints;
  final String? distance;
  final String? estimatedDuration;
  final bool hasReverseRoute;
  final String? reverseRouteId;

  const BusRoute({
    this.id,
    required this.name,
    required this.from,
    required this.to,
    this.viaPoints = const [],
    this.distance,
    this.estimatedDuration,
    this.hasReverseRoute = false,
    this.reverseRouteId,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'from': from,
      'to': to,
      'via_points': viaPoints.map((p) => p.toJson()).toList(),
      'distance': distance,
      'estimated_duration': estimatedDuration,
      'has_reverse_route': hasReverseRoute,
      'reverse_route_id': reverseRouteId,
    };
  }

  factory BusRoute.fromJson(Map<String, dynamic> json) {
    return BusRoute(
      id: json['id'] as String?,
      name: json['name'] as String? ?? '',
      from: json['from'] as String? ?? '',
      to: json['to'] as String? ?? '',
      viaPoints: (json['via_points'] as List?)
              ?.map((p) => ViaPoint.fromJson(p as Map<String, dynamic>))
              .toList() ??
          [],
      distance: json['distance'] as String?,
      estimatedDuration: json['estimated_duration'] as String?,
      hasReverseRoute: json['has_reverse_route'] as bool? ?? false,
      reverseRouteId: json['reverse_route_id'] as String?,
    );
  }
}

class BusTrip {
  final String? id;
  final String? routeId;
  final String? busId;
  final String departureTime;
  final String arrivalTime;
  final double price;
  final bool isActive;
  final DateTime createdAt;

  const BusTrip({
    this.id,
    this.routeId,
    this.busId,
    required this.departureTime,
    required this.arrivalTime,
    required this.price,
    this.isActive = true,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'route_id': routeId,
      'bus_id': busId,
      'departure_time': departureTime,
      'arrival_time': arrivalTime,
      'price': price,
      'is_active': isActive,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory BusTrip.fromJson(Map<String, dynamic> json) {
    return BusTrip(
      id: json['id'] as String?,
      routeId: json['route_id'] as String?,
      busId: json['bus_id'] as String?,
      departureTime: json['departure_time'] as String? ?? '',
      arrivalTime: json['arrival_time'] as String? ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0,
      isActive: json['is_active'] as bool? ?? true,
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at'] as String) : DateTime.now(),
    );
  }
}

class OwnerBus {
  final String? id;
  final String busNumber;
  final BusType busType;
  final int totalSeats;
  final String registrationNumber;
  final String? insuranceNumber;
  final DateTime? insuranceExpiry;
  final String approvalStatus;
  final bool isActive;
  final String? driverId;
  final String? conductorId;
  final BusDriver? driver;
  final BusConductor? conductor;
  final List<String> assignedRouteIds;
  final DateTime createdAt;

  const OwnerBus({
    this.id,
    required this.busNumber,
    required this.busType,
    required this.totalSeats,
    required this.registrationNumber,
    this.insuranceNumber,
    this.insuranceExpiry,
    this.approvalStatus = 'pending',
    this.isActive = false,
    this.driverId,
    this.conductorId,
    this.driver,
    this.conductor,
    this.assignedRouteIds = const [],
    required this.createdAt,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'bus_number': busNumber,
      'bus_type': busTypeToString(busType),
      'total_seats': totalSeats,
      'registration_number': registrationNumber,
      'insurance_number': insuranceNumber,
      'insurance_expiry': insuranceExpiry?.toIso8601String(),
      'approval_status': approvalStatus,
      'is_active': isActive,
      'driver_id': driverId,
      'conductor_id': conductorId,
      'driver': driver?.toJson(),
      'conductor': conductor?.toJson(),
      'assigned_route_ids': assignedRouteIds,
      'created_at': createdAt.toIso8601String(),
    };
  }

  factory OwnerBus.fromJson(Map<String, dynamic> json) {
    return OwnerBus(
      id: json['id'] as String?,
      busNumber: json['bus_number'] as String? ?? '',
      busType: busTypeFromString(json['bus_type'] as String?),
      totalSeats: json['total_seats'] as int? ?? 50,
      registrationNumber: json['registration_number'] as String? ?? '',
      insuranceNumber: json['insurance_number'] as String?,
      insuranceExpiry: json['insurance_expiry'] != null ? DateTime.parse(json['insurance_expiry'] as String) : null,
      approvalStatus: json['approval_status'] as String? ?? 'pending',
      isActive: json['is_active'] as bool? ?? false,
      driverId: json['driver_id'] as String?,
      conductorId: json['conductor_id'] as String?,
      driver: json['driver'] != null ? BusDriver.fromJson(json['driver'] as Map<String, dynamic>) : null,
      conductor: json['conductor'] != null ? BusConductor.fromJson(json['conductor'] as Map<String, dynamic>) : null,
      assignedRouteIds: (json['assigned_route_ids'] as List?)?.cast<String>() ?? [],
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at'] as String) : DateTime.now(),
    );
  }
}

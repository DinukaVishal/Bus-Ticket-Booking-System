import 'package:flutter/material.dart';
import '../models/booking_models.dart';
import '../services/supabase_service.dart';

class SelectSeatPage extends StatefulWidget {
  const SelectSeatPage({
    super.key,
    required this.route,
    required this.trip,
    required this.travelDate,
  });

  final RouteOption route;
  final TripOption trip;
  final DateTime travelDate;

  @override
  State<SelectSeatPage> createState() => _SelectSeatPageState();
}

class _SelectSeatPageState extends State<SelectSeatPage> {
  final Map<int, String> _bookedSeatGender = {};
  final Set<int> _selectedSeats = {};
  bool _isLoading = true;
  String? _errorMessage;

  BusTypeConfig get _busConfig => busTypeConfigs[widget.route.busType]!;
  int get _mainSeatCount => widget.route.totalSeats;
  int get _jumpSeatCount => _busConfig.jumpSeats;
  int get _effectiveSeatCount => _mainSeatCount + _jumpSeatCount;

  bool get _allMainSeatsBooked {
    return List.generate(_mainSeatCount, (index) => index + 1).every(
      (seatNumber) => _bookedSeatGender.containsKey(seatNumber),
    );
  }

  @override
  void initState() {
    super.initState();
    _loadBookedSeats();
  }

  Future<void> _loadBookedSeats() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final bookedSeats = await SupabaseService.fetchBookedSeats(
        tripId: widget.trip.id,
        travelDate: widget.travelDate,
      );
      setState(() {
        _bookedSeatGender.clear();
        _bookedSeatGender.addEntries(bookedSeats.map((seat) => MapEntry(seat.seatNumber, seat.gender)));
      });
    } catch (error) {
      setState(() {
        _errorMessage = 'Unable to load booked seats. Please try again.';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  bool _isJumpSeat(int seatNumber) {
    return _jumpSeatCount > 0 && seatNumber > _mainSeatCount && seatNumber <= _effectiveSeatCount;
  }

  bool _isSeatBooked(int seatNumber) {
    return _bookedSeatGender.containsKey(seatNumber);
  }

  bool _isSeatSelectable(int seatNumber) {
    if (_isSeatBooked(seatNumber)) return false;
    if (_isJumpSeat(seatNumber)) {
      return _allMainSeatsBooked;
    }
    return true;
  }

  void _toggleSeat(int seatNumber) {
    if (!_isSeatSelectable(seatNumber)) return;
    setState(() {
      if (_selectedSeats.contains(seatNumber)) {
        _selectedSeats.remove(seatNumber);
      } else {
        _selectedSeats.add(seatNumber);
      }
    });
  }

  Widget _buildSeatButton(int seatNumber, {bool isWindow = false, bool isJump = false, bool isSmall = false}) {
    final isBooked = _isSeatBooked(seatNumber);
    final isSelected = _selectedSeats.contains(seatNumber);
    final jumpLocked = isJump && !_allMainSeatsBooked;
    final isEnabled = _isSeatSelectable(seatNumber);
    final theme = Theme.of(context);
    final gender = _bookedSeatGender[seatNumber] ?? 'unknown';

    Color background;
    Color foreground;

    if (isBooked) {
      if (gender == 'female') {
        background = Colors.pink.shade300;
      } else if (gender == 'male') {
        background = Colors.blue.shade300;
      } else {
        background = Colors.grey.shade700;
      }
      foreground = Colors.white;
    } else if (isSelected) {
      background = theme.colorScheme.primary;
      foreground = Colors.white;
    } else if (jumpLocked) {
      background = Colors.grey.shade300;
      foreground = Colors.grey.shade600;
    } else {
      background = theme.colorScheme.surfaceContainerHighest;
      foreground = theme.colorScheme.onSurface;
    }

    final label = isJump ? 'J$seatNumber' : seatNumber.toString();

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: GestureDetector(
        onTap: isEnabled ? () => _toggleSeat(seatNumber) : null,
        child: Container(
          width: isSmall ? 40 : 52,
          height: isSmall ? 40 : 52,
          decoration: BoxDecoration(
            color: background,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isSelected ? theme.colorScheme.primary : Colors.transparent,
              width: 2,
            ),
            boxShadow: isSelected
                ? [BoxShadow(color: theme.colorScheme.primary.withAlpha(51), blurRadius: 8, offset: const Offset(0, 4))]
                : null,
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Text(label, style: TextStyle(color: foreground, fontWeight: FontWeight.bold, fontSize: isSmall ? 12 : 14)),
              if (isBooked && gender != 'unknown')
                Positioned(
                  bottom: 4,
                  child: Text(
                    gender == 'female' ? 'F' : 'M',
                    style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ),
              if (isJump)
                Positioned(
                  top: 4,
                  right: 4,
                  child: Icon(
                    Icons.airline_seat_recline_normal,
                    size: isSmall ? 12 : 14,
                    color: jumpLocked ? Colors.grey.shade500 : theme.colorScheme.primary,
                  ),
                ),
              if (isWindow && !isJump)
                Positioned(
                  top: 4,
                  left: 4,
                  child: Icon(
                    Icons.window,
                    size: isSmall ? 12 : 14,
                    color: theme.colorScheme.primary.withAlpha(204),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildRosaLayout() {
    final rows = <Widget>[];

    rows.add(
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildSeatButton(1, isWindow: true),
          const SizedBox(width: 16),
          _buildSeatButton(2),
          const SizedBox(width: 8),
          _buildSeatButton(3, isWindow: true),
        ],
      ),
    );

    final regularRowSeats = [
      {'left': 4, 'jump': 27, 'right': [5, 6]},
      {'left': 7, 'jump': 28, 'right': [8, 9]},
      {'left': 10, 'jump': 29, 'right': [11, 12]},
      {'left': 13, 'jump': 30, 'right': [14, 15]},
      {'left': 16, 'jump': 31, 'right': [17, 18]},
      {'left': 19, 'jump': 32, 'right': [20, 21]},
    ];

    for (final row in regularRowSeats) {
      rows.add(
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildSeatButton(row['left'] as int, isWindow: true),
            const SizedBox(width: 10),
            _buildSeatButton(row['jump'] as int, isJump: true),
            const SizedBox(width: 18),
            _buildSeatButton((row['right'] as List<int>)[0]),
            const SizedBox(width: 8),
            _buildSeatButton((row['right'] as List<int>)[1], isWindow: true),
          ],
        ),
      );
    }

    rows.add(
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _buildSeatButton(22, isWindow: true, isSmall: true),
          const SizedBox(width: 6),
          _buildSeatButton(23, isSmall: true),
          const SizedBox(width: 6),
          _buildSeatButton(24, isSmall: true),
          const SizedBox(width: 6),
          _buildSeatButton(25, isSmall: true),
          const SizedBox(width: 6),
          _buildSeatButton(26, isWindow: true, isSmall: true),
        ],
      ),
    );

    return rows;
  }

  List<Widget> _buildLuxuryLayout() {
    final rows = <Widget>[];
    var currentSeat = 1;

    for (var rowIndex = 0; rowIndex < 10; rowIndex++) {
      rows.add(
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildSeatButton(currentSeat++, isWindow: true),
            const SizedBox(width: 8),
            _buildSeatButton(currentSeat++),
            const SizedBox(width: 24),
            _buildSeatButton(currentSeat++),
            const SizedBox(width: 8),
            _buildSeatButton(currentSeat++, isWindow: true),
          ],
        ),
      );
    }

    rows.add(
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (var i = 41; i <= 45; i++) ...[
            _buildSeatButton(i, isSmall: true, isWindow: i == 41 || i == 45),
            if (i < 45) const SizedBox(width: 6),
          ],
        ],
      ),
    );

    return rows;
  }

  List<Widget> _buildNormalLayout() {
    final rows = <Widget>[];
    var currentSeat = 1;

    for (var rowIndex = 0; rowIndex < 10; rowIndex++) {
      if (rowIndex == 9) {
        rows.add(
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(width: 66, child: Center(child: Text('EXIT', style: TextStyle(fontSize: 10, color: Colors.green)))),
              const SizedBox(width: 18),
              for (var i = 0; i < 3; i++) ...[
                _buildSeatButton(currentSeat++, isWindow: i == 2),
                if (i < 2) const SizedBox(width: 8),
              ],
            ],
          ),
        );
      } else {
        rows.add(
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildSeatButton(currentSeat++, isWindow: true),
              const SizedBox(width: 8),
              _buildSeatButton(currentSeat++),
              const SizedBox(width: 24),
              _buildSeatButton(currentSeat++),
              const SizedBox(width: 8),
              _buildSeatButton(currentSeat++, isWindow: true),
            ],
          ),
        );
      }
    }

    rows.add(
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (var i = 49; i <= 54; i++) ...[
            _buildSeatButton(i, isSmall: true, isWindow: i == 49 || i == 54),
            if (i < 54) const SizedBox(width: 6),
          ],
        ],
      ),
    );

    return rows;
  }

  List<Widget> _buildSuperLongLayout() {
    final rows = <Widget>[];
    var currentSeat = 1;

    for (var rowIndex = 0; rowIndex < 12; rowIndex++) {
      rows.add(
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildSeatButton(currentSeat++, isWindow: true),
            const SizedBox(width: 8),
            _buildSeatButton(currentSeat++),
            const SizedBox(width: 24),
            _buildSeatButton(currentSeat++),
            const SizedBox(width: 8),
            _buildSeatButton(currentSeat++, isWindow: true),
          ],
        ),
      );
    }

    rows.add(
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (var i = 49; i <= 54; i++) ...[
            _buildSeatButton(i, isSmall: true, isWindow: i == 49 || i == 54),
            if (i < 54) const SizedBox(width: 6),
          ],
        ],
      ),
    );

    return rows;
  }

  List<Widget> _buildLayoutRows() {
    switch (widget.route.busType) {
      case BusType.rosa:
        return _buildRosaLayout();
      case BusType.luxuryAc:
        return _buildLuxuryLayout();
      case BusType.superLong:
        return _buildSuperLongLayout();
      case BusType.normal:
        return _buildNormalLayout();
    }
  }

  Widget _buildLegend() {
    return Wrap(
      spacing: 10,
      runSpacing: 10,
      children: [
        _legendChip(label: 'Available', color: Theme.of(context).colorScheme.surfaceContainerHighest, textColor: Theme.of(context).colorScheme.onSurface),
        _legendChip(label: 'Selected', color: Theme.of(context).colorScheme.primary, textColor: Colors.white),
        _legendChip(label: 'Booked male', color: Colors.blue.shade300, textColor: Colors.white),
        _legendChip(label: 'Booked female', color: Colors.pink.shade300, textColor: Colors.white),
        _legendChip(label: 'Jump seat', color: Colors.grey.shade300, textColor: Colors.grey.shade800),
      ],
    );
  }

  Widget _legendChip({required String label, required Color color, required Color textColor}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Text(label, style: TextStyle(color: textColor, fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Select Seat'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(widget.route.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 10),
                    Text('${widget.route.from} → ${widget.route.to}', style: const TextStyle(fontSize: 16)),
                    const SizedBox(height: 8),
                    Text('${widget.trip.departureTime} - ${widget.trip.arrivalTime}', style: const TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 12,
                      runSpacing: 8,
                      children: [
                        Chip(label: Text(widget.route.serviceType)),
                        Chip(label: Text(widget.route.busType.name.toUpperCase())),
                        Chip(label: Text('${widget.route.totalSeats} seats')),
                        Chip(label: Text(_mainSeatCount == widget.route.totalSeats ? 'Main seats $_mainSeatCount' : '$_effectiveSeatCount seats')),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 18),
            const Text('Choose your seat', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 14),
            if (_isLoading)
              const Expanded(child: Center(child: CircularProgressIndicator()))
            else if (_errorMessage != null)
              Expanded(child: Center(child: Text(_errorMessage!)))
            else
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    children: _buildLayoutRows().map((row) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 6),
                      child: row,
                    )).toList(),
                  ),
                ),
              ),
            const SizedBox(height: 16),
            _buildLegend(),
            const SizedBox(height: 12),
            Text(
              _selectedSeats.isEmpty
                  ? 'Select at least one seat to continue'
                  : 'Selected seats: ${_selectedSeats.toList()..sort()}'.replaceAll('[', '').replaceAll(']', ''),
              style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withAlpha(180)),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _selectedSeats.isEmpty
                  ? null
                  : () {
                      Navigator.pushNamed(
                        context,
                        '/booking-summary',
                        arguments: {
                          'route': widget.route,
                          'trip': widget.trip,
                          'travelDate': widget.travelDate,
                          'seatNumbers': _selectedSeats.toList(),
                        },
                      );
                    },
              child: const Text('Continue to summary'),
            ),
          ],
        ),
      ),
    );
  }
}

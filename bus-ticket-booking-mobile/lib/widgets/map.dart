import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';

class GoogleMapWidget extends StatefulWidget {
  final LatLng? center;
  final double zoom;
  final bool myLocationEnabled;

  const GoogleMapWidget({
    super.key,
    this.center,
    this.zoom = 7.5,
    this.myLocationEnabled = false,
  });

  @override
  State<GoogleMapWidget> createState() => _GoogleMapWidgetState();
}

class _GoogleMapWidgetState extends State<GoogleMapWidget> {
  GoogleMapController? mapController;

  // default Sri Lanka center
  static const LatLng _defaultCenter = LatLng(7.8731, 80.7718);

  void _onMapCreated(GoogleMapController controller) {
    mapController = controller;
  }

  @override
  Widget build(BuildContext context) {
    final LatLng center = widget.center ?? _defaultCenter;

    return GoogleMap(
      onMapCreated: _onMapCreated,
      initialCameraPosition: CameraPosition(
        target: center,
        zoom: widget.zoom,
      ),
      myLocationEnabled: widget.myLocationEnabled,
      zoomControlsEnabled: false,
    );
  }
}
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

/// Full-screen QR scanner.
///
/// Pops with the scanned string, or with `null` if the user backs out:
///
/// ```dart
/// final code = await Navigator.push<String>(
///   context,
///   MaterialPageRoute(builder: (_) => const QrScannerPage()),
/// );
/// ```
class QrScannerPage extends StatefulWidget {
  const QrScannerPage({super.key, this.title = 'Scan Ticket'});

  final String title;

  @override
  State<QrScannerPage> createState() => _QrScannerPageState();
}

class _QrScannerPageState extends State<QrScannerPage> {
  final MobileScannerController _controller = MobileScannerController();

  /// Stops the same code firing several times while the camera keeps reading it.
  bool _handled = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_handled) return;

    String? code;
    for (final barcode in capture.barcodes) {
      if (barcode.rawValue != null && barcode.rawValue!.isNotEmpty) {
        code = barcode.rawValue;
        break;
      }
    }
    if (code == null) return;

    _handled = true;
    if (mounted) Navigator.pop(context, code);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        actions: [
          IconButton(
            tooltip: 'Toggle torch',
            icon: const Icon(Icons.flashlight_on),
            onPressed: () => _controller.toggleTorch(),
          ),
          IconButton(
            tooltip: 'Switch camera',
            icon: const Icon(Icons.cameraswitch),
            onPressed: () => _controller.switchCamera(),
          ),
        ],
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(
            controller: _controller,
            onDetect: _onDetect,
            errorBuilder: (context, error) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.videocam_off, size: 48, color: Colors.red),
                      const SizedBox(height: 12),
                      Text(
                        'Camera error: ${error.errorDetails?.message ?? error.errorCode.name}',
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.red),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          // Simple aiming frame so staff know where to hold the ticket.
          IgnorePointer(
            child: Center(
              child: Container(
                width: 240,
                height: 240,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.white, width: 3),
                  borderRadius: BorderRadius.circular(20),
                ),
              ),
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 40,
            child: Text(
              'Point the camera at the passenger ticket',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.white,
                fontSize: 15,
                fontWeight: FontWeight.w600,
                shadows: [
                  Shadow(color: Colors.black.withAlpha(180), blurRadius: 6),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, RefreshCw, Camera } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';

interface ParsedTicketQr {
  ids: string[];
  seats?: string;
}

interface TicketDetails {
  ids: string[];
  seats: string;
  date: string;
  route: string;
  passenger: string;
}

type ScannerResult = Array<{ rawValue?: string }>;

const parseTicketQr = (qrDataString: string): ParsedTicketQr => {
  try {
    const qrData = JSON.parse(qrDataString) as { id?: string; seats?: string | number[] };
    const ids = qrData.id?.split(',').map((id) => id.trim()).filter(Boolean) || [];
    const seats = Array.isArray(qrData.seats) ? qrData.seats.join(',') : qrData.seats;

    return { ids, seats };
  } catch {
    const legacyMatch = qrDataString.match(/IDs:\s*([^|]+)\|\s*Seats:\s*(.+)$/i);
    if (!legacyMatch) {
      throw new Error('Invalid QR format.');
    }

    return {
      ids: legacyMatch[1].split(',').map((id) => id.trim()).filter(Boolean),
      seats: legacyMatch[2].trim(),
    };
  }
};

const TicketScanner = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const [ticketDetails, setTicketDetails] = useState<TicketDetails | null>(null);
  const [errorMessage, setErrorMessage] = useState('This QR code is invalid, cancelled, completed, or does not exist in the system.');

  const handleScan = async (result: unknown) => {
    if (!result || scanResult) return;

    const scans = result as ScannerResult;
    const rawValue = scans[0]?.rawValue;
    if (!rawValue) return;

    setScanResult(rawValue);
    verifyTicket(rawValue);
  };

  const verifyTicket = async (qrDataString: string) => {
    setVerificationStatus('loading');
    setErrorMessage('This QR code is invalid, cancelled, completed, or does not exist in the system.');

    try {
      const qrData = parseTicketQr(qrDataString);
      if (qrData.ids.length === 0) {
        throw new Error('Invalid QR format.');
      }

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .in('booking_id', qrData.ids);

      if (error) throw error;
      if (!bookings || bookings.length !== qrData.ids.length) {
        throw new Error('Ticket not found.');
      }

      const inactiveBooking = bookings.find((booking) => booking.status !== 'confirmed');
      if (inactiveBooking) {
        throw new Error(`Ticket is already ${inactiveBooking.status}.`);
      }

      const { error: completeError } = await supabase.rpc('complete_ticket_trip', {
        _booking_ids: qrData.ids,
      });

      if (completeError) throw completeError;

      const sortedSeats = bookings
        .map((booking) => booking.seat_number)
        .sort((a, b) => a - b)
        .join(',');

      setVerificationStatus('valid');
      setTicketDetails({
        ids: qrData.ids,
        seats: qrData.seats || sortedSeats,
        date: bookings[0].date,
        route: bookings[0].route_name,
        passenger: bookings[0].passenger_name,
      });

      toast({ title: 'Trip Completed', description: 'Ticket verified and seat unlocked.' });
    } catch (error) {
      console.error('Verification Error:', error);
      const message = error instanceof Error ? error.message : 'Ticket could not be verified.';
      setErrorMessage(message);
      setVerificationStatus('invalid');
      toast({ title: 'Invalid Ticket', description: message, variant: 'destructive' });
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setVerificationStatus('idle');
    setTicketDetails(null);
    setErrorMessage('This QR code is invalid, cancelled, completed, or does not exist in the system.');
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <Camera className="w-12 h-12 mx-auto text-primary" />
            <h1 className="text-2xl font-bold">Ticket Scanner</h1>
            <p className="text-muted-foreground text-sm">Scan passenger QR codes to end trips and release seats</p>
          </div>

          {verificationStatus === 'idle' && (
            <div className="rounded-xl overflow-hidden border-2 border-primary/50 shadow-2xl relative aspect-square bg-black">
              <Scanner
                onScan={handleScan}
                allowMultiple={false}
                scanDelay={2000}
                components={{ finder: true }}
              />
              <div className="absolute inset-0 border-2 border-primary/30 pointer-events-none animate-pulse" />
            </div>
          )}

          {verificationStatus === 'loading' && (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-xl font-semibold">Completing Trip...</p>
              </CardContent>
            </Card>
          )}

          {verificationStatus === 'valid' && ticketDetails && (
            <Card className="bg-green-500/10 border-green-500 animate-in fade-in zoom-in duration-300">
              <CardHeader className="text-center pb-2">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-2" />
                <CardTitle className="text-3xl text-green-600">TRIP COMPLETED</CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4 pt-4">
                <div className="bg-background/50 p-4 rounded-lg border border-green-200">
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Route</p>
                  <p className="text-lg font-bold">{ticketDetails.route}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background/50 p-3 rounded-lg border border-green-200">
                    <p className="text-muted-foreground text-xs uppercase">Date</p>
                    <p className="font-semibold">{ticketDetails.date}</p>
                  </div>
                  <div className="bg-background/50 p-3 rounded-lg border border-green-200">
                    <p className="text-muted-foreground text-xs uppercase">Seats</p>
                    <p className="font-bold text-2xl text-green-700">{ticketDetails.seats}</p>
                  </div>
                </div>

                <div className="bg-green-600/10 p-3 rounded-lg border border-green-200">
                  <p className="font-semibold text-green-700">Seats unlocked for future bookings</p>
                </div>

                <div className="bg-background/50 p-3 rounded-lg border border-green-200">
                  <p className="text-muted-foreground text-xs uppercase">Passenger</p>
                  <p className="font-semibold">{ticketDetails.passenger}</p>
                </div>

                <Button onClick={resetScanner} className="w-full bg-green-600 hover:bg-green-700 mt-4 h-12 text-lg">
                  <RefreshCw className="mr-2 w-5 h-5" /> Scan Next
                </Button>
              </CardContent>
            </Card>
          )}

          {verificationStatus === 'invalid' && (
            <Card className="bg-red-500/10 border-red-500 animate-in shake duration-300">
              <CardHeader className="text-center">
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-2" />
                <CardTitle className="text-3xl text-red-500">INVALID TICKET</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-red-600 mb-6 font-medium">{errorMessage}</p>
                <Button onClick={resetScanner} variant="destructive" className="w-full h-12 text-lg">
                  <RefreshCw className="mr-2 w-5 h-5" /> Try Again
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketScanner;

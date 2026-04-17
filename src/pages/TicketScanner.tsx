import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, RefreshCw, Camera } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';

const TicketScanner = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'valid' | 'invalid'>('idle');
  const [ticketDetails, setTicketDetails] = useState<any>(null);

  const handleScan = async (result: any) => {
    if (!result || scanResult) return;
    const rawValue = result[0]?.rawValue;
    if (!rawValue) return;

    setScanResult(rawValue);
    verifyTicket(rawValue);
  };

  const verifyTicket = async (qrDataString: string) => {
    setVerificationStatus('loading');
    
    try {
      const qrData = JSON.parse(qrDataString);
      
      // QR එකේ අවශ්‍ය දත්ත තියෙනවද බලනවා
      if (!qrData.id || !qrData.seats) {
        throw new Error("Invalid QR Format");
      }

      // Booking IDs වෙන් කරගැනීම
      const bookingIds = qrData.id.split(',');

      // Database එකෙන් පරීක්ෂා කිරීම
      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .in('booking_id', bookingIds)
        .eq('status', 'confirmed');

      if (error) throw error;

      // ප්‍රතිඵල සැසඳීම
      if (bookings && bookings.length > 0) {
        setVerificationStatus('valid');
        setTicketDetails({
          ids: bookingIds,
          seats: qrData.seats,
          date: bookings[0].date,
          route: qrData.route || bookings[0].route_name,
          passenger: bookings[0].passenger_name
        });
        toast({ title: "Valid Ticket", description: "Ticket verified successfully!" });
      } else {
        setVerificationStatus('invalid');
        toast({ title: "Invalid Ticket", description: "Ticket not found or cancelled.", variant: "destructive" });
      }

    } catch (error) {
      console.error("Verification Error:", error);
      setVerificationStatus('invalid');
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setVerificationStatus('idle');
    setTicketDetails(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[80vh]">
        <div className="w-full max-w-md space-y-6">
          
          <div className="text-center space-y-2">
            <Camera className="w-12 h-12 mx-auto text-primary" />
            <h1 className="text-2xl font-bold">Ticket Scanner</h1>
            <p className="text-muted-foreground text-sm">Scan passenger's QR code to verify</p>
          </div>

          {/* කැමරාව පෙන්වන කොටස */}
          {verificationStatus === 'idle' && (
            <div className="rounded-xl overflow-hidden border-2 border-primary/50 shadow-2xl relative aspect-square bg-black">
               <Scanner 
                  onScan={handleScan} 
                  allowMultiple={false}
                  scanDelay={2000}
                  components={{ finder: true }}
              />
              <div className="absolute inset-0 border-2 border-primary/30 pointer-events-none animate-pulse"></div>
            </div>
          )}

          {/* Loading... */}
          {verificationStatus === 'loading' && (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                <p className="text-xl font-semibold">Verifying Ticket...</p>
              </CardContent>
            </Card>
          )}

          {/* හරි ගියොත් (Valid) */}
          {verificationStatus === 'valid' && ticketDetails && (
            <Card className="bg-green-500/10 border-green-500 animate-in fade-in zoom-in duration-300">
              <CardHeader className="text-center pb-2">
                <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-2" />
                <CardTitle className="text-3xl text-green-600">VALID TICKET</CardTitle>
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

          {/* වැරදි නම් (Invalid) */}
          {verificationStatus === 'invalid' && (
            <Card className="bg-red-500/10 border-red-500 animate-in shake duration-300">
              <CardHeader className="text-center">
                <XCircle className="w-16 h-16 text-red-500 mx-auto mb-2" />
                <CardTitle className="text-3xl text-red-500">INVALID TICKET</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-red-600 mb-6 font-medium">
                  This QR code is invalid, cancelled, or does not exist in the system.
                </p>
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
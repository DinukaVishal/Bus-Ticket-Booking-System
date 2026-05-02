import { useState, useEffect } from "react";
import { Route, Booking } from "@/types/booking";
import { initPayHerePayment, generateOrderId, getPaymentResult, isReturningFromPayment } from "@/lib/payments/payHereDirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, CreditCard, Shield, Lock, CheckCircle, XCircle } from "lucide-react";

interface PaymentStepProps {
  route: Route;
  bookings: Booking[];
  selectedDate: Date;
  selectedSeats: number[];
  onPaymentComplete: () => void;
}

export default function PaymentStep({
  route,
  bookings,
  selectedDate,
  selectedSeats,
  onPaymentComplete,
}: PaymentStepProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "success" | "failed">("idle");
  
  const seatCount = bookings.length > 0 ? bookings.length : selectedSeats.length;
  const totalAmount = route.price * seatCount;

  // Check if returning from payment
  useEffect(() => {
    if (isReturningFromPayment()) {
      const result = getPaymentResult();
      if (result.status === "success") {
        setPaymentStatus("success");
        onPaymentComplete();
      } else {
        setPaymentStatus("failed");
      }
    }
  }, []);

  const handlePayment = async () => {
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to proceed with payment.",
        variant: "destructive",
      });
      return;
    }

    if (!phone) {
      toast({
        title: "Phone Required",
        description: "Please enter your phone number to proceed with payment.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const bookingId = bookings[0]?.id || `BK${Date.now()}`;
      const orderId = generateOrderId();

      // Initialize PayHere payment - this will redirect to PayHere
      await initPayHerePayment({
        merchantId: "122XXXX",
        orderId: orderId,
        amount: totalAmount,
        currency: "LKR",
        customerEmail: email,
        customerPhone: phone,
        routeName: route.name,
        bookingId: bookingId,
      });
    } catch (error: any) {
      console.error("Payment error:", error);
      toast({
        title: "Payment Error",
        description: error.message || "Failed to initiate payment. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const formattedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Show success or failed screen
  if (paymentStatus === "success") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-600 mb-2">Payment Successful!</h2>
          <p className="text-muted-foreground mb-4">Your payment has been processed successfully.</p>
          <Button onClick={onPaymentComplete} className="w-full">
            View Booking Confirmation
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (paymentStatus === "failed") {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h2>
          <p className="text-muted-foreground mb-4">Your payment was not completed. Please try again.</p>
          <Button onClick={() => setPaymentStatus("idle")} className="w-full">
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment Details
          </CardTitle>
          <CardDescription>
            Complete your payment via PayHere secure checkout
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm">Order Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Route</span>
              <span className="font-medium">{route.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{formattedDate}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Seats</span>
              <span className="font-medium">#{selectedSeats.join(", #")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Number of Seats</span>
              <span className="font-medium">{seatCount}</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between">
                <span className="font-semibold">Total Amount</span>
                <span className="font-bold text-xl text-primary">
                  LKR {totalAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Used for payment receipt and booking confirmation
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+94 7x xxx xxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Used for payment verification
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
            <Shield className="w-4 h-4" />
            <span>Secured by PayHere</span>
            <Lock className="w-4 h-4" />
          </div>
        </CardContent>

        <CardFooter>
          <Button
            onClick={handlePayment}
            disabled={isLoading || !email || !phone}
            className="w-full h-12"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 mr-2" />
                Pay LKR {totalAmount.toLocaleString()}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <p>You will be redirected to PayHere secure checkout to complete payment</p>
        <p className="text-xs mt-1">
          After payment, you will return to see your confirmed booking
        </p>
      </div>
    </div>
  );
}

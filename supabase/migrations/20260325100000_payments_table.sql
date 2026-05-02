-- Payments table for PayHere integration
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'LKR',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  transaction_id TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  payhere_order_id TEXT,
  payhere_payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Allow all read access
CREATE POLICY "Allow all read access to payments" ON payments
  FOR SELECT USING (true);

-- Allow service role to insert/update
CREATE POLICY "Allow service role to manage payments" ON payments
  FOR ALL USING (true);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payhere_order_id ON payments(payhere_order_id);

-- Function to create payment record
CREATE OR REPLACE FUNCTION create_payment_record(
  _booking_id TEXT,
  _amount INTEGER,
  _customer_email TEXT,
  _customer_phone TEXT
)
RETURNS TABLE(id UUID, booking_id TEXT, amount INTEGER, status TEXT, payhere_order_id TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id UUID;
  v_payhere_order_id TEXT;
BEGIN
  -- Generate unique PayHere order ID
  v_payhere_order_id := 'BH' || TO_CHAR(NOW(), 'YYYYMMDD') || LPAD(FLOOR(RANDOM() * 100000)::TEXT, 5, '0');
  
  -- Insert payment record
  INSERT INTO payments (booking_id, amount, customer_email, customer_phone, payhere_order_id, status)
  VALUES (_booking_id, _amount, _customer_email, _customer_phone, v_payhere_order_id, 'pending')
  RETURNING id INTO v_payment_id;
  
  RETURN QUERY 
  SELECT v_payment_id, _booking_id, _amount, 'pending'::TEXT, v_payhere_order_id;
END;
$$;

-- Function to update payment status
CREATE OR REPLACE FUNCTION update_payment_status(
  _payhere_order_id TEXT,
  _new_status TEXT,
  _transaction_id TEXT DEFAULT NULL,
  _payment_method TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE payments 
  SET 
    status = _new_status,
    transaction_id = COALESCE(_transaction_id, transaction_id),
    payment_method = COALESCE(_payment_method, payment_method),
    payhere_payment_id = COALESCE(_payment_method, payhere_payment_id),
    updated_at = NOW()
  WHERE payhere_order_id = _payhere_order_id;
  
  RETURN FOUND;
END;
$$;

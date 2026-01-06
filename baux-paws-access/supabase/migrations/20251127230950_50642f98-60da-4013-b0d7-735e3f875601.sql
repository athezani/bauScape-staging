-- Create orders table
CREATE TABLE public.order (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES public.booking(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.order ENABLE ROW LEVEL SECURITY;

-- Create policy: Providers can view orders linked to their bookings
CREATE POLICY "Providers can view own orders"
ON public.order
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.booking
    WHERE booking.id = "order".booking_id
    AND booking.provider_id = auth.uid()
  )
);

-- Create policy: Providers can insert orders for their bookings
CREATE POLICY "Providers can insert own orders"
ON public.order
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.booking
    WHERE booking.id = booking_id
    AND booking.provider_id = auth.uid()
  )
);

-- Create policy: Providers can update their own orders
CREATE POLICY "Providers can update own orders"
ON public.order
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.booking
    WHERE booking.id = "order".booking_id
    AND booking.provider_id = auth.uid()
  )
);

-- Create policy: Providers can delete their own orders
CREATE POLICY "Providers can delete own orders"
ON public.order
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.booking
    WHERE booking.id = "order".booking_id
    AND booking.provider_id = auth.uid()
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_order_updated_at
BEFORE UPDATE ON public.order
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_order_booking_id ON public.order(booking_id);
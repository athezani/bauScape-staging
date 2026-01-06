-- Add end_date column to bookings table for multi-day trips
ALTER TABLE bookings ADD COLUMN end_date DATE;

-- For experiences, end_date will be NULL (same day)
-- For trips, end_date should be set to the last day of the trip

-- Update existing trip bookings with end dates
UPDATE bookings 
SET end_date = booking_date + INTERVAL '2 days'
WHERE product_type = 'trip' AND id IN (
  SELECT id FROM bookings WHERE product_name = 'Weekend in Toscana'
);

UPDATE bookings 
SET end_date = booking_date + INTERVAL '1 day'
WHERE product_type = 'trip' AND id IN (
  SELECT id FROM bookings WHERE product_name = 'Tour delle Cinque Terre'
);

UPDATE bookings 
SET end_date = booking_date + INTERVAL '3 days'
WHERE product_type = 'trip' AND id IN (
  SELECT id FROM bookings WHERE product_name = 'Avventura in Val d''Aosta'
);

UPDATE bookings 
SET end_date = booking_date + INTERVAL '2 days'
WHERE product_type = 'trip' AND id IN (
  SELECT id FROM bookings WHERE product_name = 'Tour Enogastronomico Piemonte'
);

UPDATE bookings 
SET end_date = booking_date + INTERVAL '6 days'
WHERE product_type = 'trip' AND id IN (
  SELECT id FROM bookings WHERE product_name = 'Settimana Bianca in Alto Adige'
);

UPDATE bookings 
SET end_date = booking_date + INTERVAL '1 day'
WHERE product_type = 'trip' AND id IN (
  SELECT id FROM bookings WHERE product_name = 'Weekend Wellness in Umbria'
);

UPDATE bookings 
SET end_date = booking_date + INTERVAL '2 days'
WHERE product_type = 'trip' AND id IN (
  SELECT id FROM bookings WHERE product_name = 'Matera e Basilicata Tour'
);

UPDATE bookings 
SET end_date = booking_date + INTERVAL '4 days'
WHERE product_type = 'trip' AND id IN (
  SELECT id FROM bookings WHERE product_name = 'Sicilia Coast to Coast'
);

UPDATE bookings 
SET end_date = booking_date + INTERVAL '1 day'
WHERE product_type = 'trip' AND id IN (
  SELECT id FROM bookings WHERE product_name = 'Lago di Como Experience'
);
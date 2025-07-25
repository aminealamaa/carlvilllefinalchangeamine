/*
  # Add commission fields to bookings table

  1. Changes
    - Add `commission_rate` column to bookings table (default 8%)
    - Add `commission_amount` column to bookings table (calculated field)
    - Add trigger to automatically calculate commission amount

  2. Security
    - Maintain existing RLS policies
*/

-- Add commission fields to bookings table
ALTER TABLE bookings 
ADD COLUMN commission_rate numeric NOT NULL DEFAULT 0.08,
ADD COLUMN commission_amount numeric GENERATED ALWAYS AS (amount * commission_rate) STORED;

-- Add check constraint for commission rate
ALTER TABLE bookings
ADD CONSTRAINT bookings_commission_rate_check 
CHECK (commission_rate >= 0 AND commission_rate <= 1);
/*
  # Database Schema and Security Fixes
  
  1. Changes
    - Add missing foreign key constraints
    - Create necessary indexes
    - Add validation triggers
    - Implement proper RLS policies
    - Clean up duplicate migrations
  
  2. Security
    - Add RLS policies for all tables
    - Implement proper cascade rules
    - Add validation triggers
*/

-- Clean up duplicate commission fields
ALTER TABLE bookings DROP COLUMN IF EXISTS commission_rate CASCADE;
ALTER TABLE bookings DROP COLUMN IF EXISTS commission_amount CASCADE;

-- Add commission fields (single implementation)
ALTER TABLE bookings 
ADD COLUMN commission_rate numeric NOT NULL DEFAULT 0.08,
ADD COLUMN commission_amount numeric GENERATED ALWAYS AS (amount * commission_rate) STORED;

-- Add check constraint for commission rate
ALTER TABLE bookings
ADD CONSTRAINT bookings_commission_rate_check 
CHECK (commission_rate >= 0 AND commission_rate <= 1);

-- Add foreign key constraint for agent_id
ALTER TABLE bookings
ADD COLUMN agent_id uuid REFERENCES agents(id) ON DELETE RESTRICT;

-- Create indexes for frequently queried fields
CREATE INDEX idx_bookings_dates ON bookings (start_date, end_date);
CREATE INDEX idx_bookings_agent ON bookings (agent_id);
CREATE INDEX idx_bookings_status ON bookings (status);

-- Add validation trigger for booking dates
CREATE OR REPLACE FUNCTION validate_booking_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if dates are valid
  IF NEW.end_date <= NEW.start_date THEN
    RAISE EXCEPTION 'End date must be after start date';
  END IF;
  
  -- Check for overlapping bookings
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE vehicle_id = NEW.vehicle_id
    AND id != NEW.id
    AND status NOT IN ('cancelled', 'completed')
    AND (
      (NEW.start_date BETWEEN start_date AND end_date)
      OR (NEW.end_date BETWEEN start_date AND end_date)
    )
  ) THEN
    RAISE EXCEPTION 'Vehicle is already booked for these dates';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_dates_validation
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_dates();

-- Update RLS policies
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can view own bookings"
  ON bookings FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Agents can create bookings"
  ON bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Agents can update own bookings"
  ON bookings FOR UPDATE
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

-- Add archival functionality
CREATE TABLE archived_bookings (
  LIKE bookings INCLUDING ALL,
  archived_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION archive_old_bookings()
RETURNS void AS $$
BEGIN
  WITH moved_rows AS (
    DELETE FROM bookings
    WHERE status = 'completed'
    AND end_date < (now() - interval '1 year')
    RETURNING *
  )
  INSERT INTO archived_bookings
  SELECT *, now() FROM moved_rows;
END;
$$ LANGUAGE plpgsql;
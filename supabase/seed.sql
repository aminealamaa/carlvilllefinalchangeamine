-- Sample expenses data for testing with user-specific structure
-- Note: This assumes you have users with job_title 'agent' or 'commercial' in your profiles table

-- Insert sample expenses for users with agent/commercial job titles
INSERT INTO expenses (amount, description, date, category, user_id) 
SELECT 
  50.00, 
  'Fuel for company vehicle', 
  '2024-01-15'::date, 
  'fuel'::text,
  profiles.id
FROM profiles 
WHERE profiles.job_title IN ('agent', 'commercial')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO expenses (amount, description, date, category, user_id) 
SELECT 
  25.50, 
  'Parking fees during client visit', 
  '2024-01-14'::date, 
  'travel'::text,
  profiles.id
FROM profiles 
WHERE profiles.job_title IN ('agent', 'commercial')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO expenses (amount, description, date, category, user_id) 
SELECT 
  120.00, 
  'Vehicle maintenance check', 
  '2024-01-13'::date, 
  'maintenance'::text,
  profiles.id
FROM profiles 
WHERE profiles.job_title IN ('agent', 'commercial')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO expenses (amount, description, date, category, user_id) 
SELECT 
  85.50, 
  'Brake pad replacement', 
  '2024-01-12'::date, 
  'repairs'::text,
  profiles.id
FROM profiles 
WHERE profiles.job_title IN ('agent', 'commercial')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO expenses (amount, description, date, category, user_id) 
SELECT 
  45.30, 
  'Office supplies for client presentations', 
  '2024-01-25'::date, 
  'office'::text,
  profiles.id
FROM profiles 
WHERE profiles.job_title IN ('agent', 'commercial')
LIMIT 1
ON CONFLICT DO NOTHING;

-- Add some recent expenses for testing
INSERT INTO expenses (amount, description, date, category, user_id) 
SELECT 
  165.75, 
  'Fuel expenses for client visits', 
  CURRENT_DATE - INTERVAL '5 days', 
  'fuel'::text,
  profiles.id
FROM profiles 
WHERE profiles.job_title IN ('agent', 'commercial')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO expenses (amount, description, date, category, user_id) 
SELECT 
  110.00, 
  'Scheduled vehicle maintenance', 
  CURRENT_DATE - INTERVAL '3 days', 
  'maintenance'::text,
  profiles.id
FROM profiles 
WHERE profiles.job_title IN ('agent', 'commercial')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO expenses (amount, description, date, category, user_id) 
SELECT 
  85.50, 
  'Minor vehicle repairs', 
  CURRENT_DATE - INTERVAL '1 day', 
  'repairs'::text,
  profiles.id
FROM profiles 
WHERE profiles.job_title IN ('agent', 'commercial')
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO expenses (amount, description, date, category, user_id) 
SELECT 
  55.00, 
  'Miscellaneous business expenses', 
  CURRENT_DATE, 
  'other'::text,
  profiles.id
FROM profiles 
WHERE profiles.job_title IN ('agent', 'commercial')
LIMIT 1
ON CONFLICT DO NOTHING;

-- Sample bookings returning tomorrow (for testing the cars returning tomorrow feature)
-- Note: These will need to be updated with actual client_id, vehicle_id, and agent_id values
-- that exist in your database. This is just a template.

-- INSERT INTO bookings (
--   start_date, 
--   end_date, 
--   status, 
--   payment_status, 
--   amount, 
--   client_id, 
--   vehicle_id, 
--   agent_id,
--   pickup_location,
--   return_location
-- ) VALUES
--   (CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '1 day', 'confirmed', 'paid', 250.00, 
--    (SELECT id FROM clients LIMIT 1), 
--    (SELECT id FROM vehicles LIMIT 1), 
--    (SELECT id FROM agents LIMIT 1),
--    'Main Office',
--    'Main Office');

-- Add more sample data as needed... 
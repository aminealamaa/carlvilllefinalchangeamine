-- Update expenses table to work with user job titles instead of agents table
-- Drop existing table if it exists and recreate with proper structure
DROP TABLE IF EXISTS expenses;

-- Create expenses table with proper foreign key to profiles table
CREATE TABLE expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('fuel', 'maintenance', 'insurance', 'repairs', 'office', 'travel', 'other')),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_created_at ON expenses(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for job-title-specific expenses

-- Allow users with job_title 'agent' or 'commercial' to view only their own expenses
CREATE POLICY "Agents and commercial users can view their own expenses" ON expenses
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.job_title IN ('agent', 'commercial')
    )
  );

-- Allow admins to view all expenses
CREATE POLICY "Admins can view all expenses" ON expenses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.job_title = 'admin'
    )
  );

-- Allow users with job_title 'agent' or 'commercial' to insert their own expenses
CREATE POLICY "Agents and commercial users can insert their own expenses" ON expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.job_title IN ('agent', 'commercial')
    )
  );

-- Allow admins to insert expenses for any user
CREATE POLICY "Admins can insert expenses for any user" ON expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.job_title = 'admin'
    )
  );

-- Allow users with job_title 'agent' or 'commercial' to update their own expenses
CREATE POLICY "Agents and commercial users can update their own expenses" ON expenses
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.job_title IN ('agent', 'commercial')
    )
  )
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.job_title IN ('agent', 'commercial')
    )
  );

-- Allow admins to update any user expenses
CREATE POLICY "Admins can update any user expenses" ON expenses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.job_title = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.job_title = 'admin'
    )
  );

-- Allow users with job_title 'agent' or 'commercial' to delete their own expenses
CREATE POLICY "Agents and commercial users can delete their own expenses" ON expenses
  FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.job_title IN ('agent', 'commercial')
    )
  );

-- Allow admins to delete any user expenses
CREATE POLICY "Admins can delete any user expenses" ON expenses
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.job_title = 'admin'
    )
  );

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (using profiles IDs instead of auth.users)
INSERT INTO expenses (amount, description, date, user_id) 
SELECT 50.00, 'Fuel for company vehicle', '2024-01-15', id 
FROM profiles 
WHERE job_title IN ('agent', 'commercial') 
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO expenses (amount, description, date, user_id) 
SELECT 25.50, 'Parking fees', '2024-01-14', id 
FROM profiles 
WHERE job_title IN ('agent', 'commercial') 
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO expenses (amount, description, date, user_id) 
SELECT 120.00, 'Vehicle maintenance', '2024-01-13', id 
FROM profiles 
WHERE job_title IN ('agent', 'commercial') 
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO expenses (amount, description, date, user_id) 
SELECT 15.75, 'Office supplies', '2024-01-12', id 
FROM profiles 
WHERE job_title IN ('agent', 'commercial') 
LIMIT 1
ON CONFLICT DO NOTHING; 
/*
  # Add Agent Stats Table

  1. New Tables
    - `agent_stats`
      - `id` (uuid, primary key)
      - `agent_id` (uuid, foreign key to agents)
      - `reservations` (integer)
      - `total_sales` (numeric)
      - `commission` (numeric)
      - `change_percentage` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS
    - Add policies for different user roles
*/

-- Create agent_stats table
CREATE TABLE IF NOT EXISTS agent_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE CASCADE,
  reservations integer NOT NULL DEFAULT 0,
  total_sales numeric NOT NULL DEFAULT 0,
  commission numeric NOT NULL DEFAULT 0,
  change_percentage numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT agent_stats_total_sales_check CHECK (total_sales >= 0),
  CONSTRAINT agent_stats_commission_check CHECK (commission >= 0)
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agent_stats_updated_at
  BEFORE UPDATE ON agent_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE agent_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Agent stats are viewable by authenticated users"
  ON agent_stats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Agent stats are editable by admins"
  ON agent_stats FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

-- Create indexes
CREATE INDEX idx_agent_stats_agent_id ON agent_stats(agent_id);
CREATE INDEX idx_agent_stats_updated_at ON agent_stats(updated_at);
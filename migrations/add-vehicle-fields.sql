-- Add fuel_type and transmission columns to vehicles table
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS fuel_type VARCHAR DEFAULT 'gasoline',
ADD COLUMN IF NOT EXISTS transmission VARCHAR DEFAULT 'automatic',
ADD COLUMN IF NOT EXISTS year VARCHAR DEFAULT NULL;

-- Update existing records to have default values
UPDATE vehicles 
SET 
  fuel_type = 'gasoline' 
WHERE fuel_type IS NULL;

UPDATE vehicles 
SET 
  transmission = 'automatic' 
WHERE transmission IS NULL; 
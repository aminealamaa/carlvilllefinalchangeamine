# Supabase Setup for Insurance Management

Follow these steps to set up the necessary Supabase resources for the insurance management feature.

## 1. Create Database Tables

Execute the SQL queries in `sql/insurance_tables.sql` to create the following tables:

- `insurance_documents`: Stores all insurance document details
- `insurance_templates`: Stores document templates

You can run these queries in the Supabase SQL Editor.

## 2. Set Up Storage Buckets

1. Navigate to the Storage section in your Supabase dashboard
2. Create a new bucket called `insurance` for storing document images
3. Set the following permissions for the `insurance` bucket:

```sql
-- For authenticated users
CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'insurance');

CREATE POLICY "Authenticated users can update their files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'insurance' AND auth.uid() = owner);

CREATE POLICY "Authenticated users can read all files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'insurance');

CREATE POLICY "Authenticated users can delete their files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'insurance' AND auth.uid() = owner);

-- For public access to images (if needed)
CREATE POLICY "Public can view insurance images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'insurance');
```

## 3. Set Up Row Level Security (RLS)

Enable Row Level Security on your insurance tables and add appropriate policies:

```sql
-- Enable RLS
ALTER TABLE insurance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_templates ENABLE ROW LEVEL SECURITY;

-- Add policies for insurance_documents
CREATE POLICY "Users can view all insurance documents"
ON insurance_documents FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own insurance documents"
ON insurance_documents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insurance documents"
ON insurance_documents FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insurance documents"
ON insurance_documents FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Add policies for insurance_templates
CREATE POLICY "Users can view all insurance templates"
ON insurance_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own insurance templates"
ON insurance_templates FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insurance templates"
ON insurance_templates FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insurance templates"
ON insurance_templates FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

## 4. Setup Client Table

If you don't already have a clients table, create one with the following structure:

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can view all clients"
ON clients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own clients"
ON clients FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
ON clients FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
ON clients FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

## 5. Testing the Setup

After completing the setup, you should:

1. Add a few test clients to the `clients` table
2. Verify that your React app can:
   - Create, read, update, and delete insurance documents
   - Upload and retrieve images from the `insurance` storage bucket
   - Filter and search insurance documents

## 6. Troubleshooting

If you encounter issues:

- Check the browser console for errors
- Verify that RLS policies are correctly configured
- Ensure that the user has the proper permissions
- Validate that the storage bucket is properly set up
- Confirm that the SQL tables match the expected structure

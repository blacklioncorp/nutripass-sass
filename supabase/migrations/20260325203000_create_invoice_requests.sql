-- DDL for invoice_requests table
CREATE TABLE IF NOT EXISTS invoice_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  transaction_id uuid REFERENCES public.transactions(id) NOT NULL,
  rfc text NOT NULL,
  razon_social text NOT NULL,
  codigo_postal text NOT NULL,
  regimen_fiscal text NOT NULL,
  uso_cfdi text NOT NULL,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE invoice_requests ENABLE ROW LEVEL SECURITY;

-- Allow parents to insert their own requests
CREATE POLICY "Parents can insert their own invoice requests" 
ON invoice_requests FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Allow parents to view their own requests
CREATE POLICY "Parents can view their own invoice requests" 
ON invoice_requests FOR SELECT 
USING (auth.uid() = user_id);

-- Allow school admins to view requests (this might need refinement based on school_id)
CREATE POLICY "Admins can view all invoice requests" 
ON invoice_requests FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('school_admin', 'superadmin')
  )
);

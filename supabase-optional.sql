-- =============================================
-- Optional: Row Level Security (RLS) Setup
-- =============================================
-- Uncomment and run these if you want to enable RLS
-- This is optional for this demo app

-- Enable RLS on all tables
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (read-only for products)
-- CREATE POLICY "Allow public read access on products" 
-- ON products FOR SELECT 
-- USING (true);

-- CREATE POLICY "Allow public insert access on orders" 
-- ON orders FOR INSERT 
-- WITH CHECK (true);

-- CREATE POLICY "Allow public insert access on logs" 
-- ON logs FOR INSERT 
-- WITH CHECK (true);

-- =============================================
-- Exporting Logs for IBM Data Prep Kit
-- =============================================
-- Use this query to export logs in a clean format
-- You can copy the results or use Supabase's export feature

SELECT 
    id,
    event_name,
    message,
    TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as timestamp
FROM logs
ORDER BY created_at DESC;

-- Export logs with additional filtering
SELECT 
    event_name,
    COUNT(*) as event_count,
    MIN(created_at) as first_occurrence,
    MAX(created_at) as last_occurrence
FROM logs
GROUP BY event_name
ORDER BY event_count DESC;

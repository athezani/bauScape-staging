-- ============================================
-- Rate Limits Table for Persistent Rate Limiting
-- ============================================
-- This table stores rate limit counters to prevent abuse

-- Create rate_limits table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL DEFAULT 1,
  reset_at BIGINT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on key for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits(key);

-- Create index on reset_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON public.rate_limits(reset_at);

-- Enable RLS on rate_limits (only service role can access)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can manage rate limits
CREATE POLICY "Service role only for rate limits"
ON public.rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to automatically cleanup expired rate limits
CREATE OR REPLACE FUNCTION cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE reset_at < EXTRACT(EPOCH FROM NOW()) * 1000;
END;
$$;

-- Optional: Create a cron job to run cleanup periodically (requires pg_cron extension)
-- This needs to be enabled manually in Supabase dashboard if desired
-- SELECT cron.schedule('cleanup-rate-limits', '*/5 * * * *', 'SELECT cleanup_expired_rate_limits()');

COMMENT ON TABLE public.rate_limits IS 'Stores rate limiting data for API endpoints';
COMMENT ON COLUMN public.rate_limits.key IS 'Composite key: endpoint:identifier';
COMMENT ON COLUMN public.rate_limits.count IS 'Number of requests in current window';
COMMENT ON COLUMN public.rate_limits.reset_at IS 'Unix timestamp (ms) when the window resets';


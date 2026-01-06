/**
 * Temporary Edge Function to add confirmation_email_sent column
 * This should be deleted after running once
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if column exists
    const { data: checkResult, error: checkError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'booking' 
          AND column_name = 'confirmation_email_sent'
        ) as exists;
      `,
    });

    if (checkError) {
      // Try direct SQL execution via Supabase client
      // Since we can't execute arbitrary SQL, we'll use a workaround
      // We'll try to query the column directly
      try {
        const { error: testError } = await supabase
          .from('booking')
          .select('confirmation_email_sent')
          .limit(1);

        if (testError && testError.code === '42703') {
          // Column doesn't exist, we need to add it
          // But we can't execute ALTER TABLE via REST API
          // So we'll return instructions
          return new Response(
            JSON.stringify({
              message: 'Column does not exist. Please run the migration SQL manually via Supabase Dashboard.',
              sql: `
-- Aggiungi colonna se non esiste
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'booking' 
    AND column_name = 'confirmation_email_sent'
  ) THEN
    ALTER TABLE public.booking 
    ADD COLUMN confirmation_email_sent BOOLEAN NOT NULL DEFAULT FALSE;
    
    CREATE INDEX IF NOT EXISTS idx_booking_confirmation_email_sent 
    ON public.booking(confirmation_email_sent) 
    WHERE confirmation_email_sent = FALSE;
  END IF;
END $$;

UPDATE public.booking 
SET confirmation_email_sent = TRUE 
WHERE confirmation_email_sent = FALSE 
AND status = 'confirmed'
AND created_at < NOW() - INTERVAL '1 hour';
              `,
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            }
          );
        }
      } catch (e) {
        // Error checking column
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Column may already exist. Check the database.',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});




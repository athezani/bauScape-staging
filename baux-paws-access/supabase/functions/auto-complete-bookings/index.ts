import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting auto-complete bookings job...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    // Use service role key to bypass RLS for system operation
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get today's date (beginning of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    console.log(`Checking for bookings to complete (end_date < ${todayStr})...`);

    // Find all confirmed bookings where end_date has passed
    const { data: bookingsToComplete, error: fetchError } = await supabase
      .from('booking')
      .select('id, product_name, customer_name, end_date')
      .eq('status', 'confirmed')
      .lt('end_date', todayStr);

    if (fetchError) {
      console.error('Error fetching bookings:', fetchError);
      throw fetchError;
    }

    if (!bookingsToComplete || bookingsToComplete.length === 0) {
      console.log('No bookings to complete');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No bookings to complete',
          completed: 0 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log(`Found ${bookingsToComplete.length} bookings to complete`);

    // Update all bookings to completed status
    const { data: updatedBookings, error: updateError } = await supabase
      .from('booking')
      .update({ status: 'completed' })
      .eq('status', 'confirmed')
      .lt('end_date', todayStr)
      .select('id');

    if (updateError) {
      console.error('Error updating bookings:', updateError);
      throw updateError;
    }

    console.log(`Successfully completed ${updatedBookings?.length || 0} bookings`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Completed ${updatedBookings?.length || 0} bookings`,
        completed: updatedBookings?.length || 0,
        bookings: bookingsToComplete.map(b => ({
          id: b.id,
          product_name: b.product_name,
          customer_name: b.customer_name,
          end_date: b.end_date
        }))
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in auto-complete-bookings function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
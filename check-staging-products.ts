import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = 'https://ilbbviadwedumvvwqqon.supabase.co';
  const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsYmJ2aWFkd2VkdW12dndxcW9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2Mzg4NjMsImV4cCI6MjA4MzIxNDg2M30.6CvZV598Yv4YD9tvEo5vIADzBDqynxd8X6SIciDBoGw';

  const supabase = createClient(url, anonKey);

  for (const table of ['experience', 'class', 'trip']) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(5);

    console.log(`\nTable ${table}:`);
    if (error) {
      console.error('  Error:', error.message, error.code);
    } else {
      console.log('  Rows:', data?.length ?? 0);
      if (data && data.length > 0) {
        console.log('  Sample:', data[0]);
      }
    }
  }
}

main().catch((err) => {
  console.error('Fatal error', err);
});

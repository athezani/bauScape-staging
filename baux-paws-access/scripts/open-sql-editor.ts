/**
 * Open Supabase SQL Editor with migration ready to paste
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATION_FILE = join(__dirname, '../supabase/migrations/20251229000000_create_product_images_table.sql');
const SQL_URL = 'https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new';

async function openEditor() {
  console.log('🚀 Opening Supabase SQL Editor...\n');
  
  const migrationSQL = readFileSync(MIGRATION_FILE, 'utf-8');
  
  console.log('📋 Migration SQL ready to paste:\n');
  console.log('='.repeat(60));
  console.log(migrationSQL);
  console.log('='.repeat(60));
  console.log('\n');
  
  // Try to open browser
  try {
    if (process.platform === 'darwin') {
      await execAsync(`open "${SQL_URL}"`);
      console.log('✅ Opened SQL Editor in browser\n');
    } else if (process.platform === 'linux') {
      await execAsync(`xdg-open "${SQL_URL}"`);
      console.log('✅ Opened SQL Editor in browser\n');
    } else if (process.platform === 'win32') {
      await execAsync(`start "${SQL_URL}"`);
      console.log('✅ Opened SQL Editor in browser\n');
    } else {
      console.log(`⚠️  Cannot auto-open browser on ${process.platform}\n`);
      console.log(`   Please open manually: ${SQL_URL}\n`);
    }
  } catch (error) {
    console.log(`⚠️  Could not open browser: ${error}\n`);
    console.log(`   Please open manually: ${SQL_URL}\n`);
  }
  
  console.log('📝 Instructions:');
  console.log('   1. SQL Editor should be open in your browser');
  console.log('   2. Copy the SQL above (from CREATE TABLE to the last COMMENT)');
  console.log('   3. Paste into the SQL Editor');
  console.log('   4. Click "Run" or press Cmd/Ctrl + Enter');
  console.log('   5. Verify success message\n');
  
  // Also copy to clipboard if possible
  try {
    if (process.platform === 'darwin') {
      const proc = exec(`echo "${migrationSQL.replace(/"/g, '\\"')}" | pbcopy`);
      console.log('✅ SQL copied to clipboard (macOS)\n');
    } else if (process.platform === 'linux') {
      const proc = exec(`echo "${migrationSQL.replace(/"/g, '\\"')}" | xclip -selection clipboard`);
      console.log('✅ SQL copied to clipboard (Linux)\n');
    } else if (process.platform === 'win32') {
      const proc = exec(`echo "${migrationSQL.replace(/"/g, '\\"')}" | clip`);
      console.log('✅ SQL copied to clipboard (Windows)\n');
    }
  } catch (error) {
    console.log('⚠️  Could not copy to clipboard\n');
  }
}

openEditor();


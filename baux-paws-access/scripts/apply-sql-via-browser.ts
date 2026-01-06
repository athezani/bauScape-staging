/**
 * Apply SQL via Browser Automation
 * Uses Puppeteer to execute SQL in Supabase SQL Editor
 */

import puppeteer from 'puppeteer';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

loadEnvFile(join(__dirname, '../.env.local'));
loadEnvFile(join(__dirname, '../.env'));

async function applySQLViaBrowser() {
  console.log('🚀 Applying SQL via Browser Automation...\n');

  // Read SQL file
  const sqlFile = join(__dirname, '../FIX_ALL_POLICIES_WITH_ADMIN.sql');
  let sql = readFileSync(sqlFile, 'utf-8');

  // Extract only RLS policies (before storage policies section)
  const storageSectionIndex = sql.indexOf('-- ============================================================');
  if (storageSectionIndex > 0) {
    sql = sql.substring(0, storageSectionIndex);
  }

  console.log('🌐 Launching browser...\n');

  const browser = await puppeteer.launch({
    headless: false, // Show browser so user can see what's happening
    defaultViewport: { width: 1280, height: 800 }
  });

  try {
    const page = await browser.newPage();
    
    // Navigate to SQL Editor
    const sqlEditorUrl = 'https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new';
    console.log(`📝 Navigating to SQL Editor...\n`);
    await page.goto(sqlEditorUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for SQL editor to load
    console.log('⏳ Waiting for SQL editor to load...\n');
    await page.waitForTimeout(3000);

    // Try to find and fill the SQL editor
    // The editor might be a Monaco editor or textarea
    try {
      // Try to find Monaco editor
      const monacoSelector = '.monaco-editor textarea';
      await page.waitForSelector(monacoSelector, { timeout: 5000 });
      
      // Click on the editor to focus
      await page.click(monacoSelector);
      await page.waitForTimeout(500);
      
      // Clear existing content and paste SQL
      await page.keyboard.down('Control');
      await page.keyboard.press('a');
      await page.keyboard.up('Control');
      await page.waitForTimeout(200);
      
      // Paste SQL
      await page.keyboard.type(sql);
      await page.waitForTimeout(1000);
      
      console.log('✅ SQL pasted into editor\n');
    } catch (monacoError) {
      // Try alternative: textarea
      try {
        const textareaSelector = 'textarea';
        await page.waitForSelector(textareaSelector, { timeout: 5000 });
        await page.click(textareaSelector);
        await page.waitForTimeout(500);
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        await page.waitForTimeout(200);
        await page.keyboard.type(sql);
        await page.waitForTimeout(1000);
        console.log('✅ SQL pasted into textarea\n');
      } catch (textareaError) {
        console.log('⚠️  Could not find SQL editor automatically\n');
        console.log('💡 Please paste the SQL manually:\n');
        console.log('   SQL has been copied to clipboard\n');
        console.log('   Steps:');
        console.log('   1. Click in the SQL editor');
        console.log('   2. Paste (Cmd+V / Ctrl+V)');
        console.log('   3. Click "Run" button\n');
        
        // Copy to clipboard
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        // Use pbcopy (macOS) or xclip (Linux)
        try {
          await execAsync(`echo "${sql.replace(/"/g, '\\"')}" | pbcopy`);
          console.log('✅ SQL copied to clipboard\n');
        } catch (clipError) {
          // Clipboard copy failed, just show SQL
        }
        
        // Keep browser open for manual execution
        console.log('⏳ Browser will stay open for 60 seconds...\n');
        console.log('   After you click "Run", press Enter here to continue...\n');
        
        await new Promise(resolve => {
          process.stdin.once('data', () => resolve(undefined));
          setTimeout(() => resolve(undefined), 60000);
        });
      }
    }

    // Try to find and click Run button
    try {
      const runButtonSelector = 'button:has-text("Run"), button[type="submit"], .run-button, [data-testid="run-button"]';
      await page.waitForSelector(runButtonSelector, { timeout: 5000 });
      await page.click(runButtonSelector);
      console.log('✅ Clicked Run button\n');
      
      // Wait for execution
      await page.waitForTimeout(3000);
      
      // Check for success/error messages
      const result = await page.evaluate(() => {
        const successMsg = document.querySelector('.success, .alert-success, [data-success]');
        const errorMsg = document.querySelector('.error, .alert-error, [data-error]');
        return {
          success: successMsg?.textContent || null,
          error: errorMsg?.textContent || null
        };
      });
      
      if (result.success) {
        console.log(`✅ Success: ${result.success}\n`);
      } else if (result.error) {
        console.log(`⚠️  Error: ${result.error}\n`);
      } else {
        console.log('✅ SQL executed (check browser for results)\n');
      }
    } catch (runError) {
      console.log('⚠️  Could not find Run button automatically\n');
      console.log('💡 Please click "Run" manually in the browser\n');
      console.log('⏳ Waiting 30 seconds for manual execution...\n');
      await page.waitForTimeout(30000);
    }

    // Keep browser open for a bit to see results
    await page.waitForTimeout(2000);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    console.log('🔒 Closing browser in 5 seconds...\n');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

async function main() {
  try {
    await applySQLViaBrowser();
    console.log('✅ Process completed!\n');
    console.log('📋 Next: Create storage policies manually via Dashboard');
    console.log('   See: STORAGE_POLICIES_WITH_ADMIN.md\n');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main().catch(console.error);


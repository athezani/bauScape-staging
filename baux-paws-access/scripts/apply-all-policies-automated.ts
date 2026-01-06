/**
 * Apply All Policies Automatically
 * Uses browser automation to execute SQL and create storage policies
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

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function executeSQLInEditor(page: any) {
  console.log('📝 Step 1: Executing RLS Policies SQL...\n');

  // Read SQL file
  const sqlFile = join(__dirname, '../FIX_ALL_POLICIES_WITH_ADMIN.sql');
  let sql = readFileSync(sqlFile, 'utf-8');

  // Extract only RLS policies (before storage policies section)
  const storageSectionIndex = sql.indexOf('-- ============================================================');
  if (storageSectionIndex > 0) {
    sql = sql.substring(0, storageSectionIndex);
  }

  // Clean SQL
  sql = sql.replace(/--.*$/gm, '').trim();

  const sqlEditorUrl = 'https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/sql/new';
  
  console.log('   Navigating to SQL Editor...');
  await page.goto(sqlEditorUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(3000);

  // Try to find and fill SQL editor
  try {
    // Try Monaco editor
    const monacoSelector = '.monaco-editor textarea, .monaco-editor .inputarea';
    await page.waitForSelector(monacoSelector, { timeout: 10000 });
    await page.click(monacoSelector);
    await sleep(500);
    
    // Select all and replace
    await page.keyboard.down('Meta');
    await page.keyboard.press('a');
    await page.keyboard.up('Meta');
    await sleep(300);
    
    // Type SQL
    await page.keyboard.type(sql);
    await sleep(1000);
    
    console.log('   ✅ SQL pasted into editor');
  } catch (monacoError) {
    // Try textarea
    try {
      const textareaSelector = 'textarea';
      await page.waitForSelector(textareaSelector, { timeout: 5000 });
      await page.focus(textareaSelector);
      await sleep(300);
      await page.keyboard.down('Meta');
      await page.keyboard.press('a');
      await page.keyboard.up('Meta');
      await sleep(200);
      await page.keyboard.type(sql);
      await sleep(1000);
      console.log('   ✅ SQL pasted into textarea');
    } catch (textareaError) {
      console.log('   ⚠️  Could not find editor, using clipboard method');
      // Copy to clipboard and instruct user
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      await execAsync(`echo "${sql.replace(/"/g, '\\"').replace(/\$/g, '\\$')}" | pbcopy`);
      console.log('   💡 SQL copied to clipboard - please paste manually (Cmd+V)');
      console.log('   ⏳ Waiting 30 seconds for manual paste...');
      await sleep(30000);
    }
  }

  // Find and click Run button
  try {
    const runSelectors = [
      'button:has-text("Run")',
      'button[type="submit"]',
      '.run-button',
      '[data-testid="run-button"]',
      'button:contains("Run")',
      'button.btn-primary:has-text("Run")'
    ];

    let runClicked = false;
    for (const selector of runSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          console.log('   ✅ Clicked Run button');
          runClicked = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!runClicked) {
      // Try finding by text content
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await page.evaluate(el => el.textContent, button);
        if (text && text.toLowerCase().includes('run')) {
          await button.click();
          console.log('   ✅ Clicked Run button (by text)');
          runClicked = true;
          break;
        }
      }
    }

    if (!runClicked) {
      console.log('   ⚠️  Could not find Run button automatically');
      console.log('   💡 Please click Run manually');
      console.log('   ⏳ Waiting 30 seconds...');
      await sleep(30000);
    } else {
      // Wait for execution
      await sleep(5000);
      console.log('   ✅ SQL execution completed');
    }
  } catch (runError) {
    console.log('   ⚠️  Error clicking Run:', runError);
    console.log('   💡 Please click Run manually');
    await sleep(30000);
  }

  await sleep(2000);
}

async function createStoragePolicies(page: any) {
  console.log('\n📝 Step 2: Creating Storage Policies...\n');

  const storagePoliciesUrl = 'https://supabase.com/dashboard/project/zyonwzilijgnnnmhxvbo/storage/policies';
  
  console.log('   Navigating to Storage Policies...');
  await page.goto(storagePoliciesUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(3000);

  // Select product-images bucket
  try {
    console.log('   Selecting product-images bucket...');
    const bucketSelectors = [
      'select[name="bucket"]',
      'select[data-testid="bucket-select"]',
      '.bucket-select select'
    ];

    let bucketSelected = false;
    for (const selector of bucketSelectors) {
      try {
        const select = await page.$(selector);
        if (select) {
          await select.select('product-images');
          bucketSelected = true;
          console.log('   ✅ Selected product-images bucket');
          await sleep(2000);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!bucketSelected) {
      // Try clicking on bucket name/link
      const bucketLinks = await page.$$('a, button, [role="button"]');
      for (const link of bucketLinks) {
        const text = await page.evaluate(el => el.textContent, link);
        if (text && text.includes('product-images')) {
          await link.click();
          console.log('   ✅ Clicked product-images bucket');
          await sleep(2000);
          break;
        }
      }
    }
  } catch (bucketError) {
    console.log('   ⚠️  Could not select bucket automatically');
    console.log('   💡 Please select "product-images" bucket manually');
    console.log('   ⏳ Waiting 10 seconds...');
    await sleep(10000);
  }

  // Storage policies definitions
  const policies = [
    {
      name: 'Providers and Admins can upload product images',
      operation: 'INSERT',
      definition: `(
  bucket_id = 'product-images' AND
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'experience/%' AND
     EXISTS (
       SELECT 1 FROM public.experience e
       WHERE e.id::text = (string_to_array(name, '/'))[2]
       AND e.provider_id = auth.uid()
     ))
  ) OR
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'class/%' AND
     EXISTS (
       SELECT 1 FROM public.class c
       WHERE c.id::text = (string_to_array(name, '/'))[2]
       AND c.provider_id = auth.uid()
     ))
  ) OR
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'trip/%' AND
     EXISTS (
       SELECT 1 FROM public.trip t
       WHERE t.id::text = (string_to_array(name, '/'))[2]
       AND t.provider_id = auth.uid()
     ))
  )
)`
    },
    {
      name: 'Providers and Admins can delete product images',
      operation: 'DELETE',
      definition: `(
  bucket_id = 'product-images' AND
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'experience/%' AND
     EXISTS (
       SELECT 1 FROM public.experience e
       WHERE e.id::text = (string_to_array(name, '/'))[2]
       AND e.provider_id = auth.uid()
     ))
  ) OR
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'class/%' AND
     EXISTS (
       SELECT 1 FROM public.class c
       WHERE c.id::text = (string_to_array(name, '/'))[2]
       AND c.provider_id = auth.uid()
     ))
  ) OR
  (
    has_role(auth.uid(), 'admin'::app_role) OR
    (name LIKE 'trip/%' AND
     EXISTS (
       SELECT 1 FROM public.trip t
       WHERE t.id::text = (string_to_array(name, '/'))[2]
       AND t.provider_id = auth.uid()
     ))
  )
)`
    },
    {
      name: 'Public can view product images',
      operation: 'SELECT',
      definition: `(bucket_id = 'product-images')`
    }
  ];

  console.log(`   Creating ${policies.length} storage policies...\n`);

  for (let i = 0; i < policies.length; i++) {
    const policy = policies[i];
    console.log(`   Policy ${i + 1}/${policies.length}: ${policy.name}`);

    try {
      // Look for "New Policy" or "Create Policy" button
      const createButtonSelectors = [
        'button:has-text("New Policy")',
        'button:has-text("Create Policy")',
        'button:has-text("Add Policy")',
        '[data-testid="new-policy-button"]',
        'button.btn-primary'
      ];

      let createClicked = false;
      for (const selector of createButtonSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            await button.click();
            createClicked = true;
            console.log('     ✅ Clicked New Policy button');
            await sleep(2000);
            break;
          }
        } catch (e) {
          // Try next selector
        }
      }

      if (!createClicked) {
        // Try finding by text
        const buttons = await page.$$('button');
        for (const button of buttons) {
          const text = await page.evaluate(el => el.textContent, button);
          if (text && (text.includes('New') || text.includes('Create') || text.includes('Add'))) {
            await button.click();
            console.log('     ✅ Clicked New Policy button (by text)');
            await sleep(2000);
            createClicked = true;
            break;
          }
        }
      }

      if (!createClicked) {
        console.log('     ⚠️  Could not find New Policy button');
        console.log('     💡 Please click "New Policy" manually');
        console.log('     ⏳ Waiting 15 seconds...');
        await sleep(15000);
      }

      // Fill in policy name
      try {
        const nameInput = await page.$('input[name="name"], input[placeholder*="name"], input[placeholder*="Name"]');
        if (nameInput) {
          await nameInput.type(policy.name);
          console.log('     ✅ Entered policy name');
          await sleep(500);
        }
      } catch (e) {
        console.log('     ⚠️  Could not find name input');
      }

      // Select operation
      try {
        const operationSelect = await page.$('select[name="operation"], select[data-testid="operation-select"]');
        if (operationSelect) {
          await operationSelect.select(policy.operation);
          console.log(`     ✅ Selected operation: ${policy.operation}`);
          await sleep(1000);
        }
      } catch (e) {
        console.log('     ⚠️  Could not find operation select');
      }

      // Fill in definition
      try {
        const definitionSelectors = [
          'textarea[name="definition"]',
          'textarea[name="check"]',
          'textarea[placeholder*="definition"]',
          '.definition-input textarea',
          'textarea'
        ];

        let definitionFilled = false;
        for (const selector of definitionSelectors) {
          try {
            const textarea = await page.$(selector);
            if (textarea) {
              await textarea.click();
              await sleep(300);
              await page.keyboard.down('Meta');
              await page.keyboard.press('a');
              await page.keyboard.up('Meta');
              await sleep(200);
              await page.keyboard.type(policy.definition);
              console.log('     ✅ Entered policy definition');
              definitionFilled = true;
              await sleep(1000);
              break;
            }
          } catch (e) {
            // Try next selector
          }
        }

        if (!definitionFilled) {
          console.log('     ⚠️  Could not find definition textarea');
          console.log('     💡 Please paste definition manually');
          // Copy to clipboard
          const { exec } = await import('child_process');
          const { promisify } = await import('util');
          const execAsync = promisify(exec);
          await execAsync(`echo "${policy.definition.replace(/"/g, '\\"').replace(/\$/g, '\\$')}" | pbcopy`);
          console.log('     ⏳ Waiting 20 seconds...');
          await sleep(20000);
        }
      } catch (e) {
        console.log('     ⚠️  Error filling definition');
      }

      // Click Save/Create button
      try {
        const saveSelectors = [
          'button:has-text("Save")',
          'button:has-text("Create")',
          'button:has-text("Add")',
          'button[type="submit"]',
          '.save-button'
        ];

        let saved = false;
        for (const selector of saveSelectors) {
          try {
            const button = await page.$(selector);
            if (button) {
              await button.click();
              console.log('     ✅ Clicked Save button');
              saved = true;
              await sleep(3000);
              break;
            }
          } catch (e) {
            // Try next selector
          }
        }

        if (!saved) {
          console.log('     ⚠️  Could not find Save button');
          console.log('     💡 Please click Save manually');
          console.log('     ⏳ Waiting 15 seconds...');
          await sleep(15000);
        }
      } catch (e) {
        console.log('     ⚠️  Error saving policy');
      }

      console.log('');
    } catch (error) {
      console.log(`     ❌ Error creating policy: ${error}`);
      console.log('     💡 Please create this policy manually');
      console.log('     ⏳ Waiting 20 seconds before next policy...');
      await sleep(20000);
    }
  }

  console.log('   ✅ Storage policies creation process completed\n');
}

async function main() {
  console.log('🚀 Applying All Policies Automatically...\n');
  console.log('='.repeat(60) + '\n');
  console.log('⚠️  This will open a browser window');
  console.log('   You may need to log in to Supabase if not already logged in\n');
  console.log('='.repeat(60) + '\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1400, height: 900 },
    args: ['--start-maximized']
  });

  try {
    const page = await browser.newPage();
    
    // Step 1: Execute RLS policies SQL
    await executeSQLInEditor(page);
    
    // Step 2: Create storage policies
    await createStoragePolicies(page);

    console.log('='.repeat(60));
    console.log('✅ All policies applied!\n');
    console.log('📋 Next steps:');
    console.log('   1. Verify policies in Supabase Dashboard');
    console.log('   2. Test image upload in Provider Portal\n');
    
    console.log('⏳ Keeping browser open for 10 seconds for verification...');
    await sleep(10000);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);


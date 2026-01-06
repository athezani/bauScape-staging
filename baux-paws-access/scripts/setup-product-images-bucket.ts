/**
 * Setup script for product-images bucket in Supabase Storage
 * Run this script to create the bucket if it doesn't exist
 */

import { supabase } from '../src/integrations/supabase/client';

const BUCKET_NAME = 'product-images';

async function setupBucket() {
  console.log(`🔍 Checking if bucket '${BUCKET_NAME}' exists...`);

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      process.exit(1);
    }

    const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);

    if (bucketExists) {
      console.log(`✅ Bucket '${BUCKET_NAME}' already exists`);
      
      // Check bucket settings
      const bucket = buckets?.find(b => b.name === BUCKET_NAME);
      console.log('📋 Bucket settings:', {
        name: bucket?.name,
        public: bucket?.public,
        fileSizeLimit: bucket?.file_size_limit,
        allowedMimeTypes: bucket?.allowed_mime_types,
      });
      
      return;
    }

    console.log(`📦 Creating bucket '${BUCKET_NAME}'...`);

    // Create bucket
    const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    });

    if (error) {
      console.error('❌ Error creating bucket:', error.message);
      process.exit(1);
    }

    console.log(`✅ Bucket '${BUCKET_NAME}' created successfully!`);
    console.log('📋 Bucket settings:', {
      name: data.name,
      public: data.public,
      fileSizeLimit: data.file_size_limit,
      allowedMimeTypes: data.allowed_mime_types,
    });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

setupBucket();


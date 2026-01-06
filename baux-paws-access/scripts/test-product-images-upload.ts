/**
 * Test script for product images upload
 * This script tests uploading images to products
 */

import { supabase } from '../src/integrations/supabase/client';
import { getProductImages, uploadProductImage } from '../src/services/productImages.service';

async function testProductImages() {
  console.log('🧪 Testing Product Images Upload...\n');

  try {
    // Get a sample product
    console.log('📋 Fetching sample products...');
    const { data: experiences, error: expError } = await supabase
      .from('experience')
      .select('id, name, provider_id')
      .eq('active', true)
      .limit(1);

    if (expError || !experiences || experiences.length === 0) {
      console.error('❌ No products found. Please create a product first.');
      process.exit(1);
    }

    const product = experiences[0];
    console.log(`✅ Found product: ${product.name} (${product.id})\n`);

    // Check existing images
    console.log('📸 Checking existing images...');
    const existingImages = await getProductImages(product.id, 'experience');
    console.log(`   Found ${existingImages.length} existing images\n`);

    if (existingImages.length >= 10) {
      console.log('⚠️  Product already has 10 images (maximum). Skipping upload.');
      console.log('   Images:', existingImages.map(img => img.image_url));
      return;
    }

    // Create a test image (1x1 pixel PNG)
    const testImageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const testImageBuffer = Buffer.from(testImageData, 'base64');
    const testImageBlob = new Blob([testImageBuffer], { type: 'image/png' });
    const testFile = new File([testImageBlob], 'test-image.png', { type: 'image/png' });

    // Upload test image
    console.log('📤 Uploading test image...');
    const uploadedImage = await uploadProductImage(
      product.id,
      'experience',
      testFile,
      existingImages.length
    );
    console.log(`✅ Image uploaded successfully!`);
    console.log(`   URL: ${uploadedImage.image_url}`);
    console.log(`   Display Order: ${uploadedImage.display_order}\n`);

    // Verify image was saved
    console.log('🔍 Verifying uploaded image...');
    const updatedImages = await getProductImages(product.id, 'experience');
    console.log(`✅ Total images: ${updatedImages.length}`);
    console.log('   Images:', updatedImages.map(img => ({
      id: img.id,
      url: img.image_url,
      order: img.display_order
    })));

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

testProductImages();


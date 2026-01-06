/**
 * Product Images Service
 * Handles upload, retrieval, deletion, and reordering of product images
 */

import { supabase } from '@/integrations/supabase/client';
import type { ProductType } from '@/types/product.types';
import { handleError, retryWithBackoff } from '@/utils/errorHandler';
import { isValidUUID } from '@/utils/validation';

export interface ProductImage {
  id: string;
  product_id: string;
  product_type: ProductType;
  image_url: string;
  display_order: number;
  created_at: string;
  updated_at: string;
}

const PRODUCT_IMAGES_BUCKET = 'product-images';
const MAX_IMAGES_PER_PRODUCT = 10;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Upload an image file to Supabase Storage and create a product_image record
 */
export async function uploadProductImage(
  productId: string,
  productType: ProductType,
  file: File,
  displayOrder: number
): Promise<ProductImage> {
  // Validate inputs
  if (!isValidUUID(productId)) {
    throw new Error('Product ID non valido');
  }

  if (!productType || (productType !== 'class' && productType !== 'experience' && productType !== 'trip')) {
    throw new Error('Tipo prodotto non valido');
  }

  if (!(file instanceof File)) {
    throw new Error('File non valido');
  }

  // Validate file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Tipo file non supportato. Usa JPEG, PNG o WebP');
  }

  // Validate file size
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`File troppo grande. Dimensione massima: ${MAX_IMAGE_SIZE / 1024 / 1024}MB`);
  }

  // Check current image count
  const currentImages = await getProductImages(productId, productType);
  if (currentImages.length >= MAX_IMAGES_PER_PRODUCT) {
    throw new Error(`Massimo ${MAX_IMAGES_PER_PRODUCT} immagini per prodotto`);
  }

  return retryWithBackoff(async () => {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${productType}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Errore durante l'upload: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('Errore durante il recupero dell\'URL pubblico');
    }

    // Create product_image record
    const { data: imageData, error: dbError } = await supabase
      .from('product_images')
      .insert({
        product_id: productId,
        product_type: productType,
        image_url: urlData.publicUrl,
        display_order: displayOrder
      })
      .select()
      .single();

    if (dbError) {
      // If database insert fails, try to delete the uploaded file
      await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .remove([filePath])
        .catch(() => {
          // Ignore cleanup errors
        });
      
      const appError = handleError(dbError, { 
        operation: 'uploadProductImage', 
        productId, 
        productType 
      });
      throw new Error(appError.userMessage);
    }

    return imageData as ProductImage;
  });
}

/**
 * Get all images for a product, ordered by display_order
 */
export async function getProductImages(
  productId: string,
  productType: ProductType
): Promise<ProductImage[]> {
  if (!isValidUUID(productId)) {
    throw new Error('Product ID non valido');
  }

  if (!productType || (productType !== 'class' && productType !== 'experience' && productType !== 'trip')) {
    throw new Error('Tipo prodotto non valido');
  }

  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
      .eq('product_type', productType)
      .order('display_order', { ascending: true });

    if (error) {
      const appError = handleError(error, { 
        operation: 'getProductImages', 
        productId, 
        productType 
      });
      throw new Error(appError.userMessage);
    }

    return (data || []) as ProductImage[];
  });
}

/**
 * Delete a product image
 */
export async function deleteProductImage(imageId: string): Promise<void> {
  if (!isValidUUID(imageId)) {
    throw new Error('Image ID non valido');
  }

  return retryWithBackoff(async () => {
    // First, get the image to get the file path
    const { data: imageData, error: fetchError } = await supabase
      .from('product_images')
      .select('*')
      .eq('id', imageId)
      .single();

    if (fetchError || !imageData) {
      throw new Error('Immagine non trovata');
    }

    const image = imageData as ProductImage;

    // Extract file path from URL
    // URL format: https://[project].supabase.co/storage/v1/object/public/product-images/[type]/[path]
    const urlParts = image.image_url.split('/');
    const publicIndex = urlParts.indexOf('public');
    if (publicIndex === -1 || publicIndex >= urlParts.length - 1) {
      throw new Error('URL immagine non valido');
    }

    const filePath = urlParts.slice(publicIndex + 1).join('/');

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove([filePath]);

    if (storageError) {
      console.warn('Errore durante la cancellazione del file da storage:', storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('product_images')
      .delete()
      .eq('id', imageId);

    if (dbError) {
      const appError = handleError(dbError, { 
        operation: 'deleteProductImage', 
        imageId 
      });
      throw new Error(appError.userMessage);
    }
  });
}

/**
 * Reorder product images
 */
export async function reorderProductImages(
  productId: string,
  productType: ProductType,
  imageOrders: Array<{ id: string; display_order: number }>
): Promise<void> {
  if (!isValidUUID(productId)) {
    throw new Error('Product ID non valido');
  }

  if (!productType || (productType !== 'class' && productType !== 'experience' && productType !== 'trip')) {
    throw new Error('Tipo prodotto non valido');
  }

  if (!Array.isArray(imageOrders) || imageOrders.length === 0) {
    throw new Error('Ordine immagini non valido');
  }

  return retryWithBackoff(async () => {
    // Update all images in a transaction-like manner
    const updates = imageOrders.map(({ id, display_order }) =>
      supabase
        .from('product_images')
        .update({ display_order })
        .eq('id', id)
        .eq('product_id', productId)
        .eq('product_type', productType)
    );

    const results = await Promise.all(updates);

    // Check for errors
    for (const result of results) {
      if (result.error) {
        const appError = handleError(result.error, { 
          operation: 'reorderProductImages', 
          productId, 
          productType 
        });
        throw new Error(appError.userMessage);
      }
    }
  });
}

/**
 * Get image count for a product
 */
export async function getProductImageCount(
  productId: string,
  productType: ProductType
): Promise<number> {
  const images = await getProductImages(productId, productType);
  return images.length;
}


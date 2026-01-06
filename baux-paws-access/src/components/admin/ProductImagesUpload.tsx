/**
 * Product Images Upload Component
 * Handles upload, display, reordering, and deletion of product images
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, X, GripVertical, Loader2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ProductType } from '@/types/product.types';
import { 
  uploadProductImage, 
  getProductImages, 
  deleteProductImage, 
  reorderProductImages,
  type ProductImage 
} from '@/services/productImages.service';

interface ProductImagesUploadProps {
  productId: string | null;
  productType: ProductType;
  isEditMode: boolean;
}

export function ProductImagesUpload({ 
  productId, 
  productType, 
  isEditMode 
}: ProductImagesUploadProps) {
  const { toast } = useToast();
  const [images, setImages] = useState<ProductImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX_IMAGES = 10;

  // Load images when productId is available
  useEffect(() => {
    if (productId && isEditMode) {
      loadImages();
    } else {
      setImages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, isEditMode, productType]);

  const loadImages = async () => {
    if (!productId) return;

    setIsLoading(true);
    try {
      const loadedImages = await getProductImages(productId, productType);
      setImages(loadedImages);
    } catch (error) {
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore nel caricamento delle immagini',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!productId) {
      toast({
        title: 'Errore',
        description: 'Salva prima il prodotto per caricare le immagini',
        variant: 'destructive',
      });
      return;
    }

    const fileArray = Array.from(files);
    const remainingSlots = MAX_IMAGES - images.length;

    if (fileArray.length > remainingSlots) {
      toast({
        title: 'Errore',
        description: `Puoi caricare massimo ${remainingSlots} immagine${remainingSlots > 1 ? 'i' : ''}`,
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    try {
      const uploadPromises = fileArray.map((file, index) => {
        const displayOrder = images.length + index;
        return uploadProductImage(productId, productType, file, displayOrder);
      });

      const uploadedImages = await Promise.all(uploadPromises);
      setImages([...images, ...uploadedImages]);
      
      toast({
        title: 'Successo',
        description: `${uploadedImages.length} immagine${uploadedImages.length > 1 ? 'i' : ''} caricata${uploadedImages.length > 1 ? 'e' : ''} con successo`,
      });
    } catch (error) {
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore durante l\'upload',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!productId) return;

    try {
      await deleteProductImage(imageId);
      setImages(images.filter(img => img.id !== imageId));
      toast({
        title: 'Successo',
        description: 'Immagine eliminata con successo',
      });
    } catch (error) {
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore durante l\'eliminazione',
        variant: 'destructive',
      });
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggedIndex === null || draggedIndex === dropIndex || !productId) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);

    // Update display_order for all images
    const imageOrders = newImages.map((img, index) => ({
      id: img.id,
      display_order: index
    }));

    try {
      await reorderProductImages(productId, productType, imageOrders);
      setImages(newImages);
      toast({
        title: 'Successo',
        description: 'Ordine immagini aggiornato',
      });
    } catch (error) {
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore durante il riordino',
        variant: 'destructive',
      });
      // Reload images on error
      loadImages();
    }

    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDropZone = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!productId) {
      toast({
        title: 'Errore',
        description: 'Salva prima il prodotto per caricare le immagini',
        variant: 'destructive',
      });
      return;
    }

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [productId, images.length, toast]);

  const handleDropZoneOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (!isEditMode || !productId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Upload Foto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Salva il prodotto per abilitare il caricamento delle immagini
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Upload Foto
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Carica da 1 a {MAX_IMAGES} immagini per questo prodotto. Trascina per riordinare.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Zone */}
        {images.length < MAX_IMAGES && (
          <div
            onDrop={handleDropZone}
            onDragOver={handleDropZoneOver}
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            {isUploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Caricamento in corso...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Clicca o trascina qui per caricare immagini
                </p>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG o WebP (max 5MB per immagine)
                </p>
                <p className="text-xs text-muted-foreground">
                  {images.length} / {MAX_IMAGES} immagini caricate
                </p>
              </div>
            )}
          </div>
        )}

        {/* Images Grid */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative group rounded-lg border-2 overflow-hidden bg-muted transition-all ${
                  draggedIndex === index
                    ? 'opacity-50 scale-95'
                    : dragOverIndex === index
                    ? 'border-primary scale-105'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <img
                  src={image.image_url}
                  alt={`Immagine ${index + 1}`}
                  className="w-full h-32 object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="%23ddd" width="100" height="100"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="12">Errore</text></svg>';
                  }}
                />
                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <GripVertical className="h-3 w-3" />
                  <span>{index + 1}</span>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(image.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nessuna immagine caricata. Carica la prima immagine per iniziare.
          </p>
        )}
      </CardContent>
    </Card>
  );
}


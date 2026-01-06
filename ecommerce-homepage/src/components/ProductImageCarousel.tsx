/**
 * Product Image Carousel Component
 * Displays product images with navigation arrows
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface ProductImageCarouselProps {
  mainImage: string;
  secondaryImages?: Array<{ id: string; url: string; display_order: number }>;
  productTitle: string;
}

export function ProductImageCarousel({ 
  mainImage, 
  secondaryImages = [], 
  productTitle 
}: ProductImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Combine main image with secondary images
  const allImages = [
    { id: 'main', url: mainImage, display_order: 0 },
    ...secondaryImages
  ].sort((a, b) => a.display_order - b.display_order);

  const totalImages = allImages.length;
  const hasMultipleImages = totalImages > 1;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalImages - 1;

  const goToPrevious = useCallback(() => {
    if (!canGoPrev) return;
    setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  }, [canGoPrev]);

  const goToNext = useCallback(() => {
    if (!canGoNext) return;
    setCurrentIndex((prevIndex) => Math.min(prevIndex + 1, totalImages - 1));
  }, [canGoNext, totalImages]);

  // Keyboard navigation
  useEffect(() => {
    if (!hasMultipleImages) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && canGoPrev) {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowRight' && canGoNext) {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasMultipleImages, goToPrevious, goToNext, canGoPrev, canGoNext]);

  // Prefetch adjacent images for instant navigation
  useEffect(() => {
    if (allImages.length <= 1) return;
    
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : null;
    const nextIndex = currentIndex < allImages.length - 1 ? currentIndex + 1 : null;
    
    [prevIndex, nextIndex].forEach(idx => {
      if (idx !== null) {
        const img = new Image();
        img.src = allImages[idx].url;
      }
    });
  }, [currentIndex, allImages]);

  // Touch/swipe support
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && canGoNext) {
      goToNext();
    } else if (isRightSwipe && canGoPrev) {
      goToPrevious();
    }
  };

  if (allImages.length === 0) {
    return null;
  }

  const currentImage = allImages[currentIndex];

  return (
    <div 
      className="relative w-full h-[400px] lg:h-[500px] bg-gray-200 rounded-3xl"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <ImageWithFallback 
        src={currentImage.url}
        alt={`${productTitle} - Immagine ${currentIndex + 1} di ${allImages.length}`}
        width={1200}
        height={500}
        className="w-full h-full transition-opacity duration-300 rounded-3xl"
        style={{ objectFit: 'contain' }}
        loading={currentIndex === 0 ? 'eager' : 'lazy'}
        fetchPriority={currentIndex === 0 ? 'high' : 'low'}
      />

      {/* Navigation Arrows */}
      {hasMultipleImages && (
        <>
          <button
            onClick={goToPrevious}
            disabled={!canGoPrev}
            className="rounded-full flex"
            aria-label="Immagine precedente"
            type="button"
            style={{ 
              position: 'absolute',
              top: '50%',
              left: '16px',
              transform: 'translateY(-50%)',
              width: '56px',
              height: '56px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              border: '3px solid #6B46C1',
              opacity: canGoPrev ? 1 : 0.5,
              cursor: canGoPrev ? 'pointer' : 'not-allowed',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s',
              pointerEvents: canGoPrev ? 'auto' : 'none'
            }}
            onMouseEnter={(e) => canGoPrev && (e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(-50%)')}
          >
            <img 
              src="/images/arrows/left_colour.png" 
              alt="" 
              style={{ 
                width: '32px',
                height: '32px',
                objectFit: 'contain',
                pointerEvents: 'none',
                filter: 'none'
              }}
            />
          </button>
          <button
            onClick={goToNext}
            disabled={!canGoNext}
            className="rounded-full flex"
            aria-label="Immagine successiva"
            type="button"
            style={{ 
              position: 'absolute',
              top: '50%',
              right: '16px',
              transform: 'translateY(-50%)',
              width: '56px',
              height: '56px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              border: '3px solid #6B46C1',
              opacity: canGoNext ? 1 : 0.5,
              cursor: canGoNext ? 'pointer' : 'not-allowed',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
              transition: 'all 0.2s',
              pointerEvents: canGoNext ? 'auto' : 'none'
            }}
            onMouseEnter={(e) => canGoNext && (e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(-50%)')}
          >
            <img 
              src="/images/arrows/right_colour.png" 
              alt="" 
              style={{ 
                width: '32px',
                height: '32px',
                objectFit: 'contain',
                pointerEvents: 'none',
                filter: 'none'
              }}
            />
          </button>
        </>
      )}

      {/* Image Indicators */}
      {hasMultipleImages && allImages.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-50">
          {allImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-2 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? 'bg-white w-8'
                  : 'bg-white/50 w-2 hover:bg-white/75'
              }`}
              aria-label={`Vai all'immagine ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Image Counter */}
      {hasMultipleImages && (
        <div 
          className="absolute top-4 right-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full z-50"
        >
          {currentIndex + 1} / {allImages.length}
        </div>
      )}
    </div>
  );
}


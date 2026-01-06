import React, { useState, useMemo } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

/**
 * Valida se un URL è valido per essere usato come src di un'immagine
 * Accetta immagini locali, data URLs, e URL esterni da Supabase Storage
 */
function isValidImageUrl(url: string | Blob | null | undefined): boolean {
  // Blob non è supportato come URL diretto, deve essere convertito in object URL
  if (url instanceof Blob) {
    return false;
  }
  
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }
  
  // Accetta data URLs (per placeholder SVG)
  if (url.startsWith('data:')) {
    return true;
  }
  
  // Accetta path relativi locali che iniziano con /
  if (url.startsWith('/')) {
    return true;
  }
  
  // Accetta URL esterni HTTPS (soprattutto per Supabase Storage)
  // Supabase Storage URLs sono sicuri e necessari per le immagini dei prodotti
  if (url.startsWith('https://')) {
    return true;
  }
  
  // Rifiuta HTTP non sicuro
  if (url.startsWith('http://')) {
    return false;
  }
  
  // Altri formati non supportati
  return false;
}

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement> & { width?: number; height?: number }) {
  const [didError, setDidError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  const handleError = () => {
    setDidError(true)
  }

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const { src, alt, style, className, loading = 'lazy', width = 800, height = 600, ...rest } = props

  // Ensure alt text is always provided for SEO
  const altText = alt || 'Immagine prodotto FlixDog'

  // Valida l'URL e usa placeholder se non valido
  const imageSrc = useMemo(() => {
    if (!isValidImageUrl(src)) {
      return ERROR_IMG_SRC;
    }
    // Se src è un Blob, convertilo in object URL (non supportato, usa placeholder)
    if (src instanceof Blob) {
      return ERROR_IMG_SRC;
    }
    return (src as string) || ERROR_IMG_SRC;
  }, [src]);

  // Se l'URL non è valido, mostra direttamente il placeholder
  if (!isValidImageUrl(src)) {
    const originalUrlString = src instanceof Blob ? '[Blob]' : (src || '[empty]');
    return (
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
        style={style}
        role="img"
        aria-label={altText}
      >
        <div className="flex items-center justify-center w-full h-full">
          <img 
            src={ERROR_IMG_SRC} 
            alt={altText} 
            width={width}
            height={height}
            {...rest} 
            data-original-url={originalUrlString}
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    );
  }

  const originalUrlString = src instanceof Blob ? '[Blob]' : (src || '[empty]');
  
  return didError ? (
    <div
      className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
      style={style}
      role="img"
      aria-label={altText}
    >
      <div className="flex items-center justify-center w-full h-full">
        <img 
          src={ERROR_IMG_SRC} 
          alt={altText} 
          width={width}
          height={height}
          {...rest} 
          data-original-url={originalUrlString}
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>
  ) : (
    <img 
      src={imageSrc} 
      alt={altText} 
      width={width}
      height={height}
      className={className} 
      style={style} 
      loading={loading}
      decoding="async"
      onError={handleError}
      onLoad={handleLoad}
      {...rest}
    />
  )
}

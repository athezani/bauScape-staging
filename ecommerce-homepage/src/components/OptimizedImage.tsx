import { ImgHTMLAttributes, useState, useEffect } from 'react';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> {
  alt: string;
  className?: string;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  sizes?: string;
  src: string;
  width?: number;
  height?: number;
  fetchPriority?: 'high' | 'low' | 'auto';
}

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==';

export function OptimizedImage({
  alt,
  className = '',
  fill = false,
  priority = false,
  src,
  width,
  height,
  fetchPriority = 'auto',
  ...rest
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImageSrc(src);
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  const handleError = () => {
    setHasError(true);
    setImageSrc(PLACEHOLDER_IMAGE);
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const loading = priority ? 'eager' : 'lazy';
  const decoding = priority ? 'sync' : 'async';

  if (fill) {
    return (
      <img
        src={imageSrc}
        alt={alt}
        width={width || 1920}
        height={height || 1080}
        className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        loading={loading}
        decoding={decoding}
        onError={handleError}
        onLoad={handleLoad}
        fetchPriority={fetchPriority}
        {...rest}
      />
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      width={width}
      height={height}
      loading={loading}
      decoding={decoding}
      onError={handleError}
      onLoad={handleLoad}
      fetchPriority={fetchPriority}
      {...rest}
    />
  );
}


import { OptimizedImage } from './OptimizedImage';

interface HeroProps {
  title: string;
  subtitle?: string;
  ctaText: string;
  onCtaClick?: () => void;
  imageUrl: string;
}

export function Hero({ title, subtitle, ctaText, onCtaClick, imageUrl }: HeroProps) {
  return (
    <section className="relative w-full">
      <style>{`
        .hero-image-mobile {
          object-position: right center;
          transform: scale(1.5);
        }
        @media (min-width: 1024px) {
          .hero-image-mobile {
            object-position: right center;
            transform: scale(1);
          }
        }
      `}</style>
      {/* Hero Image Container */}
      <div className="relative w-full h-[500px] lg:h-[600px] overflow-hidden">
        <OptimizedImage 
          src={imageUrl}
          alt="FlixDog - Avventure pet-friendly con il tuo cane"
          fill
          priority
          fetchPriority="high"
          className="object-cover hero-image-mobile"
          width={1920}
          height={600}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        
        {/* Content */}
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-[1200px] mx-auto w-full px-4 pb-12 lg:pb-16">
            <div className="max-w-xl">
              <h1 className="text-white mb-3 lg:text-5xl">
                {title}
              </h1>
              {subtitle && (
                <p className="text-white/90 mb-6 lg:text-xl">
                  {subtitle}
                </p>
              )}
              <button 
                onClick={onCtaClick}
                className="px-8 py-3 rounded-full font-semibold transition-all hover:translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ 
                  backgroundColor: 'var(--accent-orange)',
                  color: '#1A0841',
                  fontWeight: 700,
                  boxShadow: '0 10px 20px rgba(8, 2, 20, 0.4)'
                }}
              >
                {ctaText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { getAttributeInfo } from '../constants/productAttributes';

interface ProductAttributesProps {
  attributes?: string[];
  className?: string;
}

/**
 * Component to display product attributes as badges with images per attribute
 * Clean design with solid background color per type and white/dark text
 */
export function ProductAttributes({ attributes, className }: ProductAttributesProps) {
  if (!attributes || attributes.length === 0) {
    return null;
  }

  const styleByKey: Record<string, { bg: string; text: string }> = {
    sea: { bg: '#1d4ed8', text: '#ffffff' }, // blu
    mountain: { bg: '#a3e635', text: '#0f172a' }, // verde chiaro
    park: { bg: '#166534', text: '#ffffff' }, // verde scuro
    lake: { bg: '#0ea5e9', text: '#ffffff' }, // azzurro
    city: { bg: 'var(--primary-purple)', text: '#ffffff' }, // fallback per city
  };

  const imageByKey: Record<string, string> = {
    sea: '/images/attributes/mare.png',
    mountain: '/images/attributes/montagna.png',
    park: '/images/attributes/parco.png',
    lake: '/images/attributes/lago.webp',
  };

  return (
    <div className={`flex flex-wrap gap-3 ${className || ''}`}>
      {attributes.map((attrKey) => {
        const attrInfo = getAttributeInfo(attrKey);
        if (!attrInfo) {
          return null;
        }

        const colors = styleByKey[attrKey] || { bg: 'var(--primary-purple)', text: '#ffffff' };

        const imageUrl = imageByKey[attrKey];

        return (
          <div
            key={attrKey}
            className="inline-flex flex-row items-center justify-center gap-3 rounded-xl font-semibold transition-all hover:translate-y-0.5 cursor-default whitespace-nowrap flex-nowrap"
            style={{
              backgroundColor: colors.bg,
              color: colors.text,
              fontWeight: 700,
              padding: '11px 18px',
              display: 'inline-flex',
              flexDirection: 'row',
              flexWrap: 'nowrap',
            }}
          >
            {/* Image per attributo - sempre a sinistra */}
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={attrInfo.label}
                className="h-5 w-5 object-contain flex-shrink-0"
                style={{ display: 'block', flexShrink: 0 }}
              />
            ) : (
              <span className="text-base leading-none flex-shrink-0" style={{ flexShrink: 0 }}>
                {attrInfo.emoji}
              </span>
            )}
            
            {/* Label - sempre a destra dell'immagine */}
            <span className="text-sm flex-shrink-0" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
              {attrInfo.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}


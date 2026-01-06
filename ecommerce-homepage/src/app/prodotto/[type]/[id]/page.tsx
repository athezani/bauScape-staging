import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchProduct } from '@/lib/productServer';
import { ProductDetailPageClient } from '@/components/ProductDetailPageClient';
import type { ProductType } from '@/types/product';

interface ProductPageProps {
  params: Promise<{
    type: string;
    id: string;
  }>;
}

// Validate and normalize product type
function validateProductType(type: string): ProductType | null {
  if (type === 'experience' || type === 'class' || type === 'trip') {
    return type;
  }
  return null;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { type, id } = await params;
  const productType = validateProductType(type);
  
  if (!productType) {
    return {
      title: 'Prodotto non trovato - FlixDog',
    };
  }
  
  const { product, error } = await fetchProduct(id, productType);
  
  if (error || !product) {
    return {
      title: 'Prodotto non trovato - FlixDog',
    };
  }
  
  const productDescription = product.description || 
    (type === 'experience' 
      ? `Cosa fare con il cane? Scopri ${product.title}, un'esperienza unica per te e il tuo cane. Prenota online e vivi un'avventura indimenticabile insieme.`
      : type === 'trip'
      ? `Vacanze con il cane? Scopri ${product.title}, la destinazione perfetta per te e il tuo amico a quattro zampe. Prenota il tuo weekend o vacanza dog-friendly.`
      : `Corsi per cani? Scopri ${product.title}, il corso perfetto per educare e formare il tuo cane. Prenota online e migliora il rapporto con il tuo amico a quattro zampe.`);
  const productUrl = `https://flixdog.com/prodotto/${type}/${id}`;
  const productImage = product.imageUrl || 'https://flixdog.com/og-image.jpg';
  
  return {
    title: `${product.title} - Prenota Online | FlixDog`,
    description: productDescription,
    keywords: `${product.title}, ${product.category}, ${type === 'experience' ? 'cose da fare con il cane, attività con il cane, esperienze con cani' : type === 'trip' ? 'vacanze con il cane, weekend con cane, hotel dog friendly, viaggi con animali' : 'corsi per cani, addestramento cani, educazione cinofila'}, dog-friendly, pet-friendly, prenotazione online, FlixDog, attività dog-friendly italia`,
    authors: [{ name: 'FlixDog' }],
    alternates: {
      canonical: productUrl,
    },
    openGraph: {
      title: `${product.title} - FlixDog`,
      description: productDescription,
      images: [
        {
          url: productImage,
          width: 1200,
          height: 630,
          alt: product.title,
        },
      ],
      type: 'website',
      url: productUrl,
      locale: 'it_IT',
      siteName: 'FlixDog',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.title,
      description: productDescription,
      images: [productImage],
      site: '@flixdog_official',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export const revalidate = 60;

export default async function ProductPage({ params }: ProductPageProps) {
  try {
    const { type, id } = await params;
    const productType = validateProductType(type);
    
    if (!productType) {
      console.error(`[ProductPage] Invalid product type: ${type}`);
      notFound();
    }
    
    const { product, error } = await fetchProduct(id, productType);
    
    if (error) {
      console.error(`[ProductPage] Error fetching product: ${error}`, { id, type: productType });
      notFound();
    }
    
    if (!product) {
      console.error(`[ProductPage] Product not found`, { id, type: productType });
      notFound();
    }

  // Structured data for product page
  const productUrl = `https://flixdog.com/prodotto/${type}/${id}`;
  const productImage = product.imageUrl || 'https://flixdog.com/og-image.jpg';
  
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description || `Prenota ${product.title} per te e il tuo cane`,
    image: productImage,
    url: productUrl,
    brand: {
      '@type': 'Brand',
      name: 'FlixDog',
    },
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'EUR',
      price: product.price?.toString() || '0',
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'FlixDog',
      },
    },
    category: product.category,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <ProductDetailPageClient product={product} />
    </>
  );
  } catch (error) {
    console.error('[ProductPage] Unexpected error:', error);
    throw error; // Re-throw to show 500 error page
  }
}


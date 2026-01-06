'use client';

import { useEffect } from 'react';

interface StructuredDataProps {
  data: object;
}

/**
 * Component to inject JSON-LD structured data into the page
 * This helps search engines understand the content better
 */
export function StructuredData({ data }: StructuredDataProps) {
  useEffect(() => {
    // Remove any existing structured data script with the same type
    const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
    existingScripts.forEach((script) => {
      // Check if this script contains similar data (basic check)
      try {
        const existingData = JSON.parse(script.textContent || '{}');
        if (JSON.stringify(existingData) === JSON.stringify(data)) {
          script.remove();
        }
      } catch {
        // If parsing fails, keep the script
      }
    });

    // Create and inject new script
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    script.id = 'structured-data';
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      const scriptToRemove = document.getElementById('structured-data');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [data]);

  return null;
}


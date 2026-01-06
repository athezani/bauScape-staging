import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pagina non trovata - 404 | FlixDog',
  description: 'La pagina che stai cercando non esiste. Torna alla home o esplora le nostre esperienze dog-friendly.',
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-purple-50 to-white px-4">
      <div className="max-w-2xl text-center">
        {/* 404 Number */}
        <h1 className="mb-4 text-9xl font-bold text-purple-600">404</h1>
        
        {/* Main Message */}
        <h2 className="mb-4 text-3xl font-bold text-gray-900">
          Oops! Pagina non trovata
        </h2>
        
        <p className="mb-8 text-lg text-gray-600">
          La pagina che stai cercando non esiste o è stata spostata. 
          Non preoccuparti, possiamo aiutarti a trovare quello che cerchi!
        </p>

        {/* Helpful Links */}
        <div className="mb-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/"
            className="rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-700"
          >
            Torna alla Home
          </Link>
          
          <Link
            href="/esperienze"
            className="rounded-lg border-2 border-purple-600 px-6 py-3 font-semibold text-purple-600 transition-colors hover:bg-purple-50"
          >
            Esplora Esperienze
          </Link>
          
          <Link
            href="/viaggi"
            className="rounded-lg border-2 border-purple-600 px-6 py-3 font-semibold text-purple-600 transition-colors hover:bg-purple-50"
          >
            Scopri Viaggi
          </Link>
          
          <Link
            href="/contatti"
            className="rounded-lg border-2 border-purple-600 px-6 py-3 font-semibold text-purple-600 transition-colors hover:bg-purple-50"
          >
            Contattaci
          </Link>
        </div>

        {/* Additional Help */}
        <div className="rounded-lg bg-gray-50 p-6 text-left">
          <h3 className="mb-3 text-xl font-semibold text-gray-900">
            Cosa puoi fare:
          </h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start">
              <span className="mr-2 text-purple-600">•</span>
              <span>Verifica di aver digitato correttamente l&apos;indirizzo</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-purple-600">•</span>
              <span>Usa il menu di navigazione per trovare quello che cerchi</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-purple-600">•</span>
              <span>Esplora le nostre categorie: Esperienze, Viaggi o Classi</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-purple-600">•</span>
              <span>Contattaci se pensi che ci sia un problema</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}


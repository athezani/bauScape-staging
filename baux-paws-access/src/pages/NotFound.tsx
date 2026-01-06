import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white px-4">
      <div className="max-w-2xl text-center">
        {/* 404 Number */}
        <h1 className="mb-4 text-9xl font-bold text-gray-800">404</h1>
        
        {/* Main Message */}
        <h2 className="mb-4 text-3xl font-bold text-gray-900">
          Pagina non trovata
        </h2>
        
        <p className="mb-8 text-lg text-gray-600">
          La pagina che stai cercando non esiste o è stata spostata. 
          Ecco alcuni link utili per continuare:
        </p>

        {/* Helpful Links */}
        <div className="mb-8 flex flex-wrap justify-center gap-4">
          <Link
            to="/"
            className="rounded-lg bg-gray-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-gray-800"
          >
            Torna alla Home
          </Link>
          
          <Link
            to="/dashboard"
            className="rounded-lg border-2 border-gray-900 px-6 py-3 font-semibold text-gray-900 transition-colors hover:bg-gray-50"
          >
            Dashboard
          </Link>
          
          <Link
            to="/orders"
            className="rounded-lg border-2 border-gray-900 px-6 py-3 font-semibold text-gray-900 transition-colors hover:bg-gray-50"
          >
            Ordini
          </Link>
          
          <Link
            to="/analytics"
            className="rounded-lg border-2 border-gray-900 px-6 py-3 font-semibold text-gray-900 transition-colors hover:bg-gray-50"
          >
            Analytics
          </Link>
        </div>

        {/* Additional Help */}
        <div className="rounded-lg bg-gray-50 p-6 text-left">
          <h3 className="mb-3 text-xl font-semibold text-gray-900">
            Cosa puoi fare:
          </h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start">
              <span className="mr-2 text-gray-900">•</span>
              <span>Verifica di aver digitato correttamente l&apos;indirizzo</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-gray-900">•</span>
              <span>Usa il menu di navigazione per accedere alle sezioni principali</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-gray-900">•</span>
              <span>Torna alla Dashboard per vedere tutte le funzionalità disponibili</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2 text-gray-900">•</span>
              <span>Se pensi che ci sia un problema, contatta il supporto</span>
            </li>
          </ul>
        </div>

        {/* Error Info (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 rounded-lg bg-yellow-50 p-4 text-left">
            <p className="text-sm text-yellow-800">
              <strong>Route tentata:</strong> {location.pathname}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotFound;

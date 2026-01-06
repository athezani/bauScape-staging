import { forwardRef } from 'react';
import { Instagram, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer = forwardRef<HTMLElement>((props, ref) => {
  return (
    <footer ref={ref} className="bg-white border-t border-gray-100 py-12">
      <div className="max-w-[1200px] mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <Link to="/">
              <div className="mb-4 hover:opacity-70 transition-opacity cursor-pointer inline-flex items-center">
                <img
                  src="/flixdog-logo-dark.png"
                  alt="FlixDog"
                  className="h-8 w-auto"
                  loading="lazy"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </Link>
            <p style={{ color: 'var(--text-gray)' }}>
              Viaggi ed esperienze indimenticabili con il tuo cane
            </p>
          </div>

          {/* Links - Esplora */}
          <div>
            <h4 className="mb-4">
              Esplora
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/esperienze" className="hover:opacity-70 transition-opacity" style={{ color: 'var(--text-gray)' }}>
                  Esperienze
                </Link>
              </li>
              <li>
                <Link to="/viaggi" className="hover:opacity-70 transition-opacity" style={{ color: 'var(--text-gray)' }}>
                  Viaggi
                </Link>
              </li>
              <li>
                <Link to="/classi" className="hover:opacity-70 transition-opacity" style={{ color: 'var(--text-gray)' }}>
                  Classi
                </Link>
              </li>
            </ul>
          </div>

          {/* Links - Supporto */}
          <div>
            <h4 className="mb-4">
              Supporto
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/contatti" className="hover:opacity-70 transition-opacity" style={{ color: 'var(--text-gray)' }}>
                  Contatti
                </Link>
              </li>
              <li>
                <a 
                  href="https://www.iubenda.com/privacy-policy/54043784" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="iubenda-white iubenda-noiframe iubenda-embed iubenda-noiframe hover:opacity-70 transition-opacity" 
                  title="Privacy Policy"
                  style={{ color: 'var(--text-gray)' }}
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <Link 
                  to="/cookie-policy"
                  className="hover:opacity-70 transition-opacity" 
                  style={{ color: 'var(--text-gray)' }}
                >
                  Cookie Policy
                </Link>
              </li>
              <li>
                <a 
                  href="https://www.iubenda.com/privacy-policy/54043784/terms-and-conditions" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-70 transition-opacity" 
                  style={{ color: 'var(--text-gray)' }}
                >
                  Termini di Servizio
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h4 className="mb-4">
              Contattaci
            </h4>
            <div className="space-y-3 mb-4">
              <a 
                href="mailto:info@flixdog.com" 
                className="flex items-center gap-2 hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-gray)' }}
              >
                <Mail className="w-4 h-4" />
                <span className="text-sm">info@flixdog.com</span>
              </a>
            </div>

            {/* Social Icons */}
            <div className="flex items-center gap-3">
              <a 
                href="https://www.instagram.com/flixdog_official" 
                className="p-2 rounded-full hover:opacity-70 transition-all"
                style={{ backgroundColor: 'var(--accent-soft)' }}
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" style={{ color: 'var(--primary-purple)' }} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-100 text-center">
          <small style={{ color: 'var(--text-gray)' }}>
            © 2025 FlixDog. Tutti i diritti riservati.
          </small>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = 'Footer';

import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
  onNavigate?: (view: string) => void;
}

export function Header({ onMenuClick, onNavigate }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="max-w-[1200px] mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <button 
            onClick={onMenuClick}
            className="p-2 -ml-2 hover:bg-gray-50 rounded-lg transition-colors lg:hidden font-semibold"
            aria-label="Menu"
          >
            <Menu className="w-6 h-6" style={{ color: 'var(--primary-purple)' }} />
          </button>
          
          <button
            onClick={() => onNavigate?.('home')}
            className="flex items-center hover:opacity-80 transition-opacity"
            aria-label="FlixDog - Home"
          >
            <img
              src="/flixdog-logo-dark.png"
              alt="FlixDog"
              className="h-8 w-auto"
              loading="lazy"
              onError={(e) => {
                // If the logo image is missing, hide the broken image icon
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </button>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
          <button 
            onClick={() => onNavigate?.('home')}
            className="hover:opacity-70 transition-opacity font-semibold" 
            style={{ color: 'var(--text-dark)' }}
          >
            Home
          </button>
          <button 
            onClick={() => onNavigate?.('experiences')}
            className="hover:opacity-70 transition-opacity font-semibold" 
            style={{ color: 'var(--text-dark)' }}
          >
            Esperienze
          </button>
          <button 
            onClick={() => onNavigate?.('trips')}
            className="hover:opacity-70 transition-opacity font-semibold" 
            style={{ color: 'var(--text-dark)' }}
          >
            Viaggi
          </button>
          <button 
            onClick={() => onNavigate?.('contacts')}
            className="hover:opacity-70 transition-opacity font-semibold" 
            style={{ color: 'var(--text-dark)' }}
          >
            Contatti
          </button>
        </nav>
      </div>
    </header>
  );
}
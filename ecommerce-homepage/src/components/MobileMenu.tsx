import { X } from 'lucide-react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: string) => void;
}

export function MobileMenu({ isOpen, onClose, onNavigate }: MobileMenuProps) {
  if (!isOpen) return null;

  const handleNavigation = (view: string) => {
    onNavigate?.(view);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 lg:hidden"
        onClick={onClose}
      />
      
      {/* Menu Panel */}
      <div className="fixed top-0 left-0 bottom-0 w-[280px] bg-white z-50 shadow-xl lg:hidden">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <img
                src="/flixdog-logo-dark.png"
                alt="FlixDog"
                className="h-7 w-auto"
                loading="lazy"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-50 rounded-lg transition-colors font-semibold"
              aria-label="Chiudi menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            <button 
              onClick={() => handleNavigation('home')}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              style={{ color: 'var(--text-dark)' }}
            >
              Home
            </button>
            <button 
              onClick={() => handleNavigation('experiences')}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              style={{ color: 'var(--text-dark)' }}
            >
              Esperienze
            </button>
            <button 
              onClick={() => handleNavigation('trips')}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              style={{ color: 'var(--text-dark)' }}
            >
              Viaggi
            </button>
            <button 
              onClick={() => handleNavigation('contacts')}
              className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              style={{ color: 'var(--text-dark)' }}
            >
              Contatti
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}
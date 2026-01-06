'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from './Header';
import { FooterNext } from './FooterNext';
import { MobileMenu } from './MobileMenu';
import { Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { getSupabaseConfig } from '../utils/env';
import { logger } from '../utils/logger';

export function ContattiPageClient() {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    email: '',
    messaggio: ''
  });

  const handleNavigate = (view: string) => {
    if (view === 'home') {
      router.push('/');
    } else if (view === 'experiences') {
      router.push('/esperienze');
    } else if (view === 'trips') {
      router.push('/viaggi');
    } else if (view === 'classes') {
      router.push('/classi');
    } else if (view === 'contacts') {
      router.push('/contatti');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Reset status when user starts typing again
    if (submitStatus !== 'idle') {
      setSubmitStatus('idle');
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      // Get Supabase config
      const supabaseConfig = getSupabaseConfig();
      
      // Call Supabase Edge Function to send email
      const functionsUrl = `${supabaseConfig.url.replace(/\/$/, '')}/functions/v1/send-contact-email`;
      
      logger.debug('Sending contact email', {
        nome: formData.nome,
        email: formData.email,
      });

      const response = await fetch(functionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseConfig.anonKey}`,
          'apikey': supabaseConfig.anonKey,
        },
        body: JSON.stringify({
          nome: formData.nome.trim(),
          cognome: formData.cognome.trim(),
          email: formData.email.trim(),
          messaggio: formData.messaggio.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Errore durante l\'invio dell\'email');
      }

      // Success
      setSubmitStatus('success');
      
      // Reset form
      setFormData({
        nome: '',
        cognome: '',
        email: '',
        messaggio: ''
      });

      // Scroll to top to show success message
      window.scrollTo({ top: 0, behavior: 'smooth' });

      logger.debug('Contact email sent successfully');
    } catch (error) {
      logger.error('Error sending contact email', error);
      setSubmitStatus('error');
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : 'Si è verificato un errore durante l\'invio. Riprova più tardi.'
      );
      
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.nome.trim() !== '' && 
                     formData.cognome.trim() !== '' && 
                     formData.email.trim() !== '' && 
                     formData.messaggio.trim() !== '';

  return (
    <div className="min-h-screen bg-white">
      <Header 
        onMenuClick={() => setIsMenuOpen(true)}
        onNavigate={handleNavigate}
      />
      <MobileMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)}
        onNavigate={handleNavigate}
      />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--text-dark)' }}>
          Contatti
        </h1>
        
        <p className="text-lg mb-8" style={{ color: 'var(--text-gray)' }}>
          Hai domande o vuoi saperne di più? Siamo qui per aiutarti!
        </p>

        {/* Success Message */}
        {submitStatus === 'success' && (
          <div className="mb-8 p-4 rounded-lg border-2 border-green-500 bg-green-50 flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-800 mb-1">Messaggio inviato con successo!</h3>
              <p className="text-sm text-green-700">
                Grazie per averci contattato. Ti risponderemo il prima possibile all'indirizzo email che hai fornito.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {submitStatus === 'error' && (
          <div className="mb-8 p-4 rounded-lg border-2 border-red-500 bg-red-50 flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800 mb-1">Errore durante l'invio</h3>
              <p className="text-sm text-red-700">
                {errorMessage || 'Si è verificato un errore. Riprova più tardi o contattaci direttamente all\'indirizzo email indicato.'}
              </p>
            </div>
          </div>
        )}

        {/* Email di contatto */}
        <div className="mb-12 p-6 rounded-lg" style={{ backgroundColor: 'var(--accent-soft)' }}>
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-5 h-5" style={{ color: 'var(--primary-purple)' }} />
            <h2 className="text-xl font-semibold" style={{ color: 'var(--text-dark)' }}>
              Email di contatto
            </h2>
          </div>
          <a 
            href="mailto:info@flixdog.com"
            className="text-lg hover:opacity-70 transition-opacity"
            style={{ color: 'var(--primary-purple)' }}
          >
            info@flixdog.com
          </a>
        </div>

        {/* Form di contatto */}
        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--text-dark)' }}>
            Invia un messaggio
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label 
                  htmlFor="nome" 
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-dark)' }}
                >
                  Nome *
                </label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  style={{ color: 'var(--text-dark)' }}
                  placeholder="Il tuo nome"
                />
              </div>
              
              <div>
                <label 
                  htmlFor="cognome" 
                  className="block text-sm font-medium mb-2"
                  style={{ color: 'var(--text-dark)' }}
                >
                  Cognome *
                </label>
                <input
                  type="text"
                  id="cognome"
                  name="cognome"
                  value={formData.cognome}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  style={{ color: 'var(--text-dark)' }}
                  placeholder="Il tuo cognome"
                />
              </div>
            </div>

            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-dark)' }}
              >
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                style={{ color: 'var(--text-dark)' }}
                placeholder="la-tua-email@esempio.com"
              />
            </div>

            <div>
              <label 
                htmlFor="messaggio" 
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-dark)' }}
              >
                Messaggio *
              </label>
              <textarea
                id="messaggio"
                name="messaggio"
                value={formData.messaggio}
                onChange={handleInputChange}
                required
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                style={{ color: 'var(--text-dark)' }}
                placeholder="Scrivi qui il tuo messaggio..."
              />
            </div>

            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full md:w-auto px-8 py-3 rounded-full font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 flex items-center justify-center gap-2"
              style={{ 
                backgroundColor: (isFormValid && !isSubmitting) ? '#F8AA5C' : '#ccc',
                color: '#1A0841'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                'Invia messaggio'
              )}
            </button>
          </form>
        </div>
      </div>

      <FooterNext />
    </div>
  );
}


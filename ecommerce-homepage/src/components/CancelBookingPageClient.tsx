'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface CancelBookingPageClientProps {
  token: string;
}

export default function CancelBookingPageClient({ token }: CancelBookingPageClientProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Configurazione non valida');
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-cancellation-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({
            token,
            reason: reason.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Errore durante la richiesta di cancellazione');
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting cancellation request:', err);
      setError(err instanceof Error ? err.message : 'Errore durante la richiesta');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              <CardTitle>Richiesta Inviata</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              La tua richiesta di cancellazione è stata inviata con successo.
            </p>
            <p className="text-gray-600">
              Riceverai una risposta via email entro 3 giorni lavorativi.
            </p>
            <Button
              onClick={() => window.location.href = '/'}
              className="w-full"
            >
              Torna alla Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Richiedi Cancellazione</CardTitle>
          <CardDescription>
            Compila il modulo per richiedere la cancellazione della tua prenotazione
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label htmlFor="reason" className="text-sm font-medium">
                Motivo della cancellazione (opzionale)
              </label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Inserisci il motivo della cancellazione..."
                rows={4}
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Fornire un motivo può aiutarci a elaborare più velocemente la tua richiesta
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                La tua richiesta verrà valutata in base alla policy di cancellazione del prodotto.
                Riceverai una risposta via email entro 3 giorni lavorativi.
              </AlertDescription>
            </Alert>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                'Invia Richiesta'
              )}
            </Button>

            <p className="text-xs text-center text-gray-500">
              Hai perso l'email di conferma?{' '}
              <a href="/cancellation-request" className="text-blue-600 hover:underline">
                Usa il modulo manuale
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


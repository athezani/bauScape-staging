'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function CancellationRequestPageClient() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!orderNumber.trim() || !email.trim() || !name.trim()) {
      setError('Tutti i campi obbligatori devono essere compilati');
      setLoading(false);
      return;
    }

    if (!email.includes('@')) {
      setError('Inserisci un indirizzo email valido');
      setLoading(false);
      return;
    }

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
            orderNumber: orderNumber.trim(),
            customerEmail: email.trim().toLowerCase(),
            customerName: name.trim(),
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
            Compila il modulo con i dati della tua prenotazione
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
              <label htmlFor="orderNumber" className="text-sm font-medium">
                Numero Ordine <span className="text-red-500">*</span>
              </label>
              <Input
                id="orderNumber"
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                placeholder="Es: A0GWPTWH"
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Trovi il numero ordine nell'email di conferma
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tua@email.com"
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                L'email usata per la prenotazione
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mario Rossi"
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500">
                Il nome usato per la prenotazione
              </p>
            </div>

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
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


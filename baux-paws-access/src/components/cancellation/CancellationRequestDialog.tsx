import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, 
  Mail, 
  Euro, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock,
  AlertCircle,
  Info
} from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CancellationRequest {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_at: string;
  processed_at: string | null;
  admin_notes: string | null;
  booking: {
    id: string;
    booking_date: string;
    trip_end_date: string | null;
    product_name: string;
    total_amount_paid: number;
    cancellation_policy?: string;
  };
}

interface CancellationRequestDialogProps {
  request: CancellationRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcessed?: () => void;
}

export const CancellationRequestDialog = ({
  request,
  open,
  onOpenChange,
  onProcessed,
}: CancellationRequestDialogProps) => {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  if (!request) return null;

  const handleProcess = async (actionType: 'approve' | 'reject') => {
    if (!request || request.status !== 'pending') return;

    setAction(actionType);
    setProcessing(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-process-cancellation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          requestId: request.id,
          action: actionType,
          adminEmail: (await supabase.auth.getUser()).data.user?.email || '',
          adminNotes: adminNotes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Errore durante la processazione');
      }

      toast({
        title: actionType === 'approve' ? 'Cancellazione approvata' : 'Cancellazione rifiutata',
        description: data.message || 'La richiesta è stata processata con successo.',
      });

      onProcessed?.();
      onOpenChange(false);
      setAdminNotes('');
      setAction(null);
    } catch (error) {
      toast({
        title: 'Errore',
        description: error instanceof Error ? error.message : 'Errore durante la processazione della richiesta.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const isPending = request.status === 'pending';
  const isApproved = request.status === 'approved';
  const isRejected = request.status === 'rejected';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">Richiesta di Cancellazione</DialogTitle>
              <DialogDescription>
                Ordine: {request.order_number}
              </DialogDescription>
            </div>
            <Badge
              variant={
                isPending
                  ? 'default'
                  : isApproved
                  ? 'default'
                  : 'secondary'
              }
              className={
                isPending
                  ? 'bg-warning/10 text-warning border-warning/20'
                  : isApproved
                  ? 'bg-success/10 text-success border-success/20'
                  : 'bg-destructive/10 text-destructive border-destructive/20'
              }
            >
              {isPending && (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  In attesa
                </>
              )}
              {isApproved && (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Approvata
                </>
              )}
              {isRejected && (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  Rifiutata
                </>
              )}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Customer Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Info className="h-4 w-4" />
              Informazioni Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <div className="text-sm font-medium">{request.customer_name}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </Label>
                <div className="text-sm">{request.customer_email}</div>
              </div>
            </div>
          </div>

          {/* Booking Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dettagli Prenotazione
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Prodotto</Label>
                <div className="text-sm font-medium">{request.booking.product_name}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Data</Label>
                <div className="text-sm">
                  {format(new Date(request.booking.booking_date), 'EEEE dd MMMM yyyy', { locale: it })}
                  {request.booking.trip_end_date && (
                    <span>
                      {' - '}
                      {format(new Date(request.booking.trip_end_date), 'dd MMMM yyyy', { locale: it })}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Euro className="h-3 w-3" />
                  Importo
                </Label>
                <div className="text-sm font-medium">
                  €{request.booking.total_amount_paid.toFixed(2)}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Richiesta il</Label>
                <div className="text-sm">
                  {format(new Date(request.requested_at), 'dd MMMM yyyy HH:mm', { locale: it })}
                </div>
              </div>
            </div>
          </div>

          {/* Cancellation Policy */}
          {request.booking.cancellation_policy && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-semibold text-sm">Policy di Cancellazione:</div>
                  <div className="text-sm whitespace-pre-line">
                    {request.booking.cancellation_policy}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Customer Reason */}
          {request.reason && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Motivazione Cliente
              </h3>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-line">{request.reason}</p>
              </div>
            </div>
          )}

          {/* Admin Notes (if processed) */}
          {request.admin_notes && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Note Admin</h3>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-line">{request.admin_notes}</p>
              </div>
            </div>
          )}

          {/* Processing Form (only if pending) */}
          {isPending && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="admin-notes">Note (opzionale)</Label>
                <Textarea
                  id="admin-notes"
                  placeholder="Aggiungi note per il cliente..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={processing}
                >
                  Annulla
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleProcess('reject')}
                  disabled={processing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rifiuta
                </Button>
                <Button
                  onClick={() => handleProcess('approve')}
                  disabled={processing}
                >
                  {processing && action === 'approve' ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                      Approvazione...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approva
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Processed Info */}
          {!isPending && request.processed_at && (
            <Alert variant={isApproved ? 'default' : 'destructive'}>
              {isApproved ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-1">
                  <div className="font-semibold">
                    {isApproved ? 'Cancellazione approvata' : 'Cancellazione rifiutata'}
                  </div>
                  <div className="text-sm">
                    Processata il: {format(new Date(request.processed_at), 'dd MMMM yyyy HH:mm', { locale: it })}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};


import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CancellationRequestDialog } from "./CancellationRequestDialog";

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

interface CancellationRequestsListProps {
  providerId: string;
}

export const CancellationRequestsList = ({ providerId }: CancellationRequestsListProps) => {
  const [requests, setRequests] = useState<CancellationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CancellationRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        // First, get all bookings for this provider
        const { data: bookings, error: bookingsError } = await supabase
          .from('booking')
          .select('id')
          .eq('provider_id', providerId);

        if (bookingsError) {
          console.error('Error fetching bookings:', bookingsError);
          return;
        }

        if (!bookings || bookings.length === 0) {
          setRequests([]);
          setLoading(false);
          return;
        }

        const bookingIds = bookings.map(b => b.id);

        // Then fetch cancellation requests for those bookings
        const { data, error } = await supabase
          .from('cancellation_request')
          .select(`
            *,
            booking:booking_id (
              id,
              booking_date,
              trip_end_date,
              product_name,
              total_amount_paid,
              provider_id,
              cancellation_policy
            )
          `)
          .in('booking_id', bookingIds)
          .in('status', ['pending', 'approved', 'rejected'])
          .order('requested_at', { ascending: false });

        if (error) {
          console.error('Error fetching cancellation requests:', error);
          return;
        }

        // Filter to only include requests where booking exists
        const filtered = (data || []).filter((req: any) => 
          req.booking && req.booking.provider_id === providerId
        ) as CancellationRequest[];

        setRequests(filtered);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();

    // Refresh every 30 seconds
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, [providerId]);

  const handleRequestClick = (request: CancellationRequest) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  };

  const handleRequestProcessed = () => {
    // Refresh the list
    const fetchRequests = async () => {
      const { data } = await supabase
        .from('cancellation_request')
        .select(`
          *,
          booking:booking_id (
            id,
            booking_date,
            trip_end_date,
            product_name,
            total_amount_paid,
            provider_id
          )
        `)
        .eq('booking.provider_id', providerId)
        .in('status', ['pending', 'approved', 'rejected'])
        .order('requested_at', { ascending: false });

      if (data) {
        const filtered = (data || []).filter((req: any) => 
          req.booking && req.booking.provider_id === providerId
        ) as CancellationRequest[];
        setRequests(filtered);
      }
    };
    fetchRequests();
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Richieste di Cancellazione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nessuna richiesta di cancellazione al momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Richieste di Cancellazione
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingCount} in attesa
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handleRequestClick(request)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        Ordine: {request.order_number}
                      </span>
                      <Badge
                        variant={
                          request.status === 'pending'
                            ? 'default'
                            : request.status === 'approved'
                            ? 'default'
                            : 'secondary'
                        }
                        className={
                          request.status === 'pending'
                            ? 'bg-warning/10 text-warning border-warning/20'
                            : request.status === 'approved'
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-destructive/10 text-destructive border-destructive/20'
                        }
                      >
                        {request.status === 'pending' && (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            In attesa
                          </>
                        )}
                        {request.status === 'approved' && (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Approvata
                          </>
                        )}
                        {request.status === 'rejected' && (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Rifiutata
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <div>Cliente: {request.customer_name}</div>
                      <div>Prodotto: {request.booking.product_name}</div>
                      <div>
                        Data: {format(new Date(request.booking.booking_date), 'dd MMMM yyyy', { locale: it })}
                      </div>
                      <div>
                        Richiesta: {format(new Date(request.requested_at), 'dd MMM yyyy HH:mm', { locale: it })}
                      </div>
                    </div>
                  </div>
                  {request.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestClick(request);
                      }}
                    >
                      Gestisci
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <CancellationRequestDialog
        request={selectedRequest}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onProcessed={handleRequestProcessed}
      />
    </>
  );
};


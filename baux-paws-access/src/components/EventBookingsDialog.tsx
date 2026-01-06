import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Calendar, Clock, Mail, Phone, PawPrint, Users, MessageSquare } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  event_type: 'class' | 'experience' | 'trip';
  event_id: string;
  booking_date: string;
  end_date: string | null;
  booking_time: string | null;
  number_of_dogs: number;
  number_of_humans: number;
  total_amount: number | null;
  status: string;
  special_requests: string | null;
  shopify_order_id: string | null;
  created_at: string;
}

interface EventBookingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName: string;
  bookings: Booking[];
}

const statusColors = {
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-success/10 text-success border-success/20",
  completed: "bg-info/10 text-info border-info/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabels = {
  pending: "In attesa",
  confirmed: "Confermato",
  completed: "Completato",
  cancelled: "Cancellato",
};

export const EventBookingsDialog = ({ 
  open, 
  onOpenChange, 
  eventName,
  bookings 
}: EventBookingsDialogProps) => {
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    setUpdatingId(bookingId);
    
    // Validate status transition server-side
    const { data: isValid, error: validationError } = await supabase
      .rpc('validate_booking_status_change', {
        _booking_id: bookingId,
        _new_status: newStatus
      });

    if (validationError || !isValid) {
      toast({
        title: "Errore",
        description: "Transizione di stato non valida. Verifica lo stato attuale della prenotazione.",
        variant: "destructive",
      });
      setUpdatingId(null);
      return;
    }

    const { error } = await supabase
      .from("booking")
      .update({ status: newStatus })
      .eq("id", bookingId);

    if (error) {
      toast({
        title: "Errore nell'aggiornamento",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Stato aggiornato",
        description: `Lo stato della prenotazione è stato cambiato in ${statusLabels[newStatus as keyof typeof statusLabels]}`,
      });
    }
    setUpdatingId(null);
  };

  // Sort bookings: pending first, then by date
  const sortedBookings = [...bookings].sort((a, b) => {
    if (a.status === "pending" && b.status !== "pending") return -1;
    if (a.status !== "pending" && b.status === "pending") return 1;
    return new Date(a.booking_date).getTime() - new Date(b.booking_date).getTime();
  });

  const totalHumans = bookings.reduce((sum, b) => sum + b.number_of_humans, 0);
  const totalDogs = bookings.reduce((sum, b) => sum + b.number_of_dogs, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {eventName}
          </DialogTitle>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
            <div>📋 {bookings.length} {bookings.length === 1 ? 'prenotazione' : 'prenotazioni'}</div>
            <div>👥 {totalHumans} {totalHumans === 1 ? 'adulto' : 'adulti'}</div>
            <div>🐕 {totalDogs} {totalDogs === 1 ? 'cane' : 'cani'}</div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {sortedBookings.map((booking) => (
            <Card key={booking.id} className="p-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {booking.customer_name}
                      </h4>
                    </div>
                    <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
                      {statusLabels[booking.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>

                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <a href={`mailto:${booking.customer_email}`} className="hover:text-primary">
                        {booking.customer_email}
                      </a>
                    </div>
                    {booking.customer_phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${booking.customer_phone}`} className="hover:text-primary">
                          {booking.customer_phone}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(booking.booking_date), "dd MMM yyyy", { locale: it })}
                        {booking.end_date && booking.event_type === 'trip' && (
                          <> - {format(new Date(booking.end_date), "dd MMM yyyy", { locale: it })}</>
                        )}
                      </span>
                    </div>
                    {booking.booking_time && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{booking.booking_time.slice(0, 5)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <PawPrint className="h-4 w-4" />
                      <span>{booking.number_of_dogs}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{booking.number_of_humans}</span>
                    </div>
                  </div>

                  {booking.special_requests && (
                    <div className="flex items-start gap-2 text-sm p-3 bg-muted rounded-lg">
                      <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="font-medium text-foreground mb-1">Richieste speciali:</p>
                        <p className="text-muted-foreground">{booking.special_requests}</p>
                      </div>
                    </div>
                  )}

                  {booking.total_amount && (
                    <div className="text-base font-semibold text-foreground">
                      €{booking.total_amount.toFixed(2)}
                    </div>
                  )}
                </div>

                <div className="flex lg:flex-col gap-2">
                  {booking.status === "pending" && (
                    <Button
                      onClick={() => handleStatusUpdate(booking.id, "confirmed")}
                      disabled={updatingId === booking.id}
                      size="sm"
                      className="flex-1 lg:flex-none"
                    >
                      Conferma
                    </Button>
                  )}
                  {(booking.status === "pending" || booking.status === "confirmed") && (
                    <Button
                      onClick={() => handleStatusUpdate(booking.id, "cancelled")}
                      disabled={updatingId === booking.id}
                      size="sm"
                      variant="destructive"
                      className="flex-1 lg:flex-none"
                    >
                      Cancella
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

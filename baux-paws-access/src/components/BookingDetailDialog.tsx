import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Mail, Phone, PawPrint, Users, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Booking {
  id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string | null;
  product_name: string;
  product_description?: string | null;
  product_type: string;
  booking_date: string;
  end_date?: string | null;
  booking_time: string | null;
  number_of_dogs: number;
  number_of_humans: number;
  total_amount?: number | null;
  status: string;
  special_requests?: string | null;
}

interface BookingDetailDialogProps {
  booking: Booking | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export const BookingDetailDialog = ({ booking, open, onOpenChange }: BookingDetailDialogProps) => {
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);

  if (!booking) return null;

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    const { error } = await supabase
      .from("booking")
      .update({ status: newStatus })
      .eq("id", booking.id);

    if (error) {
      toast({
        title: "Aggiornamento fallito",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Stato aggiornato",
        description: `Lo stato della prenotazione è stato cambiato in ${statusLabels[newStatus as keyof typeof statusLabels]}`,
      });
      onOpenChange(false);
    }
    setUpdating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <DialogTitle className="text-xl">{booking.product_name}</DialogTitle>
            <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
              {statusLabels[booking.status as keyof typeof statusLabels]}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {booking.product_description && (
            <p className="text-muted-foreground">{booking.product_description}</p>
          )}

          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Informazioni Cliente</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{booking.customer_name}</span>
              </div>
              {booking.customer_email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <a href={`mailto:${booking.customer_email}`} className="hover:text-primary">
                    {booking.customer_email}
                  </a>
                </div>
              )}
              {booking.customer_phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <a href={`tel:${booking.customer_phone}`} className="hover:text-primary">
                    {booking.customer_phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Dettagli Prenotazione</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm col-span-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(new Date(booking.booking_date), "PPP", { locale: it })}
                  {booking.end_date && booking.product_type === 'trip' && (
                    <> - {format(new Date(booking.end_date), "PPP", { locale: it })}</>
                  )}
                </span>
              </div>
              {booking.booking_time && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.booking_time}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <PawPrint className="h-4 w-4 text-muted-foreground" />
                <span>{booking.number_of_dogs} cani</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{booking.number_of_humans} persone</span>
              </div>
            </div>
          </div>

          {booking.special_requests && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Richieste Speciali</h3>
              <div className="flex items-start gap-2 text-sm p-3 bg-muted rounded-lg">
                <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-muted-foreground">{booking.special_requests}</p>
              </div>
            </div>
          )}

          {booking.total_amount && (
            <div className="pt-4 border-t">
              <div className="text-2xl font-bold text-foreground">
                €{booking.total_amount.toFixed(2)}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t">
            {booking.status === "pending" && (
              <Button
                onClick={() => handleStatusUpdate("confirmed")}
                disabled={updating}
                className="flex-1"
              >
                Conferma
              </Button>
            )}
            {booking.status === "confirmed" && (
              <Button
                onClick={() => handleStatusUpdate("completed")}
                disabled={updating}
                variant="outline"
                className="flex-1"
              >
                Completa
              </Button>
            )}
            {(booking.status === "pending" || booking.status === "confirmed") && (
              <Button
                onClick={() => handleStatusUpdate("cancelled")}
                disabled={updating}
                variant="destructive"
                className="flex-1"
              >
                Cancella
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

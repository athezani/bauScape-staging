import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Event {
  id: string;
  name: string;
  description: string | null;
  provider_id: string;
}

interface Booking {
  id: string;
  customer_name: string;
  event_type: 'class' | 'experience' | 'trip';
  event_id: string;
  booking_date: string;
  end_date: string | null;
  booking_time: string | null;
  status: string;
  number_of_dogs: number;
  number_of_humans: number;
  event?: Event;
}

interface ProductBookingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  bookings: Booking[];
  onBookingClick: (booking: Booking) => void;
}

const statusColors = {
  pending: "bg-warning/20 hover:bg-warning/30 text-warning border-warning/30",
  confirmed: "bg-success/20 hover:bg-success/30 text-success border-success/30",
  completed: "bg-info/20 hover:bg-info/30 text-info border-info/30",
  cancelled: "bg-destructive/20 hover:bg-destructive/30 text-destructive border-destructive/30",
};

const statusLabels = {
  pending: "In attesa",
  confirmed: "Confermato",
  completed: "Completato",
  cancelled: "Cancellato",
};

export const ProductBookingsDialog = ({ 
  open, 
  onOpenChange, 
  productName, 
  bookings,
  onBookingClick 
}: ProductBookingsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {productName}
          </DialogTitle>
          <div className="space-y-2 text-sm text-muted-foreground">
            {bookings[0]?.booking_time && (
              <div className="flex items-center gap-2">
                <span>🕐 Orario:</span>
                <span className="font-medium">{bookings[0].booking_time.slice(0, 5)}</span>
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span>📋 Prenotazioni:</span>
                <span className="font-medium">{bookings.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>👥 Adulti:</span>
                <span className="font-medium">{bookings.reduce((sum, b) => sum + (b.number_of_humans || 0), 0)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🐕 Cani:</span>
                <span className="font-medium">{bookings.reduce((sum, b) => sum + (b.number_of_dogs || 0), 0)}</span>
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Card
              key={booking.id}
              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => {
                onOpenChange(false);
                onBookingClick(booking);
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{booking.customer_name}</span>
                    <Badge 
                      variant="outline" 
                      className={statusColors[booking.status as keyof typeof statusColors]}
                    >
                      {statusLabels[booking.status as keyof typeof statusLabels]}
                    </Badge>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>📅</span>
                      <span>
                        {format(new Date(booking.booking_date), "dd MMMM yyyy", { locale: it })}
                        {booking.end_date && ` - ${format(new Date(booking.end_date), "dd MMMM yyyy", { locale: it })}`}
                      </span>
                    </div>
                    
                    {booking.booking_time && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span>🕐</span>
                        <span>{booking.booking_time.slice(0, 5)}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>🐕 {booking.number_of_dogs}</span>
                      <span>👤 {booking.number_of_humans}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right text-sm text-muted-foreground">
                  Clicca per dettagli →
                </div>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Mail, Phone, PawPrint, Users, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  product_name: string;
  product_description: string | null;
  product_type: string;
  booking_date: string;
  end_date: string | null;
  booking_time: string | null;
  number_of_dogs: number;
  number_of_humans: number;
  total_amount: number | null;
  status: string;
  special_requests: string | null;
  shopify_order_id: string | null;
}

interface BookingCardProps {
  booking: Booking;
}

const statusColors = {
  pending: "bg-warning/10 text-warning border-warning/20",
  confirmed: "bg-success/10 text-success border-success/20",
  completed: "bg-info/10 text-info border-info/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

export const BookingCard = ({ booking }: BookingCardProps) => {
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    const { error } = await supabase
      .from("booking")
      .update({ status: newStatus })
      .eq("id", booking.id);

    if (error) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Status updated",
        description: `Booking status changed to ${newStatus}`,
      });
    }
    setUpdating(false);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{booking.product_name}</h3>
                {booking.product_description && (
                  <p className="text-sm text-muted-foreground mt-1">{booking.product_description}</p>
                )}
              </div>
              <Badge className={statusColors[booking.status as keyof typeof statusColors]}>
                {booking.status}
              </Badge>
            </div>

            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2 text-foreground">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{booking.customer_name}</span>
              </div>
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
                  {format(new Date(booking.booking_date), "PPP")}
                  {booking.end_date && booking.product_type === 'trip' && (
                    <> - {format(new Date(booking.end_date), "PPP")}</>
                  )}
                </span>
              </div>
              {booking.booking_time && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{booking.booking_time}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <PawPrint className="h-4 w-4" />
                <span>{booking.number_of_dogs} dog{booking.number_of_dogs !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{booking.number_of_humans} human{booking.number_of_humans !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {booking.special_requests && (
              <div className="flex items-start gap-2 text-sm p-3 bg-muted rounded-lg">
                <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-foreground mb-1">Special Requests:</p>
                  <p className="text-muted-foreground">{booking.special_requests}</p>
                </div>
              </div>
            )}

            {booking.total_amount && (
              <div className="text-lg font-semibold text-foreground">
                ${booking.total_amount.toFixed(2)}
              </div>
            )}
          </div>

          <div className="flex lg:flex-col gap-2">
            {booking.status === "pending" && (
              <Button
                onClick={() => handleStatusUpdate("confirmed")}
                disabled={updating}
                size="sm"
                className="flex-1 lg:flex-none"
              >
                Confirm
              </Button>
            )}
            {booking.status === "confirmed" && (
              <Button
                onClick={() => handleStatusUpdate("completed")}
                disabled={updating}
                size="sm"
                variant="outline"
                className="flex-1 lg:flex-none"
              >
                Complete
              </Button>
            )}
            {(booking.status === "pending" || booking.status === "confirmed") && (
              <Button
                onClick={() => handleStatusUpdate("cancelled")}
                disabled={updating}
                size="sm"
                variant="destructive"
                className="flex-1 lg:flex-none"
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

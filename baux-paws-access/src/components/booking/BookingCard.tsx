/**
 * BookingCard Component
 * Displays a single booking with status and actions
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Mail, Phone, PawPrint, Users, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { updateBookingStatus } from "@/services/booking.service";
import { STATUS_COLORS } from "@/config/constants";
import type { Booking, BookingStatus } from "@/types";

interface BookingCardProps {
  booking: Booking;
}

export const BookingCard = ({ booking }: BookingCardProps) => {
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async (newStatus: BookingStatus) => {
    setUpdating(true);
    try {
      await updateBookingStatus(booking.id, newStatus);
      toast({
        title: "Status updated",
        description: `Booking status changed to ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
    setUpdating(false);
  };

  const productName = booking.product_name || booking.event?.name || 'Unknown Product';
  const productDescription = booking.product_description || booking.event?.description;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">{productName}</h3>
                {productDescription && (
                  <p className="text-sm text-muted-foreground mt-1">{productDescription}</p>
                )}
              </div>
              <Badge className={STATUS_COLORS[booking.status]}>
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
                  {booking.end_date && booking.event_type === 'trip' && (
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
                €{booking.total_amount.toFixed(2)}
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
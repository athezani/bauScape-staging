/**
 * EventCard Component
 * Displays an event group with booking count and summary
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, PawPrint } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { EVENT_TYPE_ICONS } from "@/config/constants";
import type { Booking, EventType } from "@/types";

interface EventCardProps {
  eventKey: string;
  eventName: string;
  eventType: EventType;
  bookingDate: string;
  endDate: string | null;
  bookingTime: string | null;
  bookings: Booking[];
  onClick: () => void;
}

export const EventCard = ({ 
  eventName, 
  eventType,
  bookingDate, 
  endDate,
  bookingTime, 
  bookings,
  onClick 
}: EventCardProps) => {
  const hasPending = bookings.some(b => b.status === "pending");
  const totalHumans = bookings.reduce((sum, b) => sum + b.number_of_humans, 0);
  const totalDogs = bookings.reduce((sum, b) => sum + b.number_of_dogs, 0);
  const icon = EVENT_TYPE_ICONS[eventType] || '📅';

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer" 
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {icon} {eventName}
                </h3>
              </div>
              {hasPending && (
                <Badge className="bg-warning/10 text-warning border-warning/20">
                  Da confermare
                </Badge>
              )}
            </div>

            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {format(new Date(bookingDate), "dd MMMM yyyy", { locale: it })}
                  {endDate && (
                    <> - {format(new Date(endDate), "dd MMMM yyyy", { locale: it })}</>
                  )}
                </span>
              </div>
              
              {bookingTime && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{bookingTime.slice(0, 5)}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm font-medium">
              <div className="flex items-center gap-2 text-foreground">
                📋 <span>{bookings.length} {bookings.length === 1 ? 'prenotazione' : 'prenotazioni'}</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <Users className="h-4 w-4" />
                <span>{totalHumans} {totalHumans === 1 ? 'adulto' : 'adulti'}</span>
              </div>
              <div className="flex items-center gap-2 text-foreground">
                <PawPrint className="h-4 w-4" />
                <span>{totalDogs} {totalDogs === 1 ? 'cane' : 'cani'}</span>
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            Clicca per dettagli →
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EventCard } from "@/components/EventCard";
import { EventBookingsDialog } from "@/components/EventBookingsDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: string;
  name: string;
  description: string | null;
  provider_id: string;
}

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
  event?: Event;
}

interface EventGroup {
  eventKey: string;
  eventName: string;
  eventType: 'class' | 'experience' | 'trip';
  bookingDate: string;
  endDate: string | null;
  bookingTime: string | null;
  bookings: Booking[];
}

interface BookingListProps {
  userId: string;
}

export const BookingList = ({ userId }: BookingListProps) => {
  const [events, setEvents] = useState<EventGroup[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState<EventGroup | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Fetch bookings
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('booking')
          .select('*')
          .eq('provider_id', userId)
          .gte('booking_date', today)
          .order('booking_date', { ascending: true });

        if (bookingsError) {
          console.error("Error fetching bookings:", bookingsError);
          throw bookingsError;
        }

        if (!bookingsData || bookingsData.length === 0) {
          setEvents([]);
          setFilteredEvents([]);
          setLoading(false);
          return;
        }

        // Check if we have new schema (event_type/event_id) or old schema (product_name/product_type)
        const hasNewSchema = bookingsData[0].hasOwnProperty('event_type');

        let bookingsWithEvents;
        
        if (hasNewSchema) {
          // New schema: fetch event details
          bookingsWithEvents = await Promise.all(
            bookingsData.map(async (booking: any) => {
              let event = null;
              
              if (booking.event_type && booking.event_id) {
                const tableName = booking.event_type === 'trip' ? 'trip' : 
                                 booking.event_type === 'experience' ? 'experience' : 'class';
                
                const { data: eventData } = await supabase
                  .from(tableName as any)
                  .select('id, name, description, provider_id')
                  .eq('id', booking.event_id)
                  .maybeSingle();
                
                event = eventData;
              }
              
              return { ...booking, event };
            })
          );
        } else {
          // Old schema: use product fields directly
          bookingsWithEvents = bookingsData.map((booking: any) => ({
            ...booking,
            event_type: booking.product_type,
            event_id: null,
            event: { name: booking.product_name }
          }));
        }

        // Group bookings by event
        const grouped = bookingsWithEvents.reduce((acc: { [key: string]: EventGroup }, booking: any) => {
          const eventName = booking.event?.name || booking.product_name || 'Evento senza nome';
          const key = hasNewSchema 
            ? `${booking.event_id}-${booking.booking_date}-${booking.booking_time || 'no-time'}`
            : `${booking.product_name}-${booking.booking_date}-${booking.booking_time || 'no-time'}`;
          
          if (!acc[key]) {
            acc[key] = {
              eventKey: key,
              eventName: eventName,
              eventType: booking.event_type || booking.product_type,
              bookingDate: booking.booking_date,
              endDate: booking.end_date,
              bookingTime: booking.booking_time,
              bookings: []
            };
          }
          
          acc[key].bookings.push(booking);
          return acc;
        }, {});

        // Convert to array and sort by date, with pending bookings first
        const sortedEvents = Object.values(grouped).sort((a: any, b: any) => {
          const aHasPending = a.bookings.some((b: any) => b.status === 'pending');
          const bHasPending = b.bookings.some((b: any) => b.status === 'pending');
          
          if (aHasPending && !bHasPending) return -1;
          if (!aHasPending && bHasPending) return 1;
          
          return new Date(a.bookingDate).getTime() - new Date(b.bookingDate).getTime();
        });

        setEvents(sortedEvents as EventGroup[]);
        setFilteredEvents(sortedEvents as EventGroup[]);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        toast({
          title: "Errore",
          description: "Impossibile caricare le prenotazioni",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `provider_id=eq.${userId}`
        },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  useEffect(() => {
    let filtered = events;

    if (searchTerm) {
      filtered = filtered.filter((event) =>
        event.eventName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.bookings.some(b => 
          b.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          b.customer_email.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((event) => 
        event.bookings.some(b => b.status === statusFilter)
      );
    }

    setFilteredEvents(filtered);
  }, [searchTerm, statusFilter, events]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Le tue prenotazioni</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Caricamento prenotazioni...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Eventi Futuri</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per evento o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtra per stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="pending">In attesa</SelectItem>
                <SelectItem value="confirmed">Confermato</SelectItem>
                <SelectItem value="completed">Completato</SelectItem>
                <SelectItem value="cancelled">Cancellato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || statusFilter !== "all"
                ? "Nessun evento trovato con i filtri applicati"
                : "Nessun evento futuro"}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.eventKey}
                  eventKey={event.eventKey}
                  eventName={event.eventName}
                  eventType={event.eventType}
                  bookingDate={event.bookingDate}
                  endDate={event.endDate}
                  bookingTime={event.bookingTime}
                  bookings={event.bookings}
                  onClick={() => setSelectedEvent(event)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedEvent && (
        <EventBookingsDialog
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
          eventName={selectedEvent.eventName}
          bookings={selectedEvent.bookings}
        />
      )}
    </>
  );
};
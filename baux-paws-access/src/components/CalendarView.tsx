import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, differenceInCalendarDays } from "date-fns";
import { it } from "date-fns/locale";
import { ProductBookingsDialog } from "./ProductBookingsDialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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

interface CalendarViewProps {
  userId: string;
  onBookingClick: (booking: Booking) => void;
}

const statusColors = {
  pending: "bg-warning/20 hover:bg-warning/30 text-warning border-warning/30",
  confirmed: "bg-success/20 hover:bg-success/30 text-success border-success/30",
  completed: "bg-info/20 hover:bg-info/30 text-info border-info/30",
  cancelled: "bg-destructive/20 hover:bg-destructive/30 text-destructive border-destructive/30",
};

export const CalendarView = ({ userId, onBookingClick }: CalendarViewProps) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedProduct, setSelectedProduct] = useState<{ name: string; bookings: Booking[] } | null>(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const { data: bookingsData, error: bookingsError } = await supabase
          .from("booking")
          .select("*")
          .eq("provider_id", userId)
          .order("booking_date", { ascending: true });

        if (bookingsError) {
          console.error("Error fetching bookings:", bookingsError);
          setLoading(false);
          return;
        }

        if (bookingsData && bookingsData.length > 0) {
          // Check if we have new schema (event_type/event_id) or old schema (product_name/product_type)
          const hasNewSchema = bookingsData[0].hasOwnProperty('event_type');
          
          if (hasNewSchema) {
            // New schema: fetch event details
            const bookingsWithEvents = await Promise.all(
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
            
            setBookings(bookingsWithEvents as Booking[]);
          } else {
            // Old schema: use product fields directly
            setBookings(bookingsData.map((booking: any) => ({
              ...booking,
              event_type: booking.product_type,
              event: { name: booking.product_name }
            })) as Booking[]);
          }
        } else {
          setBookings([]);
        }
      } catch (error) {
        console.error("Error in fetchBookings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();

    const channel = supabase
      .channel('calendar-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `provider_id=eq.${userId}`,
        },
        () => {
          fetchBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Group calendar days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  // Get all product groups that overlap with a given week
  const getProductGroupsForWeek = (week: Date[]) => {
    const weekStart = week[0];
    const weekEnd = week[6];

    // Group bookings by event name and date range
    const productGroups = new Map<string, Booking[]>();
    
    bookings.forEach((booking) => {
      const bookingStart = new Date(booking.booking_date);
      const bookingEnd = booking.end_date ? new Date(booking.end_date) : bookingStart;
      
      // Check if booking overlaps with this week
      if (bookingStart <= weekEnd && bookingEnd >= weekStart) {
        const eventName = booking.event?.name || 'Evento senza nome';
        const key = `${eventName}-${booking.booking_date}-${booking.end_date || booking.booking_date}`;
        if (!productGroups.has(key)) {
          productGroups.set(key, []);
        }
        productGroups.get(key)!.push(booking);
      }
    });

    // Convert to array and calculate grid positions
    return Array.from(productGroups.entries()).map(([key, groupBookings]) => {
      const firstBooking = groupBookings[0];
      const bookingStart = new Date(firstBooking.booking_date);
      const bookingEnd = firstBooking.end_date ? new Date(firstBooking.end_date) : bookingStart;
      
      const startDayOfWeek = differenceInCalendarDays(bookingStart, weekStart);
      const endDayOfWeek = differenceInCalendarDays(bookingEnd, weekStart);
      
      const startCol = Math.max(0, Math.min(6, startDayOfWeek));
      const endCol = Math.max(0, Math.min(6, endDayOfWeek));
      const span = endCol - startCol + 1;
      
      const eventName = firstBooking.event?.name || 'Evento senza nome';
      
      return {
        eventName: eventName,
        eventType: firstBooking.event_type,
        bookings: groupBookings,
        startCol,
        span,
        bookingTime: firstBooking.booking_time,
        bookingDate: firstBooking.booking_date,
        endDate: firstBooking.end_date,
        status: groupBookings[0].status
      };
    }).sort((a, b) => {
      // Sort by span (longer first), then by start column
      if (b.span !== a.span) return b.span - a.span;
      return a.startCol - b.startCol;
    });
  };

  const previousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Calendario</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-muted-foreground">Caricamento calendario...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2 md:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-lg md:text-2xl">
            {format(currentMonth, "MMMM yyyy", { locale: it })}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Oggi
            </Button>
            <Button variant="outline" size="icon" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:px-6">
        <ScrollArea className="w-full">
          <div className="min-w-[600px] space-y-4 md:space-y-6">
            {/* Days of week headers */}
            <div className="grid grid-cols-7 gap-1 md:gap-2">
              {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((day) => (
                <div key={day} className="text-center font-semibold text-xs md:text-sm text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Render each week */}
            {weeks.map((week, weekIdx) => {
              const productGroups = getProductGroupsForWeek(week);
              
              return (
                <div key={weekIdx} className="space-y-1 md:space-y-2">
                  {/* Day headers for this week */}
                  <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {week.map((day, dayIdx) => {
                      const isToday = isSameDay(day, new Date());
                      const isDayInCurrentMonth = isSameMonth(day, currentMonth);

                      return (
                        <div
                          key={dayIdx}
                          className={`text-center py-1 px-1 md:px-2 rounded ${
                            isToday ? "bg-primary/10 ring-1 ring-primary" : ""
                          }`}
                        >
                          <div className={`text-xs md:text-sm font-medium ${
                            isDayInCurrentMonth ? "text-foreground" : "text-muted-foreground"
                          } ${isToday ? "text-primary font-bold" : ""}`}>
                            {format(day, "d")}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* All product groups for this week in a single grid */}
                  <div className="grid grid-cols-7 gap-1 md:gap-2 auto-rows-min">
                    {productGroups.map((group, idx) => (
                      <button
                        key={`${group.eventName}-${group.bookingDate}-${idx}`}
                        onClick={() => setSelectedProduct({ name: group.eventName, bookings: group.bookings })}
                        className={`text-left px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-[10px] md:text-xs transition-colors border min-h-[50px] md:min-h-[60px] ${
                          statusColors[group.status as keyof typeof statusColors]
                        }`}
                        style={{
                          gridColumn: `${group.startCol + 1} / span ${group.span}`
                        }}
                      >
                        <div className="font-medium truncate">
                          {group.eventType === 'trip' ? '🚗' : group.eventType === 'class' ? '📚' : '📅'} {group.eventName}
                        </div>
                        {group.bookingTime && (
                          <div className="text-[9px] md:text-[10px] opacity-80 mt-0.5">
                            {group.bookingTime.slice(0, 5)}
                          </div>
                        )}
                        <div className="text-[9px] md:text-[10px] opacity-80 mt-0.5 md:mt-1">
                          {group.bookings.length} {group.bookings.length === 1 ? 'pren.' : 'pren.'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 md:gap-4 mt-4 md:mt-6 pt-4 border-t">
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-warning/20 border border-warning/30"></div>
            <span className="text-xs md:text-sm text-muted-foreground">In attesa</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-success/20 border border-success/30"></div>
            <span className="text-xs md:text-sm text-muted-foreground">Confermato</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-info/20 border border-info/30"></div>
            <span className="text-xs md:text-sm text-muted-foreground">Completato</span>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-destructive/20 border border-destructive/30"></div>
            <span className="text-xs md:text-sm text-muted-foreground">Cancellato</span>
          </div>
        </div>

        {/* Product bookings dialog */}
        {selectedProduct && (
          <ProductBookingsDialog
            open={!!selectedProduct}
            onOpenChange={(open) => !open && setSelectedProduct(null)}
            productName={selectedProduct.name}
            bookings={selectedProduct.bookings}
            onBookingClick={onBookingClick}
          />
        )}
      </CardContent>
    </Card>
  );
};

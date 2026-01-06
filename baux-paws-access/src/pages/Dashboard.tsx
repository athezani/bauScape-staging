import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { BookingList } from "@/components/BookingList";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardStats } from "@/components/DashboardStats";
import { CalendarView } from "@/components/CalendarView";
import { BookingDetailDialog } from "@/components/BookingDetailDialog";
import { CancellationRequestsList } from "@/components/cancellation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, List } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleBookingClick = async (booking: any) => {
    // Fetch full booking details
    const { data } = await supabase
      .from("booking")
      .select("*")
      .eq("id", booking.id)
      .single();
    
    if (data) {
      setSelectedBooking(data);
      setDialogOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onLogout={handleLogout} />
      
      <main className="container mx-auto px-4 py-4 md:py-8 space-y-6 md:space-y-8">
        <DashboardStats userId={user.id} />
        
        <div className="space-y-4">
          <CancellationRequestsList providerId={user.id} />
        </div>
        
        <div className="space-y-4">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground">Gestione ordini</h2>
          <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full max-w-xs md:max-w-md grid-cols-2">
            <TabsTrigger value="list" className="flex items-center gap-1.5 md:gap-2 text-sm">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
              <span className="sm:hidden">Lista</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-1.5 md:gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span>Calendario</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="mt-6">
            <BookingList userId={user.id} />
          </TabsContent>
          
          <TabsContent value="calendar" className="mt-6">
            <CalendarView userId={user.id} onBookingClick={handleBookingClick} />
          </TabsContent>
          </Tabs>
        </div>
      </main>

      <BookingDetailDialog
        booking={selectedBooking}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
};

export default Dashboard;

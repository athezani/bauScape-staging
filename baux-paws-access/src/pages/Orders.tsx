import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { DashboardHeader } from "@/components/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, Users, Dog, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  product_name: string;
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
  created_at: string;
}

const Orders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('booking')
          .select('*')
          .eq('provider_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching orders:", error);
          throw error;
        }

        setOrders(data || []);
        setFilteredOrders(data || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast({
          title: "Errore",
          description: "Impossibile caricare gli ordini",
          variant: "destructive",
        });
      }
    };

    fetchOrders();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking',
          filter: `provider_id=eq.${user.id}`
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  useEffect(() => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter((order) =>
        order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.shopify_order_id && order.shopify_order_id.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((order) => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [searchTerm, statusFilter, orders]);

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

  const getStatusBadge = (status: string) => {
    const variants: { [key: string]: "default" | "secondary" | "destructive" | "outline" } = {
      pending: "secondary",
      confirmed: "default",
      completed: "outline",
      cancelled: "destructive",
    };
    const labels: { [key: string]: string } = {
      pending: "In attesa",
      confirmed: "Confermato",
      completed: "Completato",
      cancelled: "Cancellato",
    };
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
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

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onLogout={handleLogout} />
      
      <main className="container mx-auto px-4 py-4 md:py-8">
        <Card>
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-lg md:text-xl">Tutti gli Ordini</CardTitle>
            <p className="text-xs md:text-sm text-muted-foreground">
              Lista completa di tutte le prenotazioni dei clienti
            </p>
            <div className="flex flex-col gap-3 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per cliente, prodotto o ordine Shopify..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
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
          <CardContent className="px-4 md:px-6">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {searchTerm || statusFilter !== "all"
                  ? "Nessun ordine trovato con i filtri applicati"
                  : "Nessun ordine presente"}
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="border rounded-lg p-3 md:p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-base md:text-lg">{order.customer_name}</h3>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-sm font-medium text-primary">{order.product_name}</p>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs md:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                          <span className="truncate max-w-[180px] md:max-w-none">{order.customer_email}</span>
                        </div>
                        {order.customer_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                            {order.customer_phone}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                        <div className="flex items-center gap-1 text-xs md:text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4" />
                          {format(new Date(order.booking_date), "d MMM yyyy", { locale: it })}
                          {order.booking_time && ` - ${order.booking_time.slice(0, 5)}`}
                        </div>
                        <div className="flex items-center gap-3 text-xs md:text-sm">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            {order.number_of_humans}
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Dog className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            {order.number_of_dogs}
                          </span>
                          {order.total_amount && (
                            <span className="font-semibold text-base md:text-lg text-foreground">
                              €{order.total_amount.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {order.shopify_order_id && (
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                          Shopify: {order.shopify_order_id}
                        </p>
                      )}
                    </div>
                    {order.special_requests && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs md:text-sm text-muted-foreground">
                          <span className="font-medium">Note:</span> {order.special_requests}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Orders;
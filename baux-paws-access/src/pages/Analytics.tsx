import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isBefore, startOfWeek, eachDayOfInterval, addDays, isAfter } from "date-fns";
import { it } from "date-fns/locale";
import { TrendingUp, Euro, Calendar, Users, Package, Dog, UserRound, Clock, Filter, X } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface Booking {
  id: string;
  booking_date: string;
  total_amount_paid: number | null;
  status: string;
  product_type: string;
  product_name: string;
  number_of_adults: number;
  number_of_dogs: number;
  created_at: string;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const STATUS_COLORS: Record<string, string> = {
  completed: '#22c55e',
  confirmed: '#3b82f6',
  pending: '#f59e0b',
  cancelled: '#ef4444'
};

const Analytics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productTypeFilter, setProductTypeFilter] = useState<string>("all");
  const [productNameFilter, setProductNameFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

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
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('booking')
      .select('*')
      .eq('provider_id', user.id)
      .order('booking_date', { ascending: true });

    setBookings(data || []);
  };

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

  // Get unique values for filters
  const productNames = useMemo(() => {
    const names = new Set(bookings.map(b => b.product_name).filter(Boolean));
    return Array.from(names).sort();
  }, [bookings]);

  const productTypes = useMemo(() => {
    const types = new Set(bookings.map(b => b.product_type).filter(Boolean));
    return Array.from(types);
  }, [bookings]);

  // Apply filters
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      if (productTypeFilter !== "all" && b.product_type !== productTypeFilter) return false;
      if (productNameFilter !== "all" && b.product_name !== productNameFilter) return false;
      if (dateFrom && isBefore(parseISO(b.booking_date), parseISO(dateFrom))) return false;
      if (dateTo && isAfter(parseISO(b.booking_date), parseISO(dateTo))) return false;
      return true;
    });
  }, [bookings, statusFilter, productTypeFilter, productNameFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setStatusFilter("all");
    setProductTypeFilter("all");
    setProductNameFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = statusFilter !== "all" || productTypeFilter !== "all" || productNameFilter !== "all" || dateFrom || dateTo;

  const today = new Date();
  
  // Filter bookings
  const activeBookings = filteredBookings.filter(b => b.status !== 'cancelled');
  const pastBookings = activeBookings.filter(b => 
    b.status === 'completed' || isBefore(parseISO(b.booking_date), today)
  );
  const futureBookings = activeBookings.filter(b => 
    b.status !== 'completed' && !isBefore(parseISO(b.booking_date), today)
  );

  // Calculate totals
  const totalRevenue = activeBookings.reduce((sum, b) => sum + (b.total_amount_paid || 0), 0);
  const pastRevenue = pastBookings.reduce((sum, b) => sum + (b.total_amount_paid || 0), 0);
  const futureRevenue = futureBookings.reduce((sum, b) => sum + (b.total_amount_paid || 0), 0);

  // Monthly data for the last 6 months
  const months = eachMonthOfInterval({
    start: subMonths(startOfMonth(today), 5),
    end: endOfMonth(today)
  });

  const monthlyData = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    const monthBookings = activeBookings.filter(b => {
      const date = parseISO(b.booking_date);
      return date >= monthStart && date <= monthEnd;
    });

    return {
      month: format(month, 'MMM', { locale: it }),
      revenue: monthBookings.reduce((sum, b) => sum + (b.total_amount_paid || 0), 0),
      bookings: monthBookings.length
    };
  });

  // Weekly data (next 4 weeks)
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: addDays(weekStart, 27)
  });

  const weeklyData = weekDays.map(day => {
    const dayBookings = futureBookings.filter(b => 
      format(parseISO(b.booking_date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
    );
    return {
      date: format(day, 'dd/MM'),
      bookings: dayBookings.length,
      revenue: dayBookings.reduce((sum, b) => sum + (b.total_amount_paid || 0), 0)
    };
  });

  // Status distribution
  const statusData = [
    { name: 'Completate', value: filteredBookings.filter(b => b.status === 'completed').length, color: STATUS_COLORS.completed },
    { name: 'Confermate', value: filteredBookings.filter(b => b.status === 'confirmed').length, color: STATUS_COLORS.confirmed },
    { name: 'In attesa', value: filteredBookings.filter(b => b.status === 'pending').length, color: STATUS_COLORS.pending },
    { name: 'Cancellate', value: filteredBookings.filter(b => b.status === 'cancelled').length, color: STATUS_COLORS.cancelled },
  ].filter(s => s.value > 0);

  // Product performance
  const productStats = activeBookings.reduce((acc, booking) => {
    const name = booking.product_name || 'Senza nome';
    if (!acc[name]) {
      acc[name] = { name, bookings: 0, revenue: 0, humans: 0, dogs: 0 };
    }
    acc[name].bookings++;
    acc[name].revenue += booking.total_amount_paid || 0;
    acc[name].humans += booking.number_of_adults || 0;
    acc[name].dogs += booking.number_of_dogs || 0;
    return acc;
  }, {} as Record<string, { name: string; bookings: number; revenue: number; humans: number; dogs: number }>);

  const topProducts = Object.values(productStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Total participants
  const totalHumans = activeBookings.reduce((sum, b) => sum + (b.number_of_adults || 0), 0);
  const totalDogs = activeBookings.reduce((sum, b) => sum + (b.number_of_dogs || 0), 0);

  // Average booking value
  const avgBookingValue = activeBookings.length > 0 ? totalRevenue / activeBookings.length : 0;

  // Pending actions
  const pendingBookings = filteredBookings.filter(b => b.status === 'pending').length;
  const upcomingWeek = futureBookings.filter(b => {
    const date = parseISO(b.booking_date);
    return date <= addDays(today, 7);
  }).length;

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
      
      <main className="container mx-auto px-4 py-4 md:py-8 space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-3xl font-bold text-foreground">Analytics</h2>
            <p className="text-xs md:text-sm text-muted-foreground">Statistiche e performance delle tue attività</p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3 md:pb-4 px-4 md:px-6">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Filter className="h-4 w-4 md:h-5 md:w-5" />
              Filtri
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto md:ml-2 text-xs md:text-sm">
                  <X className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                  <span className="hidden sm:inline">Cancella filtri</span>
                  <span className="sm:hidden">Reset</span>
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 md:px-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm">Stato</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                    <SelectValue placeholder="Tutti" />
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

              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm">Tipo</Label>
                <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
                  <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                    <SelectValue placeholder="Tutti" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i tipi</SelectItem>
                    {productTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type === 'experience' ? 'Esperienza' : type === 'trip' ? 'Viaggio' : type === 'class' ? 'Classe' : type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 md:space-y-2 col-span-2 md:col-span-1">
                <Label className="text-xs md:text-sm">Prodotto</Label>
                <Select value={productNameFilter} onValueChange={setProductNameFilter}>
                  <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
                    <SelectValue placeholder="Tutti" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i prodotti</SelectItem>
                    {productNames.map(name => (
                      <SelectItem key={name} value={name}>
                        {name.length > 25 ? name.substring(0, 25) + '...' : name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm">Data da</Label>
                <Input 
                  type="date" 
                  value={dateFrom} 
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 md:h-10 text-xs md:text-sm"
                />
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm">Data a</Label>
                <Input 
                  type="date" 
                  value={dateTo} 
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 md:h-10 text-xs md:text-sm"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t">
                <p className="text-xs md:text-sm text-muted-foreground">
                  Mostrando <span className="font-semibold text-foreground">{filteredBookings.length}</span> di {bookings.length} prenotazioni
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
              <CardTitle className="text-xs md:text-sm font-medium">Ricavi Totali</CardTitle>
              <Euro className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
              <div className="text-lg md:text-2xl font-bold">€{totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                Media: €{avgBookingValue.toFixed(2)} per pren.
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
              <CardTitle className="text-xs md:text-sm font-medium">Incassato</CardTitle>
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
              <div className="text-lg md:text-2xl font-bold text-green-600">€{pastRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                {pastBookings.length} completate
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
              <CardTitle className="text-xs md:text-sm font-medium">Da Incassare</CardTitle>
              <Calendar className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
              <div className="text-lg md:text-2xl font-bold text-blue-600">€{futureRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                {futureBookings.length} future
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-1 md:pb-2 px-3 md:px-6 pt-3 md:pt-6">
              <CardTitle className="text-xs md:text-sm font-medium">Partecipanti</CardTitle>
              <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
              <div className="text-lg md:text-2xl font-bold">{totalHumans + totalDogs}</div>
              <div className="flex items-center gap-2 md:gap-3 mt-1">
                <span className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                  <UserRound className="h-2.5 w-2.5 md:h-3 md:w-3" /> {totalHumans}
                </span>
                <span className="text-[10px] md:text-xs text-muted-foreground flex items-center gap-1">
                  <Dog className="h-2.5 w-2.5 md:h-3 md:w-3" /> {totalDogs}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {(pendingBookings > 0 || upcomingWeek > 0) && (
          <div className="flex flex-wrap gap-2 md:gap-3">
            {pendingBookings > 0 && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-600 px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs">
                <Clock className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                {pendingBookings} in attesa
              </Badge>
            )}
            {upcomingWeek > 0 && (
              <Badge variant="outline" className="border-blue-500 text-blue-600 px-2 md:px-3 py-0.5 md:py-1 text-[10px] md:text-xs">
                <Calendar className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                {upcomingWeek} prossimi 7gg
              </Badge>
            )}
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Monthly Revenue Chart */}
          <Card>
            <CardHeader className="px-4 md:px-6">
              <CardTitle className="text-base md:text-lg">Andamento Ricavi</CardTitle>
              <CardDescription className="text-xs md:text-sm">Ultimi 6 mesi</CardDescription>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `€${v}`} width={50} />
                  <Tooltip 
                    formatter={(value: number) => [`€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, 'Ricavi']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#22c55e" 
                    fillOpacity={1} 
                    fill="url(#colorRevenue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card>
            <CardHeader className="px-4 md:px-6">
              <CardTitle className="text-base md:text-lg">Distribuzione Stati</CardTitle>
              <CardDescription className="text-xs md:text-sm">Tutte le prenotazioni filtrate</CardDescription>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Prenotazioni']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-2 md:gap-4 mt-2">
                {statusData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs md:text-sm">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Bookings Chart */}
        <Card>
          <CardHeader className="px-4 md:px-6">
            <CardTitle className="text-base md:text-lg">Prossime 4 Settimane</CardTitle>
            <CardDescription className="text-xs md:text-sm">Prenotazioni giornaliere in arrivo</CardDescription>
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={6} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={30} />
                <Tooltip 
                  formatter={(value: number, name) => {
                    if (name === 'revenue') return [`€${value.toLocaleString('it-IT')}`, 'Ricavi'];
                    return [value, 'Prenotazioni'];
                  }}
                />
                <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Products */}
        {topProducts.length > 0 && (
          <Card>
            <CardHeader className="px-4 md:px-6">
              <CardTitle className="text-base md:text-lg">Prodotti Migliori</CardTitle>
              <CardDescription className="text-xs md:text-sm">Le tue esperienze più vendute</CardDescription>
            </CardHeader>
            <CardContent className="px-4 md:px-6">
              <div className="space-y-3 md:space-y-4">
                {topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-muted/50 gap-3">
                    <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                      <div 
                        className="w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center text-xs md:text-sm font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      >
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm md:text-base truncate">{product.name}</p>
                        <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-muted-foreground">
                          <span>{product.bookings} pren.</span>
                          <span className="flex items-center gap-0.5">
                            <UserRound className="h-2.5 w-2.5 md:h-3 md:w-3" /> {product.humans}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Dog className="h-2.5 w-2.5 md:h-3 md:w-3" /> {product.dogs}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-sm md:text-base">€{product.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                      {totalRevenue > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {((product.revenue / totalRevenue) * 100).toFixed(1)}% del totale
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {filteredBookings.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {hasActiveFilters ? 'Nessun risultato' : 'Nessuna prenotazione'}
              </h3>
              <p className="text-muted-foreground">
                {hasActiveFilters 
                  ? 'Prova a modificare i filtri per vedere più risultati.'
                  : 'Le statistiche appariranno quando riceverai le prime prenotazioni.'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  Cancella filtri
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Analytics;
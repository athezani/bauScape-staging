import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from "recharts";
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isAfter, isBefore } from "date-fns";
import { it } from "date-fns/locale";
import { TrendingUp, TrendingDown, Euro, Calendar, Users, Package } from "lucide-react";

interface Booking {
  id: string;
  booking_date: string;
  total_amount: number | null;
  status: string;
  product_type: string;
  provider_id: string;
  customer_name: string;
  number_of_humans: number;
  number_of_dogs: number;
}

interface ProviderRevenue {
  name: string;
  revenue: number;
  bookings: number;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AdminAnalytics = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch all bookings
    const { data: bookingsData } = await supabase
      .from('booking')
      .select('*')
      .order('booking_date', { ascending: true });

    // Fetch providers
    const { data: profilesData } = await supabase
      .from('profile')
      .select('id, company_name');

    if (profilesData) {
      const providerMap: Record<string, string> = {};
      profilesData.forEach(p => {
        providerMap[p.id] = p.company_name;
      });
      setProviders(providerMap);
    }

    setBookings(bookingsData || []);
    setLoading(false);
  };

  const today = new Date();
  
  // Past bookings (completed or booking_date < today)
  const pastBookings = bookings.filter(b => 
    b.status === 'completed' || (b.status !== 'cancelled' && isBefore(parseISO(b.booking_date), today))
  );
  
  // Future bookings (booking_date >= today, not cancelled)
  const futureBookings = bookings.filter(b => 
    b.status !== 'cancelled' && b.status !== 'completed' && !isBefore(parseISO(b.booking_date), today)
  );

  // Calculate totals
  const totalPastRevenue = pastBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
  const totalFutureRevenue = futureBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
  const totalRevenue = totalPastRevenue + totalFutureRevenue;

  // Monthly data for the last 6 months and next 3 months
  const months = eachMonthOfInterval({
    start: subMonths(startOfMonth(today), 5),
    end: endOfMonth(subMonths(today, -2))
  });

  const monthlyData = months.map(month => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    
    const monthBookings = bookings.filter(b => {
      const date = parseISO(b.booking_date);
      return date >= monthStart && date <= monthEnd && b.status !== 'cancelled';
    });

    const revenue = monthBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const isPast = isBefore(monthEnd, today);

    return {
      month: format(month, 'MMM yyyy', { locale: it }),
      revenue,
      bookings: monthBookings.length,
      type: isPast ? 'Passato' : 'Futuro'
    };
  });

  // Revenue by provider
  const providerRevenueData: ProviderRevenue[] = Object.entries(providers).map(([id, name]) => {
    const providerBookings = bookings.filter(b => b.provider_id === id && b.status !== 'cancelled');
    return {
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      revenue: providerBookings.reduce((sum, b) => sum + (b.total_amount || 0), 0),
      bookings: providerBookings.length
    };
  }).filter(p => p.bookings > 0).sort((a, b) => b.revenue - a.revenue);

  // Status distribution
  const statusData = [
    { name: 'Completate', value: bookings.filter(b => b.status === 'completed').length, color: '#22c55e' },
    { name: 'Confermate', value: bookings.filter(b => b.status === 'confirmed').length, color: '#3b82f6' },
    { name: 'In attesa', value: bookings.filter(b => b.status === 'pending').length, color: '#f59e0b' },
    { name: 'Cancellate', value: bookings.filter(b => b.status === 'cancelled').length, color: '#ef4444' },
  ].filter(s => s.value > 0);

  // Product type distribution
  const productTypeData = [
    { name: 'Esperienze', value: bookings.filter(b => b.product_type === 'experience' && b.status !== 'cancelled').length },
    { name: 'Viaggi', value: bookings.filter(b => b.product_type === 'trip' && b.status !== 'cancelled').length },
    { name: 'Classi', value: bookings.filter(b => b.product_type === 'class' && b.status !== 'cancelled').length },
  ].filter(p => p.value > 0);

  // Total participants
  const totalHumans = bookings.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + (b.number_of_humans || 0), 0);
  const totalDogs = bookings.filter(b => b.status !== 'cancelled').reduce((sum, b) => sum + (b.number_of_dogs || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ricavi Totali</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {bookings.filter(b => b.status !== 'cancelled').length} prenotazioni totali
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vendite Passate</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">€{totalPastRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pastBookings.length} prenotazioni completate
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vendite Future</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">€{totalFutureRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {futureBookings.length} prenotazioni confermate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Partecipanti</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHumans + totalDogs}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalHumans} umani • {totalDogs} cani
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Andamento Mensile</CardTitle>
            <CardDescription>Ricavi degli ultimi 6 mesi e prossimi 3 mesi</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `€${v}`} />
                <Tooltip 
                  formatter={(value: number) => [`€${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, 'Ricavi']}
                  labelStyle={{ color: '#000' }}
                />
                <Bar 
                  dataKey="revenue" 
                  fill="#22c55e"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuzione Stati</CardTitle>
            <CardDescription>Prenotazioni per stato</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Provider Revenue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ricavi per Provider</CardTitle>
          <CardDescription>Performance di vendita per ciascun provider</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {providerRevenueData.map((provider, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <p className="font-medium">{provider.name}</p>
                    <p className="text-sm text-muted-foreground">{provider.bookings} prenotazioni</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">€{provider.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-muted-foreground">
                    {((provider.revenue / totalRevenue) * 100).toFixed(1)}% del totale
                  </p>
                </div>
              </div>
            ))}
            {providerRevenueData.length === 0 && (
              <p className="text-center text-muted-foreground py-4">Nessun dato disponibile</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Type Distribution */}
      {productTypeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tipologia Prodotti</CardTitle>
            <CardDescription>Distribuzione prenotazioni per tipo di prodotto</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {productTypeData.map((type, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Package className="h-4 w-4" style={{ color: COLORS[index % COLORS.length] }} />
                  <span className="font-medium">{type.name}:</span>
                  <Badge variant="secondary">{type.value}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminAnalytics;
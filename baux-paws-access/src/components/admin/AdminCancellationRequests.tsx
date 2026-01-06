import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Clock, CheckCircle2, XCircle, Search } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { AdminCancellationRequestDialog } from "./AdminCancellationRequestDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface CancellationRequest {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_at: string;
  processed_at: string | null;
  admin_notes: string | null;
  booking: {
    id: string;
    booking_date: string;
    trip_end_date: string | null;
    product_name: string;
    total_amount_paid: number;
    provider_id: string;
    product_type?: string;
    product_id?: string;
    provider?: {
      company_name: string;
      contact_name: string;
    };
  };
}

export const AdminCancellationRequests = () => {
  const [requests, setRequests] = useState<CancellationRequest[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<CancellationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<CancellationRequest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        // First, fetch cancellation requests with booking info
        const { data, error } = await supabase
          .from('cancellation_request')
          .select(`
            *,
            booking:booking_id (
              id,
              booking_date,
              trip_end_date,
              product_name,
              total_amount_paid,
              provider_id,
              product_type,
              product_id
            )
          `)
          .order('requested_at', { ascending: false });

        if (error) {
          console.error('Error fetching cancellation requests:', error);
          return;
        }

        if (!data || data.length === 0) {
          setRequests([]);
          setFilteredRequests([]);
          setLoading(false);
          return;
        }

        // Get unique provider IDs
        const providerIds = [...new Set(data.map((req: any) => req.booking?.provider_id).filter(Boolean))];

        // Fetch provider info for all unique providers
        let providersMap: Record<string, { company_name: string; contact_name: string }> = {};
        if (providerIds.length > 0) {
          const { data: providersData } = await supabase
            .from('profile')
            .select('id, company_name, contact_name')
            .in('id', providerIds);

          if (providersData) {
            providersMap = providersData.reduce((acc, provider) => {
              acc[provider.id] = {
                company_name: provider.company_name,
                contact_name: provider.contact_name,
              };
              return acc;
            }, {} as Record<string, { company_name: string; contact_name: string }>);
          }
        }

        // Transform data to include provider info
        const transformed = (data || []).map((req: any) => ({
          ...req,
          booking: {
            ...req.booking,
            provider: req.booking?.provider_id ? providersMap[req.booking.provider_id] || null : null,
          },
        })) as CancellationRequest[];

        setRequests(transformed);
        setFilteredRequests(transformed);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();

    // Refresh every 30 seconds
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let filtered = [...requests];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.order_number.toLowerCase().includes(term) ||
        r.customer_name.toLowerCase().includes(term) ||
        r.customer_email.toLowerCase().includes(term) ||
        r.booking.product_name.toLowerCase().includes(term) ||
        r.booking.provider?.company_name?.toLowerCase().includes(term)
      );
    }

    setFilteredRequests(filtered);
  }, [requests, statusFilter, searchTerm]);

  const handleRequestClick = (request: CancellationRequest) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  };

  const handleRequestProcessed = () => {
    // Refresh the list by re-running the fetch
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('cancellation_request')
          .select(`
            *,
            booking:booking_id (
              id,
              booking_date,
              trip_end_date,
              product_name,
              total_amount_paid,
              provider_id,
              product_type,
              product_id
            )
          `)
          .order('requested_at', { ascending: false });

        if (error) {
          console.error('Error fetching cancellation requests:', error);
          return;
        }

        if (!data || data.length === 0) {
          setRequests([]);
          setFilteredRequests([]);
          setLoading(false);
          return;
        }

        const providerIds = [...new Set(data.map((req: any) => req.booking?.provider_id).filter(Boolean))];

        let providersMap: Record<string, { company_name: string; contact_name: string }> = {};
        if (providerIds.length > 0) {
          const { data: providersData } = await supabase
            .from('profile')
            .select('id, company_name, contact_name')
            .in('id', providerIds);

          if (providersData) {
            providersMap = providersData.reduce((acc, provider) => {
              acc[provider.id] = {
                company_name: provider.company_name,
                contact_name: provider.contact_name,
              };
              return acc;
            }, {} as Record<string, { company_name: string; contact_name: string }>);
          }
        }

        const transformed = (data || []).map((req: any) => ({
          ...req,
          booking: {
            ...req.booking,
            provider: req.booking?.provider_id ? providersMap[req.booking.provider_id] || null : null,
          },
        })) as CancellationRequest[];

        setRequests(transformed);
        setFilteredRequests(transformed);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{requests.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Attesa</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approvate</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{approvedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rifiutate</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{rejectedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Richieste di Cancellazione</CardTitle>
            <CardDescription>
              Gestisci tutte le richieste di cancellazione da tutti i provider
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per ordine, cliente, prodotto, provider..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filtra per stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="pending">In attesa</SelectItem>
                  <SelectItem value="approved">Approvate</SelectItem>
                  <SelectItem value="rejected">Rifiutate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessuna richiesta trovata
              </div>
            ) : (
              <ScrollArea className="w-full">
                <div className="min-w-[1000px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs md:text-sm">Ordine</TableHead>
                        <TableHead className="text-xs md:text-sm">Cliente</TableHead>
                        <TableHead className="text-xs md:text-sm">Prodotto</TableHead>
                        <TableHead className="text-xs md:text-sm">Provider</TableHead>
                        <TableHead className="text-xs md:text-sm">Data Prenotazione</TableHead>
                        <TableHead className="text-xs md:text-sm">Richiesta il</TableHead>
                        <TableHead className="text-xs md:text-sm">Stato</TableHead>
                        <TableHead className="text-xs md:text-sm">Azioni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((request) => (
                        <TableRow
                          key={request.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleRequestClick(request)}
                        >
                          <TableCell className="font-semibold text-xs md:text-sm">
                            {request.order_number}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            <div>{request.customer_name}</div>
                            <div className="text-muted-foreground text-[10px]">{request.customer_email}</div>
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {request.booking.product_name}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {request.booking.provider?.company_name || 'N/A'}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {format(new Date(request.booking.booking_date), 'dd MMM yyyy', { locale: it })}
                          </TableCell>
                          <TableCell className="text-xs md:text-sm">
                            {format(new Date(request.requested_at), 'dd MMM yyyy HH:mm', { locale: it })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                request.status === 'pending'
                                  ? 'default'
                                  : request.status === 'approved'
                                  ? 'default'
                                  : 'secondary'
                              }
                              className={
                                request.status === 'pending'
                                  ? 'bg-warning/10 text-warning border-warning/20'
                                  : request.status === 'approved'
                                  ? 'bg-success/10 text-success border-success/20'
                                  : 'bg-destructive/10 text-destructive border-destructive/20'
                              }
                            >
                              {request.status === 'pending' && (
                                <>
                                  <Clock className="h-3 w-3 mr-1" />
                                  In attesa
                                </>
                              )}
                              {request.status === 'approved' && (
                                <>
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Approvata
                                </>
                              )}
                              {request.status === 'rejected' && (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Rifiutata
                                </>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {request.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRequestClick(request);
                                }}
                              >
                                Gestisci
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <AdminCancellationRequestDialog
        request={selectedRequest}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onProcessed={handleRequestProcessed}
      />
    </>
  );
};


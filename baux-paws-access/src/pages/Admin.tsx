import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Copy, Plus, LogOut, Users, Ticket, Building2, BarChart3, Package, ExternalLink, AlertCircle } from "lucide-react";
import AdminAnalytics from "@/components/AdminAnalytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProductForm, ProductList, AdminCancellationRequests } from "@/components/admin";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  fetchAllProducts, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} from "@/services/product.service";
import type { Product, ProductFormData } from "@/types/product.types";
import type { Provider, SignupCode } from "@/types/provider.types";

interface BookingStats {
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [codes, setCodes] = useState<SignupCode[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [providerBookings, setProviderBookings] = useState<Record<string, BookingStats>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [showProviderDetail, setShowProviderDetail] = useState(false);
  
  // Product management state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productFormLoading, setProductFormLoading] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchCodes();
      fetchProviders();
      fetchProducts();

      const codesChannel = supabase
        .channel('signup-codes-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'signup_code' }, () => fetchCodes())
        .subscribe();

      const profilesChannel = supabase
        .channel('profiles-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profile' }, () => fetchProviders())
        .subscribe();

      return () => {
        supabase.removeChannel(codesChannel);
        supabase.removeChannel(profilesChannel);
      };
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from('user_role')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roles) {
      toast({
        title: "Accesso negato",
        description: "Non hai i permessi per accedere a questa pagina.",
        variant: "destructive",
      });
      navigate("/dashboard");
      return;
    }

    setIsAdmin(true);
  };

  const fetchCodes = async () => {
    const { data, error } = await supabase
      .from('signup_code')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile caricare i codici.",
        variant: "destructive",
      });
      return;
    }

    setCodes(data || []);
  };

  const fetchProviders = async () => {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profile')
      .select('*')
      .order('created_at', { ascending: false });

    if (profilesError) {
      toast({
        title: "Errore",
        description: "Impossibile caricare i provider.",
        variant: "destructive",
      });
      return;
    }

    const { data: adminRoles } = await supabase
      .from('user_role')
      .select('user_id')
      .eq('role', 'admin');

    const adminIds = new Set(adminRoles?.map(r => r.user_id) || []);
    const providersList = (profilesData || []).filter(p => !adminIds.has(p.id));
    
    setProviders(providersList);

    const { data: bookingsData } = await supabase
      .from('booking')
      .select('provider_id, status');

    if (bookingsData) {
      const statsMap: Record<string, BookingStats> = {};
      
      providersList.forEach(provider => {
        statsMap[provider.id] = { pending: 0, confirmed: 0, completed: 0, cancelled: 0 };
      });

      bookingsData.forEach(booking => {
        if (statsMap[booking.provider_id]) {
          const status = booking.status as keyof BookingStats;
          if (status in statsMap[booking.provider_id]) {
            statsMap[booking.provider_id][status]++;
          }
        }
      });

      setProviderBookings(statsMap);
    }
  };

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const data = await fetchAllProducts();
      setProducts(data);
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile caricare i prodotti.",
        variant: "destructive",
      });
    } finally {
      setProductsLoading(false);
    }
  };

  const handleCreateProduct = async (formData: ProductFormData) => {
    setProductFormLoading(true);
    try {
      const newProduct = await createProduct(formData);
      toast({
        title: "Prodotto creato",
        description: "Il prodotto è stato creato con successo. Ora puoi gestire la disponibilità.",
      });
      // Set the newly created product as editingProduct to enable availability tab
      setEditingProduct(newProduct);
      setShowProductForm(false);
      fetchProducts();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile creare il prodotto.",
        variant: "destructive",
      });
    } finally {
      setProductFormLoading(false);
    }
  };

  const handleUpdateProduct = async (formData: ProductFormData) => {
    if (!editingProduct) return;
    
    setProductFormLoading(true);
    try {
      await updateProduct(editingProduct.type, editingProduct.id, formData);
      toast({
        title: "Prodotto aggiornato",
        description: "Il prodotto è stato aggiornato con successo.",
      });
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error('[Admin] Error updating product:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Impossibile aggiornare il prodotto. Verifica che la migration sia stata eseguita.';
      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setProductFormLoading(false);
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    try {
      await deleteProduct(product.type, product.id);
      toast({
        title: "Prodotto eliminato",
        description: "Il prodotto è stato eliminato con successo.",
      });
      fetchProducts();
    } catch (error) {
      toast({
        title: "Errore",
        description: "Impossibile eliminare il prodotto.",
        variant: "destructive",
      });
    }
  };

  const generateCode = async () => {
    setLoading(true);

    const { data, error } = await supabase.rpc('generate_signup_code');

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile generare il codice.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Codice generato",
        description: `Nuovo codice: ${data}`,
      });
      fetchCodes();
    }

    setLoading(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copiato",
      description: "Codice copiato negli appunti.",
    });
  };

  const toggleProviderStatus = async (provider: Provider) => {
    const newStatus = !provider.active;
    
    const { error } = await supabase
      .from('profile')
      .update({ active: newStatus })
      .eq('id', provider.id);

    if (error) {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato del provider.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Stato aggiornato",
        description: `Provider ${newStatus ? 'attivato' : 'disattivato'}.`,
      });
      fetchProviders();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const openProviderDetail = (provider: Provider) => {
    setSelectedProvider(provider);
    setShowProviderDetail(true);
  };

  const getTotalBookings = (providerId: string) => {
    const stats = providerBookings[providerId];
    if (!stats) return 0;
    return stats.pending + stats.confirmed + stats.completed + stats.cancelled;
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-3 md:p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-1 md:mb-2">Admin Panel</h1>
            <p className="text-sm md:text-base text-muted-foreground">Gestione provider, prodotti e codici di registrazione</p>
          </div>
          <Button variant="outline" onClick={handleLogout} size="sm" className="w-full sm:w-auto">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="providers" className="space-y-4 md:space-y-6">
          <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="providers" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm flex-1 sm:flex-none">
              <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Provider</span>
              <span className="sm:hidden">Prov.</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm flex-1 sm:flex-none">
              <Package className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Prodotti</span>
              <span className="sm:hidden">Prod.</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm flex-1 sm:flex-none">
              <BarChart3 className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger value="codes" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm flex-1 sm:flex-none">
              <Ticket className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Codici</span>
              <span className="sm:hidden">Cod.</span>
            </TabsTrigger>
            <TabsTrigger value="cancellations" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm flex-1 sm:flex-none">
              <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Cancellazioni</span>
              <span className="sm:hidden">Canc.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics">
            <AdminAnalytics />
          </TabsContent>

          <TabsContent value="providers">
            <Card>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Building2 className="h-4 w-4 md:h-5 md:w-5" />
                  Lista Provider
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Gestisci i provider registrati e visualizza le loro statistiche
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2 md:px-6">
                <ScrollArea className="w-full">
                  <div className="min-w-[700px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs md:text-sm">Azienda</TableHead>
                          <TableHead className="text-xs md:text-sm">Contatto</TableHead>
                          <TableHead className="text-xs md:text-sm">Email</TableHead>
                          <TableHead className="text-xs md:text-sm">Stato</TableHead>
                          <TableHead className="text-xs md:text-sm">Pren.</TableHead>
                          <TableHead className="text-xs md:text-sm">Registrato</TableHead>
                          <TableHead className="text-xs md:text-sm">Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {providers.map((provider) => (
                          <TableRow 
                            key={provider.id} 
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => openProviderDetail(provider)}
                          >
                            <TableCell className="font-semibold text-xs md:text-sm">{provider.company_name}</TableCell>
                            <TableCell className="text-xs md:text-sm">{provider.contact_name}</TableCell>
                            <TableCell className="text-muted-foreground text-xs md:text-sm">{provider.email}</TableCell>
                            <TableCell>
                              {provider.active ? (
                                <Badge variant="default" className="bg-success text-success-foreground text-[10px] md:text-xs">Attivo</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] md:text-xs">Disattivo</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-xs md:text-sm">{getTotalBookings(provider.id)}</span>
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">{new Date(provider.created_at).toLocaleDateString('it-IT')}</TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Switch
                                checked={provider.active}
                                onCheckedChange={() => toggleProviderStatus(provider)}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                        {providers.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground text-xs md:text-sm">
                              Nessun provider registrato
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            {showProductForm || editingProduct ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        {editingProduct ? 'Modifica Prodotto' : 'Nuovo Prodotto'}
                      </CardTitle>
                      <CardDescription>
                        {editingProduct 
                          ? 'Modifica le informazioni del prodotto' 
                          : 'Crea un nuovo prodotto per un provider'}
                      </CardDescription>
                    </div>
                    {editingProduct && (
                      <a
                        href={`https://flixdog.com/prodotto/${editingProduct.type}/${encodeURIComponent(editingProduct.id)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Vedi sul sito
                      </a>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <ProductForm
                    providers={providers}
                    onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct}
                    onCancel={() => {
                      setShowProductForm(false);
                      setEditingProduct(null);
                    }}
                    initialData={editingProduct || undefined}
                    isLoading={productFormLoading}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => setShowProductForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuovo Prodotto
                  </Button>
                </div>
                <ProductList
                  products={products}
                  providers={providers}
                  onEdit={(product) => setEditingProduct(product)}
                  onDelete={handleDeleteProduct}
                  isLoading={productsLoading}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancellations">
            <AdminCancellationRequests />
          </TabsContent>

          <TabsContent value="codes">
            <Card className="mb-4 md:mb-6">
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-base md:text-lg">Genera Nuovo Codice</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Crea un nuovo codice di registrazione monouso per un fornitore
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 md:px-6">
                <Button onClick={generateCode} disabled={loading} size="sm" className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  {loading ? "Generazione..." : "Genera Codice"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="px-4 md:px-6">
                <CardTitle className="text-base md:text-lg">Codici di Registrazione</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Tutti i codici generati e il loro stato
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2 md:px-6">
                <ScrollArea className="w-full">
                  <div className="min-w-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs md:text-sm">Codice</TableHead>
                          <TableHead className="text-xs md:text-sm">Stato</TableHead>
                          <TableHead className="text-xs md:text-sm">Creato</TableHead>
                          <TableHead className="text-xs md:text-sm">Utilizzato</TableHead>
                          <TableHead className="text-xs md:text-sm">Azioni</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {codes.map((code) => (
                          <TableRow key={code.id}>
                            <TableCell className="font-mono font-semibold text-xs md:text-sm">{code.code}</TableCell>
                            <TableCell>
                              {code.used ? (
                                <Badge variant="secondary" className="text-[10px] md:text-xs">Usato</Badge>
                              ) : (
                                <Badge variant="default" className="text-[10px] md:text-xs">Disponibile</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs md:text-sm">{new Date(code.created_at).toLocaleDateString('it-IT')}</TableCell>
                            <TableCell className="text-xs md:text-sm">
                              {code.used_at ? new Date(code.used_at).toLocaleDateString('it-IT') : '-'}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyCode(code.code)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {codes.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground text-xs md:text-sm">
                              Nessun codice generato
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Provider Detail Dialog */}
        <Dialog open={showProviderDetail} onOpenChange={setShowProviderDetail}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-2xl">{selectedProvider?.company_name}</DialogTitle>
              <DialogDescription className="text-xs md:text-sm">Dettagli e statistiche del provider</DialogDescription>
            </DialogHeader>
            
            {selectedProvider && (
              <div className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Contatto</p>
                    <p className="font-medium text-sm md:text-base">{selectedProvider.contact_name}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Email</p>
                    <p className="font-medium text-sm md:text-base truncate">{selectedProvider.email}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Telefono</p>
                    <p className="font-medium text-sm md:text-base">{selectedProvider.phone || 'Non specificato'}</p>
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-muted-foreground">Stato</p>
                    <div className="flex items-center gap-2">
                      {selectedProvider.active ? (
                        <Badge variant="default" className="bg-success text-success-foreground text-[10px] md:text-xs">Attivo</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] md:text-xs">Disattivo</Badge>
                      )}
                      <Switch
                        checked={selectedProvider.active}
                        onCheckedChange={() => {
                          toggleProviderStatus(selectedProvider);
                          setSelectedProvider({ ...selectedProvider, active: !selectedProvider.active });
                        }}
                      />
                    </div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <p className="text-xs md:text-sm text-muted-foreground">Data Registrazione</p>
                    <p className="font-medium text-sm md:text-base">{new Date(selectedProvider.created_at).toLocaleDateString('it-IT')}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-sm md:text-base mb-2 md:mb-3">Statistiche Prenotazioni</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                    <Card className="p-3 md:p-4">
                      <p className="text-[10px] md:text-sm text-muted-foreground">In attesa</p>
                      <p className="text-lg md:text-2xl font-bold text-warning">
                        {providerBookings[selectedProvider.id]?.pending || 0}
                      </p>
                    </Card>
                    <Card className="p-3 md:p-4">
                      <p className="text-[10px] md:text-sm text-muted-foreground">Confermate</p>
                      <p className="text-lg md:text-2xl font-bold text-info">
                        {providerBookings[selectedProvider.id]?.confirmed || 0}
                      </p>
                    </Card>
                    <Card className="p-3 md:p-4">
                      <p className="text-[10px] md:text-sm text-muted-foreground">Completate</p>
                      <p className="text-lg md:text-2xl font-bold text-success">
                        {providerBookings[selectedProvider.id]?.completed || 0}
                      </p>
                    </Card>
                    <Card className="p-3 md:p-4">
                      <p className="text-[10px] md:text-sm text-muted-foreground">Cancellate</p>
                      <p className="text-lg md:text-2xl font-bold text-destructive">
                        {providerBookings[selectedProvider.id]?.cancelled || 0}
                      </p>
                    </Card>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Admin;

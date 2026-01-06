/**
 * Product List Component
 * Displays all products with filtering and actions
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Package, MoreVertical, Pencil, Trash2, MapPin, Clock, Calendar, Image } from 'lucide-react';
import type { Product, ProductType } from '@/types/product.types';
import type { Provider } from '@/types/provider.types';
import { getProductTypeLabel } from '@/services/product.service';

interface ProductListProps {
  products: Product[];
  providers: Provider[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  isLoading?: boolean;
}

export function ProductList({ 
  products, 
  providers,
  onEdit, 
  onDelete,
  isLoading = false 
}: ProductListProps) {
  const [filterType, setFilterType] = useState<ProductType | 'all'>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const getProviderName = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    return provider?.company_name || 'N/A';
  };

  const getTypeColor = (type: ProductType) => {
    const colors: Record<ProductType, string> = {
      class: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      experience: 'bg-green-500/10 text-green-600 border-green-500/20',
      trip: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    };
    return colors[type];
  };

  const formatPrice = (product: Product) => {
    if (product.pricing_type === 'linear') {
      const parts = [];
      if (product.price_adult_base) parts.push(`€${product.price_adult_base}/adulto`);
      if (product.price_dog_base) parts.push(`€${product.price_dog_base}/cane`);
      return parts.join(' + ') || 'N/A';
    }
    if (product.predefined_prices?.length) {
      return `${product.predefined_prices.length} config.`;
    }
    return 'N/A';
  };

  const getDuration = (product: Product) => {
    if (product.type === 'trip') {
      return `${product.duration_days} giorni`;
    }
    return `${(product as { duration_hours: number }).duration_hours}h`;
  };

  const getLocation = (product: Product) => {
    if (product.type === 'trip') {
      return product.location;
    }
    return (product as { meeting_point: string | null }).meeting_point;
  };

  const filteredProducts = products.filter(p => {
    if (filterType !== 'all' && p.type !== filterType) return false;
    if (filterProvider !== 'all' && p.provider_id !== filterProvider) return false;
    return true;
  });

  const handleDeleteConfirm = () => {
    if (deleteProduct) {
      onDelete(deleteProduct);
      setDeleteProduct(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Caricamento prodotti...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Prodotti
              </CardTitle>
              <CardDescription>
                {filteredProducts.length} prodotti trovati
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={(v) => setFilterType(v as ProductType | 'all')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i tipi</SelectItem>
                  <SelectItem value="class">Classi</SelectItem>
                  <SelectItem value="experience">Esperienze</SelectItem>
                  <SelectItem value="trip">Viaggi</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterProvider} onValueChange={setFilterProvider}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i provider</SelectItem>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Durata</TableHead>
                <TableHead>Località</TableHead>
                <TableHead>Immagini</TableHead>
                <TableHead>Prezzo</TableHead>
                <TableHead>Max</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={`${product.type}-${product.id}`}>
                  <TableCell className="font-semibold">{product.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getTypeColor(product.type)}>
                      {getProductTypeLabel(product.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getProviderName(product.provider_id)}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm">
                      {product.type === 'trip' ? (
                        <Calendar className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                      {getDuration(product)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getLocation(product) ? (
                      <span className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3" />
                        {getLocation(product)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Image className="h-3 w-3" />
                      {product.images?.length || 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{formatPrice(product)}</TableCell>
                  <TableCell>{product.max_adults} adulti / {product.max_dogs} cani</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(product)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifica
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => setDeleteProduct(product)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Nessun prodotto trovato
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteProduct} onOpenChange={(open) => !open && setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare "{deleteProduct?.name}"? Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * FAQ Selector Component
 * Manages FAQ associations for products (select existing or create new)
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { FAQ, ProductFAQ } from '@/types/product.types';
import { supabase } from '@/integrations/supabase/client';
import { loadProductFAQs } from '@/services/product.service';

interface FAQSelectorProps {
  productId?: string;
  productType: 'experience' | 'class' | 'trip';
  selectedFAQs: Array<{ faq_id: string; order_index: number }>;
  onFAQsChange: (faqs: Array<{ faq_id: string; order_index: number }>) => void;
}

interface FAQWithOrder extends FAQ {
  order_index: number;
  product_faq_id?: string;
}

export function FAQSelector({
  productId,
  productType,
  selectedFAQs,
  onFAQsChange,
}: FAQSelectorProps) {
  const { toast } = useToast();
  const [allFAQs, setAllFAQs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFAQId, setSelectedFAQId] = useState<string>('');
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [showNewFAQForm, setShowNewFAQForm] = useState(false);
  const [savingNewFAQ, setSavingNewFAQ] = useState(false);

  // Load all FAQs
  useEffect(() => {
    loadAllFAQs();
  }, []);

  // Load product FAQs when editing
  useEffect(() => {
    if (productId) {
      loadProductFAQs();
    }
  }, [productId, productType]);

  const loadAllFAQs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('faq')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllFAQs(data || []);
    } catch (error) {
      console.error('Error loading FAQs:', error);
      toast({
        title: 'Errore',
        description: 'Errore nel caricamento delle FAQ',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProductFAQs = async () => {
    if (!productId) return;

    setLoading(true);
    try {
      const faqs = await loadProductFAQs(productId, productType);
      onFAQsChange(faqs);
    } catch (error) {
      console.error('Error loading product FAQs:', error);
      toast({
        title: 'Errore',
        description: 'Errore nel caricamento delle FAQ del prodotto',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddExistingFAQ = () => {
    if (!selectedFAQId) {
      toast({
        title: 'Errore',
        description: 'Seleziona una FAQ da aggiungere',
        variant: 'destructive',
      });
      return;
    }

    // Check if already added
    if (selectedFAQs.some(f => f.faq_id === selectedFAQId)) {
      toast({
        title: 'Attenzione',
        description: 'Questa FAQ è già stata aggiunta',
        variant: 'destructive',
      });
      return;
    }

    const maxOrder = selectedFAQs.length > 0
      ? Math.max(...selectedFAQs.map(f => f.order_index))
      : -1;

    const newFAQs = [
      ...selectedFAQs,
      { faq_id: selectedFAQId, order_index: maxOrder + 1 },
    ];

    onFAQsChange(newFAQs);
    setSelectedFAQId('');
  };

  const handleCreateNewFAQ = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast({
        title: 'Errore',
        description: 'Compila sia la domanda che la risposta',
        variant: 'destructive',
      });
      return;
    }

    setSavingNewFAQ(true);
    try {
      const { data, error } = await supabase
        .from('faq')
        .insert({
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Add to all FAQs list
      setAllFAQs(prev => [data, ...prev]);

      // Add to selected FAQs
      const maxOrder = selectedFAQs.length > 0
        ? Math.max(...selectedFAQs.map(f => f.order_index))
        : -1;

      const newFAQs = [
        ...selectedFAQs,
        { faq_id: data.id, order_index: maxOrder + 1 },
      ];

      onFAQsChange(newFAQs);

      // Reset form
      setNewQuestion('');
      setNewAnswer('');
      setShowNewFAQForm(false);

      toast({
        title: 'Successo',
        description: 'FAQ creata e aggiunta al prodotto',
      });
    } catch (error) {
      console.error('Error creating FAQ:', error);
      toast({
        title: 'Errore',
        description: 'Errore nella creazione della FAQ',
        variant: 'destructive',
      });
    } finally {
      setSavingNewFAQ(false);
    }
  };

  const handleRemoveFAQ = (faqId: string) => {
    const newFAQs = selectedFAQs
      .filter(f => f.faq_id !== faqId)
      .map((f, index) => ({ ...f, order_index: index }));
    onFAQsChange(newFAQs);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;

    const newFAQs = [...selectedFAQs];
    [newFAQs[index - 1], newFAQs[index]] = [newFAQs[index], newFAQs[index - 1]];
    
    // Update order_index
    const reordered = newFAQs.map((f, i) => ({ ...f, order_index: i }));
    onFAQsChange(reordered);
  };

  const handleMoveDown = (index: number) => {
    if (index === selectedFAQs.length - 1) return;

    const newFAQs = [...selectedFAQs];
    [newFAQs[index], newFAQs[index + 1]] = [newFAQs[index + 1], newFAQs[index]];
    
    // Update order_index
    const reordered = newFAQs.map((f, i) => ({ ...f, order_index: i }));
    onFAQsChange(reordered);
  };

  const getSelectedFAQData = (faqId: string): FAQ | undefined => {
    return allFAQs.find(f => f.id === faqId);
  };

  const availableFAQs = allFAQs.filter(
    f => !selectedFAQs.some(sf => sf.faq_id === f.id)
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">FAQ</CardTitle>
          <p className="text-sm text-muted-foreground">
            Aggiungi FAQ al prodotto. Puoi selezionare FAQ esistenti o crearne di nuove.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Existing FAQ */}
          <div className="space-y-2">
            <Label>Seleziona FAQ Esistente</Label>
            <div className="flex gap-2">
              <Select value={selectedFAQId} onValueChange={setSelectedFAQId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleziona una FAQ esistente" />
                </SelectTrigger>
                <SelectContent>
                  {availableFAQs.length === 0 ? (
                    <SelectItem value="" disabled>
                      Nessuna FAQ disponibile
                    </SelectItem>
                  ) : (
                    availableFAQs.map(faq => (
                      <SelectItem key={faq.id} value={faq.id}>
                        {faq.question}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                type="button"
                onClick={handleAddExistingFAQ}
                disabled={!selectedFAQId || loading}
              >
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi
              </Button>
            </div>
          </div>

          {/* Create New FAQ */}
          {!showNewFAQForm ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowNewFAQForm(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Crea Nuova FAQ
            </Button>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Nuova FAQ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-question">Domanda <span className="text-red-500">*</span></Label>
                  <Input
                    id="new-question"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="Es: Quali documenti servono?"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-answer">Risposta <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="new-answer"
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    placeholder="Es: È necessario portare il libretto sanitario del cane..."
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleCreateNewFAQ}
                    disabled={!newQuestion.trim() || !newAnswer.trim() || savingNewFAQ}
                  >
                    {savingNewFAQ ? 'Salvataggio...' : 'Crea e Aggiungi'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNewFAQForm(false);
                      setNewQuestion('');
                      setNewAnswer('');
                    }}
                  >
                    Annulla
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Selected FAQs List */}
          {selectedFAQs.length > 0 && (
            <div className="space-y-2">
              <Label>FAQ Selezionate ({selectedFAQs.length})</Label>
              <div className="space-y-2">
                {selectedFAQs
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((selectedFAQ, index) => {
                    const faqData = getSelectedFAQData(selectedFAQ.faq_id);
                    if (!faqData) return null;

                    return (
                      <Card key={selectedFAQ.faq_id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-2">
                            <div className="flex flex-col gap-1 mt-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleMoveUp(index)}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleMoveDown(index)}
                                disabled={index === selectedFAQs.length - 1}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="flex-1 space-y-2">
                              <div>
                                <p className="font-semibold">{faqData.question}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {faqData.answer}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveFAQ(selectedFAQ.faq_id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


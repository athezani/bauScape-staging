/**
 * Date Picker Component
 * Custom date picker that starts from current month
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DatePickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  className?: string;
}

export function DatePicker({ id, label, value, onChange, min, className }: DatePickerProps) {
  // Il browser HTML5 date picker mostra automaticamente il mese corrente
  // quando l'input è vuoto e viene aperto il calendario
  // Non serve impostare un valore di default

  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min || new Date().toISOString().split('T')[0]}
        // Il browser HTML5 date picker mostra automaticamente il mese corrente
        // quando l'input è vuoto e viene aperto il calendario
      />
    </div>
  );
}


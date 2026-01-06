/**
 * Application-wide constants and configuration
 */

import type { BookingStatus } from '@/types';

// Status color mappings for UI components
export const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  confirmed: 'bg-success/10 text-success border-success/20',
  completed: 'bg-info/10 text-info border-info/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};

export const STATUS_COLORS_CALENDAR: Record<BookingStatus, string> = {
  pending: 'bg-warning/20 hover:bg-warning/30 text-warning border-warning/30',
  confirmed: 'bg-success/20 hover:bg-success/30 text-success border-success/30',
  completed: 'bg-info/20 hover:bg-info/30 text-info border-info/30',
  cancelled: 'bg-destructive/20 hover:bg-destructive/30 text-destructive border-destructive/30',
};

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: 'In attesa',
  confirmed: 'Confermato',
  completed: 'Completato',
  cancelled: 'Cancellato',
};

export const STATUS_LABELS_EN: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

// Event type icons
export const EVENT_TYPE_ICONS: Record<string, string> = {
  trip: '🚗',
  class: '📚',
  experience: '📅',
};

// Chart colors for analytics
export const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const CHART_STATUS_COLORS: Record<BookingStatus, string> = {
  completed: '#22c55e',
  confirmed: '#3b82f6',
  pending: '#f59e0b',
  cancelled: '#ef4444',
};

// Week days (Italian)
export const WEEK_DAYS_IT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

// Date formats
export const DATE_FORMAT = {
  short: 'dd/MM',
  medium: 'dd MMM yyyy',
  long: 'dd MMMM yyyy',
  monthYear: 'MMMM yyyy',
};
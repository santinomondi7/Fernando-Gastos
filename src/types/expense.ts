export type PaymentMethod =
  | 'efectivo'
  | 'debito'
  | 'credito'
  | 'transferencia'
  | 'mercadopago'
  | 'otro';

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  amount: number; // Almacenado como NUMERIC(14,2) en PostgreSQL y convertido con precisión de centavos
  category_id: string;
  description: string | null;
  expense_date: string; // Formato YYYY-MM-DD local (America/Argentina/Cordoba)
  payment_method: PaymentMethod | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseWithCategory extends Expense {
  category?: Category;
}

export type PeriodPreset =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'last_30_days'
  | 'custom';

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  label: string;
}

export interface ExpenseFormValues {
  amountInput: string;
  category_id: string;
  description: string;
  expense_date: string;
  payment_method: PaymentMethod | '';
}

export interface VoiceParsedDraft {
  rawTranscript: string;
  amount: number | null;
  amountInput: string;
  category_id: string;
  categoryConfidence: 'high' | 'low' | 'none';
  matchedCategoryName: string | null;
  description: string;
  expense_date: string;
  payment_method: PaymentMethod | '';
  warnings: string[];
}

export interface CategorySummaryItem {
  category_id: string;
  category_name: string;
  color: string;
  icon: string;
  total: number;
  count: number;
  percentage: number;
  previousTotal: number;
  deltaAmount: number;
  deltaPercentage: number | null;
}

export interface DailyEvolutionPoint {
  date: string;      // YYYY-MM-DD
  label: string;     // DD/MM
  total: number;
  count: number;
}

export interface ExpenseStatistics {
  totalPeriod: number;
  countPeriod: number;
  averagePerExpense: number;
  averagePerDay: number;
  topCategory: CategorySummaryItem | null;
  byCategory: CategorySummaryItem[];
  dailyEvolution: DailyEvolutionPoint[];
  previousPeriodTotal: number;
  previousPeriodDelta: number;
  previousPeriodPercentage: number | null;
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  efectivo: 'Efectivo',
  debito: 'Tarjeta de débito',
  credito: 'Tarjeta de crédito',
  transferencia: 'Transferencia',
  mercadopago: 'Mercado Pago / QR',
  otro: 'Otro',
};

export const DEFAULT_INITIAL_CATEGORIES: Array<{
  name: string;
  icon: string;
  color: string;
}> = [
  { name: 'Comida y supermercado', icon: 'shopping-cart', color: '#0F766E' },
  { name: 'Combustible y transporte', icon: 'car', color: '#B45309' },
  { name: 'Servicios e impuestos', icon: 'file-text', color: '#1D4ED8' },
  { name: 'Salud', icon: 'heart-pulse', color: '#BE123C' },
  { name: 'Compras personales', icon: 'shopping-bag', color: '#6D28D9' },
  { name: 'Hogar', icon: 'home', color: '#047857' },
  { name: 'Salidas y entretenimiento', icon: 'utensils', color: '#C2410C' },
  { name: 'Deporte', icon: 'dumbbell', color: '#0369A1' },
  { name: 'Otros', icon: 'circle-dot', color: '#475569' },
];

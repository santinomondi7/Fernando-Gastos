import { Category, Expense, PAYMENT_METHOD_LABELS } from '../types/expense';
import { fromCents, toCents } from './currency';
import { formatDateAR, formatTimestampAR } from './dates';

/**
 * Sanitiza un campo de texto contra inyección de fórmulas en planillas de cálculo (CSV Injection / DDE).
 * Si el texto comienza con =, +, -, @, tabulación o retorno de carro, antepone una comilla simple (').
 */
export function sanitizeCsvTextCell(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = String(value).replace(/\r?\n/g, ' ').trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

/**
 * Escapa una celda para CSV utilizando punto y coma (;) como separador estándar de Excel en español.
 */
function escapeCsvCell(raw: string): string {
  const escapedQuotes = raw.replace(/"/g, '""');
  if (/[;"\n\r]/.test(escapedQuotes)) {
    return `"${escapedQuotes}"`;
  }
  return escapedQuotes;
}

/**
 * Formatea un importe numérico para Excel en español (ej. "18500,50" sin símbolo $ para permitir sumas directas).
 */
export function formatAmountForCsv(amount: number): string {
  const safe = fromCents(toCents(amount));
  return safe.toFixed(2).replace('.', ',');
}

/**
 * Genera el contenido completo del archivo CSV con BOM UTF-8 (\uFEFF) para preservar tildes y eñes en Excel.
 */
export function buildExpensesCsvContent(
  expenses: Expense[],
  categories: Category[]
): string {
  const categoryMap = new Map<string, string>();
  categories.forEach((c) => categoryMap.set(c.id, c.name));

  const headers = [
    'Fecha',
    'Importe (ARS)',
    'Categoría',
    'Descripción',
    'Medio de pago',
    'Fecha de creación del registro',
  ];

  const rows: string[] = [headers.map(escapeCsvCell).join(';')];

  for (const exp of expenses) {
    const fecha = formatDateAR(exp.expense_date, 'short');
    const importe = formatAmountForCsv(exp.amount);
    const categoria = sanitizeCsvTextCell(
      categoryMap.get(exp.category_id) || 'Sin categoría'
    );
    const descripcion = sanitizeCsvTextCell(exp.description || '');
    const medioPago = exp.payment_method
      ? sanitizeCsvTextCell(PAYMENT_METHOD_LABELS[exp.payment_method] || exp.payment_method)
      : '';
    const creadoEn = formatTimestampAR(exp.created_at);

    rows.push(
      [fecha, importe, categoria, descripcion, medioPago, creadoEn]
        .map(escapeCsvCell)
        .join(';')
    );
  }

  // Incluir BOM UTF-8 para que Microsoft Excel detecte codificación UTF-8 automáticamente
  return `\uFEFF${rows.join('\r\n')}`;
}

/**
 * Descarga el archivo CSV en el navegador del usuario.
 */
export function downloadExpensesCsv(
  expenses: Expense[],
  categories: Category[],
  filenamePrefix = 'gastos'
): void {
  const csvContent = buildExpensesCsvContent(expenses, categories);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.setAttribute('download', `${filenamePrefix}_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

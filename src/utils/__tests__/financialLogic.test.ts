import { describe, expect, it } from 'vitest';
import { Category, DEFAULT_INITIAL_CATEGORIES, Expense } from '../../types/expense';
import { buildExpensesCsvContent, sanitizeCsvTextCell } from '../csvExport';
import { formatARS, parseARSInput, sumAmounts } from '../currency';
import {
  formatDateAR,
  getDateRangeForPreset,
  getPreviousEquivalentRange,
} from '../dates';
import { computeHeadlineTotals, computePeriodStatistics } from '../statistics';
import { validateCategoryName, validateExpenseForm } from '../validation';
import { parseVoiceExpenseTranscript } from '../voiceParser';

const TEST_CATEGORIES: Category[] = DEFAULT_INITIAL_CATEGORIES.map((c, idx) => ({
  id: `cat-${idx + 1}`,
  user_id: 'user-1',
  name: c.name,
  icon: c.icon,
  color: c.color,
  is_active: true,
  created_at: '2026-10-01T10:00:00Z',
}));

describe('Moneda ARS y precisión aritmética', () => {
  it('suma decimales sin errores de punto flotante IEEE 754', () => {
    expect(sumAmounts([0.1, 0.2])).toBe(0.3);
    expect(sumAmounts([18500.55, 12000.45, 99.9])).toBe(30600.9);
  });

  it('interpreta correctamente separadores de miles y decimales argentinos', () => {
    expect(parseARSInput('25.000')).toEqual({ valid: true, value: 25000 });
    expect(parseARSInput('25.000,50')).toEqual({ valid: true, value: 25000.5 });
    expect(parseARSInput('1.250.000,75')).toEqual({ valid: true, value: 1250000.75 });
    expect(parseARSInput('18500')).toEqual({ valid: true, value: 18500 });
    expect(parseARSInput('18500,25')).toEqual({ valid: true, value: 18500.25 });
  });

  it('rechaza importes iguales o menores que cero y formatos inválidos', () => {
    expect(parseARSInput('0').valid).toBe(false);
    expect(parseARSInput('0,00').valid).toBe(false);
    expect(parseARSInput('-1500').valid).toBe(false);
    expect(parseARSInput('abc').valid).toBe(false);
    expect(parseARSInput('12..000').valid).toBe(false);
    expect(parseARSInput('12,50,00').valid).toBe(false);
  });

  it('formatea importes como $ 25.000,00', () => {
    expect(formatARS(25000)).toBe('$ 25.000,00');
    expect(formatARS(18500.5)).toBe('$ 18.500,50');
  });
});

describe('Fechas en zona horaria America/Argentina/Cordoba', () => {
  it('no desplaza una fecha local YYYY-MM-DD al día anterior por UTC', () => {
    expect(formatDateAR('2026-10-09', 'short')).toBe('09/10/2026');
    expect(formatDateAR('2026-10-09', 'long')).toBe('9 de octubre de 2026');
  });

  it('calcula correctamente los rangos de períodos y su período equivalente anterior', () => {
    const thisMonth = getDateRangeForPreset('this_month', undefined, '2026-10-09');
    expect(thisMonth.from).toBe('2026-10-01');
    expect(thisMonth.to).toBe('2026-10-31');

    const prevMonth = getPreviousEquivalentRange(thisMonth, 'this_month');
    expect(prevMonth.from).toBe('2026-09-01');
    expect(prevMonth.to).toBe('2026-09-30');
  });
});

describe('Validación de formulario manual y categorías', () => {
  it('acepta un gasto válido con fecha anterior y rechaza importe <= 0', () => {
    const validResult = validateExpenseForm(
      {
        amountInput: '18.500',
        category_id: 'cat-2',
        description: 'Carga de nafta',
        expense_date: '2026-10-05',
        payment_method: 'debito',
      },
      TEST_CATEGORIES
    );
    expect(validResult.valid).toBe(true);
    expect(validResult.payload?.amount).toBe(18500);
    expect(validResult.payload?.expense_date).toBe('2026-10-05');

    const invalidResult = validateExpenseForm(
      {
        amountInput: '0',
        category_id: 'cat-2',
        description: 'Gasto inválido',
        expense_date: '2026-10-05',
        payment_method: '',
      },
      TEST_CATEGORIES
    );
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.errors.amountInput).toBeDefined();
  });

  it('evita duplicar nombres de categorías', () => {
    const dup = validateCategoryName('  salud ', TEST_CATEGORIES);
    expect(dup.valid).toBe(false);

    const unique = validateCategoryName('Mascotas', TEST_CATEGORIES);
    expect(unique.valid).toBe(true);
  });
});

describe('Intérprete de gastos por voz (es-AR)', () => {
  const refToday = '2026-10-09';

  it('interpreta las 5 frases prioritarias de especificación', () => {
    const p1 = parseVoiceExpenseTranscript(
      'Gasté 18.500 pesos en combustible',
      TEST_CATEGORIES,
      refToday
    );
    expect(p1.amount).toBe(18500);
    expect(p1.matchedCategoryName).toBe('Combustible y transporte');
    expect(p1.expense_date).toBe('2026-10-09');

    const p2 = parseVoiceExpenseTranscript(
      'Ayer gasté 12.000 en el supermercado',
      TEST_CATEGORIES,
      refToday
    );
    expect(p2.amount).toBe(12000);
    expect(p2.matchedCategoryName).toBe('Comida y supermercado');
    expect(p2.expense_date).toBe('2026-10-08');

    const p3 = parseVoiceExpenseTranscript(
      'Pagué 45.000 pesos de luz',
      TEST_CATEGORIES,
      refToday
    );
    expect(p3.amount).toBe(45000);
    expect(p3.matchedCategoryName).toBe('Servicios e impuestos');

    const p4 = parseVoiceExpenseTranscript(
      'Gasté 8.500 en una cena',
      TEST_CATEGORIES,
      refToday
    );
    expect(p4.amount).toBe(8500);
    expect(p4.matchedCategoryName).toBe('Salidas y entretenimiento');

    const p5 = parseVoiceExpenseTranscript(
      'Hoy gasté 30.000 en ropa con tarjeta',
      TEST_CATEGORIES,
      refToday
    );
    expect(p5.amount).toBe(30000);
    expect(p5.matchedCategoryName).toBe('Compras personales');
    expect(p5.payment_method).toBe('credito');
  });

  it('interpreta números expresados en palabras («dieciocho mil quinientos» y «18 mil quinientos»)', () => {
    const spokenWords = parseVoiceExpenseTranscript(
      'Gasté dieciocho mil quinientos pesos en combustible',
      TEST_CATEGORIES,
      refToday
    );
    expect(spokenWords.amount).toBe(18500);

    const mixedWords = parseVoiceExpenseTranscript(
      'Gasté 18 mil quinientos en combustible',
      TEST_CATEGORIES,
      refToday
    );
    expect(mixedWords.amount).toBe(18500);
  });

  it('no inventa importes ni categorías cuando el audio es ambiguo', () => {
    const ambiguous = parseVoiceExpenseTranscript(
      'Pagué una cuenta pendiente',
      TEST_CATEGORIES,
      refToday
    );
    expect(ambiguous.amount).toBeNull();
    expect(ambiguous.category_id).toBe('');
    expect(ambiguous.warnings.length).toBeGreaterThan(0);
  });
});

describe('Cálculo de estadísticas y exportación CSV segura', () => {
  const sampleExpenses: Expense[] = [
    {
      id: 'exp-1',
      user_id: 'user-1',
      amount: 18500,
      category_id: 'cat-2', // Combustible y transporte
      description: 'Nafta YPF',
      expense_date: '2026-10-09',
      payment_method: 'debito',
      created_at: '2026-10-09T14:00:00Z',
      updated_at: '2026-10-09T14:00:00Z',
    },
    {
      id: 'exp-2',
      user_id: 'user-1',
      amount: 12000,
      category_id: 'cat-1', // Comida y supermercado
      description: 'Supermercado',
      expense_date: '2026-10-08',
      payment_method: 'efectivo',
      created_at: '2026-10-08T18:00:00Z',
      updated_at: '2026-10-08T18:00:00Z',
    },
  ];

  it('calcula totales del día, mes y distribución por categoría con exactitud', () => {
    const headlines = computeHeadlineTotals(sampleExpenses, '2026-10-09');
    expect(headlines.todayTotal).toBe(18500);
    expect(headlines.currentMonthTotal).toBe(30500);

    const range = getDateRangeForPreset('this_month', undefined, '2026-10-09');
    const stats = computePeriodStatistics(sampleExpenses, [], TEST_CATEGORIES, range);
    expect(stats.totalPeriod).toBe(30500);
    expect(stats.topCategory?.category_name).toBe('Combustible y transporte');
    expect(stats.topCategory?.total).toBe(18500);
  });

  it('protege la exportación CSV frente a inyección de fórmulas y conserva codificación UTF-8 con BOM', () => {
    expect(sanitizeCsvTextCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
    expect(sanitizeCsvTextCell('+cmd|calc')).toBe("'+cmd|calc");
    expect(sanitizeCsvTextCell('-2+3')).toBe("'-2+3");
    expect(sanitizeCsvTextCell('@import')).toBe("'@import");

    const csv = buildExpensesCsvContent(sampleExpenses, TEST_CATEGORIES);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Fecha;Importe (ARS);Categoría;Descripción;Medio de pago');
    expect(csv).toContain('09/10/2026;18500,00;Combustible y transporte;Nafta YPF;Tarjeta de débito');
  });
});

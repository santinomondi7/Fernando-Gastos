import {
  Category,
  CategorySummaryItem,
  DailyEvolutionPoint,
  DateRange,
  Expense,
  ExpenseStatistics,
} from '../types/expense';
import { fromCents, sumAmounts, toCents } from './currency';
import { addDays, daysBetweenInclusive, formatDateAR, getMonthBounds } from './dates';

/**
 * Filtra gastos que caen dentro de un rango de fechas inclusivo (YYYY-MM-DD).
 */
export function filterExpensesByDateRange(expenses: Expense[], range: DateRange): Expense[] {
  return expenses.filter(
    (e) => e.expense_date >= range.from && e.expense_date <= range.to
  );
}

/**
 * Calcula los totales rápidos del día actual y del mes actual en curso.
 */
export function computeHeadlineTotals(
  allExpenses: Expense[],
  todayStr: string
): {
  todayTotal: number;
  todayCount: number;
  currentMonthTotal: number;
  currentMonthCount: number;
} {
  const [year, month] = todayStr.split('-').map(Number);
  const monthBounds = getMonthBounds(year, month);

  const todayExpenses = allExpenses.filter((e) => e.expense_date === todayStr);
  const monthExpenses = allExpenses.filter(
    (e) => e.expense_date >= monthBounds.from && e.expense_date <= monthBounds.to
  );

  return {
    todayTotal: sumAmounts(todayExpenses.map((e) => e.amount)),
    todayCount: todayExpenses.length,
    currentMonthTotal: sumAmounts(monthExpenses.map((e) => e.amount)),
    currentMonthCount: monthExpenses.length,
  };
}

/**
 * Calcula todas las estadísticas del período seleccionado y su comparación
 * contra el período equivalente anterior usando exclusivamente datos reales.
 */
export function computePeriodStatistics(
  periodExpenses: Expense[],
  previousPeriodExpenses: Expense[],
  categories: Category[],
  range: DateRange
): ExpenseStatistics {
  const totalPeriod = sumAmounts(periodExpenses.map((e) => e.amount));
  const totalPeriodCents = toCents(totalPeriod);
  const countPeriod = periodExpenses.length;

  const previousPeriodTotal = sumAmounts(previousPeriodExpenses.map((e) => e.amount));
  const previousPeriodCents = toCents(previousPeriodTotal);

  const spanDays = daysBetweenInclusive(range.from, range.to);
  const averagePerExpense =
    countPeriod > 0 ? fromCents(Math.round(totalPeriodCents / countPeriod)) : 0;
  const averagePerDay =
    spanDays > 0 ? fromCents(Math.round(totalPeriodCents / spanDays)) : 0;

  // Mapa de categorías para búsqueda rápida
  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  // Agrupar gastos del período actual por categoría
  const currentByCatCents = new Map<string, { cents: number; count: number }>();
  for (const exp of periodExpenses) {
    const existing = currentByCatCents.get(exp.category_id) ?? { cents: 0, count: 0 };
    existing.cents += toCents(exp.amount);
    existing.count += 1;
    currentByCatCents.set(exp.category_id, existing);
  }

  // Agrupar gastos del período anterior por categoría
  const prevByCatCents = new Map<string, number>();
  for (const exp of previousPeriodExpenses) {
    const prev = prevByCatCents.get(exp.category_id) ?? 0;
    prevByCatCents.set(exp.category_id, prev + toCents(exp.amount));
  }

  // Unir todas las categorías que tuvieron movimiento en el período actual o anterior
  const allRelevantCategoryIds = new Set<string>([
    ...currentByCatCents.keys(),
    ...prevByCatCents.keys(),
  ]);

  const byCategory: CategorySummaryItem[] = [];

  for (const catId of allRelevantCategoryIds) {
    const curr = currentByCatCents.get(catId) ?? { cents: 0, count: 0 };
    const prevCents = prevByCatCents.get(catId) ?? 0;

    if (curr.cents === 0 && prevCents === 0) continue;

    const cat = categoryMap.get(catId);
    const total = fromCents(curr.cents);
    const previousTotal = fromCents(prevCents);
    const deltaAmount = fromCents(curr.cents - prevCents);
    const percentage =
      totalPeriodCents > 0
        ? Math.round((curr.cents / totalPeriodCents) * 1000) / 10
        : 0;
    const deltaPercentage =
      prevCents > 0
        ? Math.round(((curr.cents - prevCents) / prevCents) * 1000) / 10
        : null;

    byCategory.push({
      category_id: catId,
      category_name: cat ? cat.name : 'Categoría sin especificar',
      color: cat?.color || '#475569',
      icon: cat?.icon || 'receipt',
      total,
      count: curr.count,
      percentage,
      previousTotal,
      deltaAmount,
      deltaPercentage,
    });
  }

  // Ordenar por importe del período actual descendente (y en empate, por período anterior)
  byCategory.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    return b.previousTotal - a.previousTotal;
  });

  const activePeriodCategories = byCategory.filter((c) => c.total > 0);
  const topCategory = activePeriodCategories.length > 0 ? activePeriodCategories[0] : null;

  // Evolución diaria: generar serie continua si el rango es <= 92 días, o agrupar fechas con datos si es mayor
  const dailyMap = new Map<string, { cents: number; count: number }>();
  for (const exp of periodExpenses) {
    const entry = dailyMap.get(exp.expense_date) ?? { cents: 0, count: 0 };
    entry.cents += toCents(exp.amount);
    entry.count += 1;
    dailyMap.set(exp.expense_date, entry);
  }

  const dailyEvolution: DailyEvolutionPoint[] = [];
  if (spanDays <= 92) {
    for (let i = 0; i < spanDays; i++) {
      const dStr = addDays(range.from, i);
      const entry = dailyMap.get(dStr) ?? { cents: 0, count: 0 };
      dailyEvolution.push({
        date: dStr,
        label: formatDateAR(dStr, 'dayMonth'),
        total: fromCents(entry.cents),
        count: entry.count,
      });
    }
  } else {
    const sortedDates = Array.from(dailyMap.keys()).sort();
    for (const dStr of sortedDates) {
      const entry = dailyMap.get(dStr)!;
      dailyEvolution.push({
        date: dStr,
        label: formatDateAR(dStr, 'short'),
        total: fromCents(entry.cents),
        count: entry.count,
      });
    }
  }

  const previousPeriodDelta = fromCents(totalPeriodCents - previousPeriodCents);
  const previousPeriodPercentage =
    previousPeriodCents > 0
      ? Math.round(((totalPeriodCents - previousPeriodCents) / previousPeriodCents) * 1000) / 10
      : null;

  return {
    totalPeriod,
    countPeriod,
    averagePerExpense,
    averagePerDay,
    topCategory,
    byCategory,
    dailyEvolution,
    previousPeriodTotal,
    previousPeriodDelta,
    previousPeriodPercentage,
  };
}

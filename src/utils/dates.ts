import { DateRange, PeriodPreset } from '../types/expense';

export const AR_TIMEZONE = 'America/Argentina/Cordoba';

const MONTH_NAMES_ES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const SHORT_MONTH_NAMES_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
];

/**
 * Obtiene la fecha actual (YYYY-MM-DD) estrictamente en la zona horaria America/Argentina/Cordoba.
 */
export function getTodayInCordoba(referenceInstant: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: AR_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(referenceInstant);
  const year = parts.find((p) => p.type === 'year')?.value ?? '2026';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

/**
 * Valida que una cadena tenga formato YYYY-MM-DD y corresponda a una fecha real del calendario.
 */
export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

/**
 * Suma o resta días a una fecha YYYY-MM-DD usando aritmética UTC pura para no sufrir desplazamientos horarios.
 */
export function addDays(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calcula la cantidad de días inclusivos entre dos fechas YYYY-MM-DD.
 */
export function daysBetweenInclusive(fromStr: string, toStr: string): number {
  const [y1, m1, d1] = fromStr.split('-').map(Number);
  const [y2, m2, d2] = toStr.split('-').map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  const diffDays = Math.floor((t2 - t1) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

/**
 * Formatea una fecha YYYY-MM-DD sin instanciar Date en zona local del navegador
 * para evitar que "2026-10-09" se convierta en "8 de octubre" por desfase UTC.
 */
export function formatDateAR(
  dateStr: string,
  style: 'short' | 'long' | 'dayMonth' = 'short'
): string {
  if (!isValidDateString(dateStr)) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);

  if (style === 'short') {
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }

  if (style === 'dayMonth') {
    return `${String(d).padStart(2, '0')} ${SHORT_MONTH_NAMES_ES[m - 1]}`;
  }

  return `${d} de ${MONTH_NAMES_ES[m - 1]} de ${y}`;
}

/**
 * Formatea una marca de tiempo ISO (TIMESTAMPTZ) en la zona horaria America/Argentina/Cordoba.
 */
export function formatTimestampAR(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: AR_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Obtiene el primer y último día de un mes dado (año y mes 1-12).
 */
export function getMonthBounds(year: number, month1To12: number): { from: string; to: string } {
  const firstDay = `${year}-${String(month1To12).padStart(2, '0')}-01`;
  const lastDate = new Date(Date.UTC(year, month1To12, 0)).getUTCDate();
  const lastDay = `${year}-${String(month1To12).padStart(2, '0')}-${String(lastDate).padStart(2, '0')}`;
  return { from: firstDay, to: lastDay };
}

/**
 * Calcula el rango de fechas (from, to) según el período seleccionado.
 */
export function getDateRangeForPreset(
  preset: PeriodPreset,
  customRange?: { from: string; to: string },
  todayOverride?: string
): DateRange {
  const today = todayOverride && isValidDateString(todayOverride) ? todayOverride : getTodayInCordoba();
  const [year, month, day] = today.split('-').map(Number);

  switch (preset) {
    case 'today': {
      return {
        from: today,
        to: today,
        label: `Hoy (${formatDateAR(today, 'dayMonth')})`,
      };
    }

    case 'this_week': {
      // Lunes como inicio de semana
      const utcDate = new Date(Date.UTC(year, month - 1, day));
      const dayOfWeek = utcDate.getUTCDay(); // 0 = domingo, 1 = lunes, ...
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = addDays(today, diffToMonday);
      return {
        from: monday,
        to: today,
        label: 'Esta semana',
      };
    }

    case 'this_month': {
      const bounds = getMonthBounds(year, month);
      const monthName = MONTH_NAMES_ES[month - 1];
      const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      return {
        from: bounds.from,
        to: bounds.to,
        label: `Este mes (${capitalized} ${year})`,
      };
    }

    case 'last_month': {
      const prevYear = month === 1 ? year - 1 : year;
      const prevMonth = month === 1 ? 12 : month - 1;
      const bounds = getMonthBounds(prevYear, prevMonth);
      const monthName = MONTH_NAMES_ES[prevMonth - 1];
      const capitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      return {
        from: bounds.from,
        to: bounds.to,
        label: `Mes anterior (${capitalized} ${prevYear})`,
      };
    }

    case 'last_30_days': {
      const from = addDays(today, -29);
      return {
        from,
        to: today,
        label: 'Últimos 30 días',
      };
    }

    case 'custom': {
      const from =
        customRange?.from && isValidDateString(customRange.from) ? customRange.from : addDays(today, -6);
      const to =
        customRange?.to && isValidDateString(customRange.to) ? customRange.to : today;
      const orderedFrom = from <= to ? from : to;
      const orderedTo = from <= to ? to : from;
      return {
        from: orderedFrom,
        to: orderedTo,
        label: `${formatDateAR(orderedFrom, 'short')} al ${formatDateAR(orderedTo, 'short')}`,
      };
    }
  }
}

/**
 * Calcula el período equivalente inmediato anterior para comparaciones estadísticas.
 */
export function getPreviousEquivalentRange(currentRange: DateRange, preset: PeriodPreset): DateRange {
  if (preset === 'this_month') {
    const [y, m] = currentRange.from.split('-').map(Number);
    const prevY = m === 1 ? y - 1 : y;
    const prevM = m === 1 ? 12 : m - 1;
    const bounds = getMonthBounds(prevY, prevM);
    const monthName = MONTH_NAMES_ES[prevM - 1];
    return {
      from: bounds.from,
      to: bounds.to,
      label: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${prevY}`,
    };
  }

  if (preset === 'last_month') {
    const [y, m] = currentRange.from.split('-').map(Number);
    const prevY = m === 1 ? y - 1 : y;
    const prevM = m === 1 ? 12 : m - 1;
    const bounds = getMonthBounds(prevY, prevM);
    const monthName = MONTH_NAMES_ES[prevM - 1];
    return {
      from: bounds.from,
      to: bounds.to,
      label: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${prevY}`,
    };
  }

  const spanDays = daysBetweenInclusive(currentRange.from, currentRange.to);
  const prevTo = addDays(currentRange.from, -1);
  const prevFrom = addDays(prevTo, -(spanDays - 1));

  return {
    from: prevFrom,
    to: prevTo,
    label: `${formatDateAR(prevFrom, 'short')} al ${formatDateAR(prevTo, 'short')}`,
  };
}

/**
 * Utilidades para manejo de moneda en Peso Argentino (ARS) sin errores de punto flotante.
 * Todas las operaciones aritméticas se realizan en centavos enteros.
 */

const MAX_EXPENSE_AMOUNT = 999_999_999_999.99; // Límite de NUMERIC(14, 2)

/**
 * Convierte un número decimal a centavos enteros redondeados de forma segura.
 */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round((amount + Number.EPSILON) * 100);
}

/**
 * Convierte centavos enteros a importe decimal con exactamente 2 decimales de precisión.
 */
export function fromCents(cents: number): number {
  if (!Number.isFinite(cents)) return 0;
  return Math.round(cents) / 100;
}

/**
 * Suma un arreglo de importes monetarios trabajando en centavos para evitar errores IEEE 754.
 */
export function sumAmounts(amounts: number[]): number {
  const totalCents = amounts.reduce((acc, curr) => acc + toCents(curr), 0);
  return fromCents(totalCents);
}

/**
 * Normaliza un valor proveniente de PostgreSQL NUMERIC (que puede llegar como string o number).
 */
export function normalizeNumericFromDb(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const num = typeof val === 'number' ? val : Number(String(val).trim());
  if (!Number.isFinite(num)) return 0;
  return fromCents(toCents(num));
}

/**
 * Formatea un número en formato monetario argentino: $ 25.000,00
 */
export function formatARS(amount: number, showDecimals = true): string {
  const safeAmount = Number.isFinite(amount) ? fromCents(toCents(amount)) : 0;
  const isNegative = safeAmount < 0;
  const absAmount = Math.abs(safeAmount);

  const formattedNumber = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(absAmount);

  return `${isNegative ? '-$ ' : '$ '}${formattedNumber}`;
}

/**
 * Formatea un número para precargar en el campo de entrada de formulario (ej. "18500" o "18500,50")
 */
export function formatAmountForInput(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '';
  const cents = toCents(amount);
  const whole = Math.floor(cents / 100);
  const decimals = cents % 100;
  const wholeFormatted = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (decimals === 0) {
    return wholeFormatted;
  }
  return `${wholeFormatted},${decimals.toString().padStart(2, '0')}`;
}

export interface ParsedCurrencyResult {
  valid: boolean;
  value: number | null;
  error?: string;
}

/**
 * Interpreta un texto de importe en formato argentino o estándar:
 * - "25.000" -> 25000
 * - "25.000,50" -> 25000.50
 * - "25000,5" -> 25000.50
 * - "25000.50" -> 25000.50
 * - "25000" -> 25000
 * Rechaza negativos, cero, letras o separadores inconsistentes.
 */
export function parseARSInput(rawInput: string): ParsedCurrencyResult {
  const cleaned = rawInput.replace(/\$/g, '').replace(/\s+/g, '').trim();

  if (!cleaned) {
    return {
      valid: false,
      value: null,
      error: 'Ingresá un importe.',
    };
  }

  if (cleaned.startsWith('-')) {
    return {
      valid: false,
      value: null,
      error: 'El importe debe ser mayor que cero.',
    };
  }

  // Solo permitir dígitos, puntos y comas
  if (!/^[0-9.,]+$/.test(cleaned)) {
    return {
      valid: false,
      value: null,
      error: 'El importe contiene caracteres no válidos. Usá solo números (ej. 25.000 o 25.000,50).',
    };
  }

  const commaCount = (cleaned.match(/,/g) || []).length;
  const dotCount = (cleaned.match(/\./g) || []).length;

  if (commaCount > 1) {
    return {
      valid: false,
      value: null,
      error: 'El importe no puede tener más de una coma decimal.',
    };
  }

  let normalized = '';

  if (commaCount === 1 && dotCount >= 1) {
    // Formato "25.000,50": el punto debe aparecer antes que la coma y agrupar miles de a 3 dígitos
    const lastDotIndex = cleaned.lastIndexOf('.');
    const commaIndex = cleaned.indexOf(',');
    if (lastDotIndex > commaIndex) {
      return {
        valid: false,
        value: null,
        error: 'Formato de miles y decimales inválido. Ejemplo correcto: 25.000,50.',
      };
    }
    const [integerPart, decimalPart] = cleaned.split(',');
    if (!/^\d{1,3}(\.\d{3})+$/.test(integerPart)) {
      return {
        valid: false,
        value: null,
        error: 'Los puntos de miles deben separar grupos de 3 cifras (ej. 25.000,50).',
      };
    }
    if (!/^\d{1,2}$/.test(decimalPart)) {
      return {
        valid: false,
        value: null,
        error: 'Ingresá como máximo 2 decimales después de la coma.',
      };
    }
    normalized = `${integerPart.replace(/\./g, '')}.${decimalPart}`;
  } else if (commaCount === 1 && dotCount === 0) {
    // Formato "25000,50"
    const [integerPart, decimalPart] = cleaned.split(',');
    if (!integerPart || !/^\d+$/.test(integerPart)) {
      return {
        valid: false,
        value: null,
        error: 'Ingresá la parte entera antes de la coma.',
      };
    }
    if (!/^\d{1,2}$/.test(decimalPart)) {
      return {
        valid: false,
        value: null,
        error: 'Ingresá entre 1 y 2 dígitos decimales después de la coma.',
      };
    }
    normalized = `${integerPart}.${decimalPart}`;
  } else if (commaCount === 0 && dotCount >= 1) {
    // Puede ser separador de miles ("25.000" o "1.250.000") o decimal con punto ("250.50")
    if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
      normalized = cleaned.replace(/\./g, '');
    } else if (dotCount === 1) {
      const [integerPart, decimalPart] = cleaned.split('.');
      if (/^\d+$/.test(integerPart) && /^\d{1,2}$/.test(decimalPart)) {
        normalized = `${integerPart}.${decimalPart}`;
      } else {
        return {
          valid: false,
          value: null,
          error: 'Formato de importe inválido. Usá puntos para miles (18.500) o coma para decimales (18.500,50).',
        };
      }
    } else {
      return {
        valid: false,
        value: null,
        error: 'Formato de importe inválido. Revisá los puntos de miles.',
      };
    }
  } else {
    // Solo dígitos enteros "25000"
    normalized = cleaned;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return {
      valid: false,
      value: null,
      error: 'El importe ingresado no es un número válido.',
    };
  }

  const rounded = fromCents(toCents(parsed));

  if (rounded <= 0) {
    return {
      valid: false,
      value: null,
      error: 'El importe debe ser mayor que cero.',
    };
  }

  if (rounded > MAX_EXPENSE_AMOUNT) {
    return {
      valid: false,
      value: null,
      error: 'El importe supera el límite máximo permitido.',
    };
  }

  return {
    valid: true,
    value: rounded,
  };
}

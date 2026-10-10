import { Category, PaymentMethod, VoiceParsedDraft } from '../types/expense';
import { formatAmountForInput, fromCents, toCents } from './currency';
import { addDays, getTodayInCordoba, isValidDateString } from './dates';

/**
 * Diccionario de palabras clave asociadas a los nombres de categorías iniciales
 * para clasificar con alta precisión frases habituales en Argentina.
 */
const CATEGORY_KEYWORDS: Array<{
  categoryNamePattern: RegExp;
  keywords: string[];
}> = [
  {
    categoryNamePattern: /comida|supermercado|almac/i,
    keywords: [
      'supermercado',
      'super',
      'súper',
      'almacen',
      'almacén',
      'verduleria',
      'verdulería',
      'carniceria',
      'carnicería',
      'panaderia',
      'panadería',
      'fiambreria',
      'fiambrería',
      'comida',
      'mercado',
      'coto',
      'carrefour',
      'dia',
      'changomas',
      'disco',
      'vea',
      'jumbo',
      'kiosco',
      'polleria',
      'pollería',
      'pescaderia',
      'pescadería',
      'compras del mes',
    ],
  },
  {
    categoryNamePattern: /combustible|transporte|auto/i,
    keywords: [
      'combustible',
      'nafta',
      'gasoil',
      'gnc',
      'ypf',
      'shell',
      'axion',
      'puma',
      'peaje',
      'estacionamiento',
      'cochera',
      'remis',
      'remís',
      'taxi',
      'uber',
      'cabify',
      'colectivo',
      'sube',
      'transporte',
      'mecanico',
      'mecánico',
      'gomeria',
      'gomería',
      'lavadero',
    ],
  },
  {
    categoryNamePattern: /servicios|impuestos/i,
    keywords: [
      'luz',
      'epec',
      'edenor',
      'edesur',
      'gas',
      'ecogas',
      'metrogas',
      'agua',
      'aguas cordobesas',
      'internet',
      'fibertel',
      'personal',
      'claro',
      'movistar',
      'telefono',
      'teléfono',
      'celular',
      'cable',
      'impuesto',
      'impuestos',
      'rentas',
      'municipalidad',
      'monotributo',
      'afip',
      'arca',
      'expensas',
      'servicio',
      'servicios',
      'seguro',
    ],
  },
  {
    categoryNamePattern: /salud|farmacia|medic/i,
    keywords: [
      'farmacia',
      'remedio',
      'remedios',
      'medicamento',
      'medicamentos',
      'medico',
      'médico',
      'doctor',
      'dentista',
      'odontologo',
      'odontólogo',
      'consulta',
      'analisis',
      'análisis',
      'prepaga',
      'obra social',
      'osde',
      'apross',
      'salud',
      'optica',
      'óptica',
      'lentes',
    ],
  },
  {
    categoryNamePattern: /compras personales|ropa|indumentaria/i,
    keywords: [
      'ropa',
      'zapatillas',
      'zapatos',
      'camisa',
      'pantalon',
      'pantalón',
      'campera',
      'remera',
      'peluqueria',
      'peluquería',
      'barberia',
      'barbería',
      'perfume',
      'regalo',
      'libro',
      'compras personales',
    ],
  },
  {
    categoryNamePattern: /hogar|casa|ferreter/i,
    keywords: [
      'hogar',
      'ferreteria',
      'ferretería',
      'pintureria',
      'pinturería',
      'arreglo',
      'plomero',
      'electricista',
      'gasista',
      'limpieza',
      'mueble',
      'electrodomestico',
      'electrodoméstico',
      'jardin',
      'jardín',
      'vivero',
      'casa',
    ],
  },
  {
    categoryNamePattern: /salidas|entretenimiento|restaurante/i,
    keywords: [
      'cena',
      'almuerzo',
      'desayuno',
      'merienda',
      'cafe',
      'café',
      'restaurante',
      'parrilla',
      'bar',
      'helado',
      'heladeria',
      'heladería',
      'pizza',
      'pizzeria',
      'pizzería',
      'empanadas',
      'asado',
      'cine',
      'teatro',
      'salida',
      'salidas',
      'lomito',
      'cerveza',
    ],
  },
  {
    categoryNamePattern: /deporte|gimnasio|club/i,
    keywords: [
      'deporte',
      'gimnasio',
      'gym',
      'futbol',
      'fútbol',
      'cancha',
      'padel',
      'pádel',
      'tenis',
      'natacion',
      'natación',
      'club',
      'bici',
      'bicicleta',
    ],
  },
];

const SPANISH_NUMBERS: Record<string, number> = {
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  dieciseis: 16,
  dieciséis: 16,
  diecisiete: 17,
  dieciocho: 18,
  diecinueve: 19,
  veinte: 20,
  veintiun: 21,
  veintiún: 21,
  veintiuno: 21,
  veintidos: 22,
  veintidós: 22,
  veintitres: 23,
  veintitrés: 23,
  veinticuatro: 24,
  veinticinco: 25,
  veintiseis: 26,
  veintiséis: 26,
  veintisiete: 27,
  veintiocho: 28,
  veintinueve: 29,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  sesenta: 60,
  setenta: 70,
  ochenta: 80,
  noventa: 90,
  cien: 100,
  ciento: 100,
  doscientos: 200,
  doscientas: 200,
  trescientos: 300,
  trescientas: 300,
  cuatrocientos: 400,
  cuatrocientas: 400,
  quinientos: 500,
  quinientas: 500,
  seiscientos: 600,
  seiscientas: 600,
  setecientos: 700,
  setecientas: 700,
  ochocientos: 800,
  ochocientas: 800,
  novecientos: 900,
  novecientas: 900,
};

const MONTH_NAME_MAP: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  setiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

/**
 * Convierte una secuencia de palabras numéricas o mixtas (ej. "18 mil quinientos" o "dieciocho mil quinientos")
 * a su valor numérico exacto.
 */
function parseSpokenAndMixedNumber(text: string): {
  amount: number | null;
  matchedSpan: string | null;
} {
  const normalized = text.toLowerCase();

  // 1. Caso mixto muy común en transcripciones de Web Speech API:
  // "18 mil quinientos", "45 mil", "12 mil 500", "2 millones 300 mil"
  const mixedMilRegex =
    /\b(\d{1,3}(?:[.,]\d{1,2})?)\s*(mil|lucas)\b(?:\s+(?:con\s+)?([a-záéíóú]+|\d{1,3}))?/i;
  const mixedMatch = normalized.match(mixedMilRegex);
  if (mixedMatch) {
    const baseRaw = mixedMatch[1].replace(',', '.');
    const baseNum = Number(baseRaw);
    if (Number.isFinite(baseNum) && baseNum > 0) {
      let total = baseNum * 1000;
      const tailToken = mixedMatch[3]?.toLowerCase();
      if (tailToken) {
        if (/^\d{1,3}$/.test(tailToken)) {
          total += Number(tailToken);
        } else if (SPANISH_NUMBERS[tailToken] !== undefined) {
          total += SPANISH_NUMBERS[tailToken];
        }
      }
      return {
        amount: fromCents(toCents(total)),
        matchedSpan: mixedMatch[0],
      };
    }
  }

  // 2. Caso numérico directo formateado: "$ 18.500", "18.500,50", "18500", "1.250.000"
  // Evitar confundir fechas del tipo "5 de octubre" buscando primero números mayores o seguidos de "pesos" / precedidos por verbos de gasto
  const directNumberRegex =
    /(?:\$\s*)?(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d{4,9}(?:[.,]\d{1,2})?|\d{1,3}(?:,\d{1,2}))\b/;
  const directMatch = normalized.match(directNumberRegex);
  if (directMatch) {
    const rawNum = directMatch[1];
    let clean = rawNum;
    if (clean.includes('.') && clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes('.')) {
      if (/^\d{1,3}(\.\d{3})+$/.test(clean)) {
        clean = clean.replace(/\./g, '');
      }
    } else if (clean.includes(',')) {
      clean = clean.replace(',', '.');
    }
    const val = Number(clean);
    if (Number.isFinite(val) && val > 0) {
      return {
        amount: fromCents(toCents(val)),
        matchedSpan: directMatch[0],
      };
    }
  }

  // 3. Caso número puramente en palabras: "dieciocho mil quinientos", "veinticinco mil", "ocho mil quinientos"
  const tokens = normalized
    .replace(/[$,.;:]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let currentGroup = 0;
  let totalValue = 0;
  let hasNumberWord = false;
  const matchedWords: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok === 'y' && hasNumberWord) {
      matchedWords.push(tok);
      continue;
    }

    if (SPANISH_NUMBERS[tok] !== undefined) {
      currentGroup += SPANISH_NUMBERS[tok];
      hasNumberWord = true;
      matchedWords.push(tok);
    } else if ((tok === 'mil' || tok === 'lucas') && (hasNumberWord || i >= 0)) {
      if (currentGroup === 0) currentGroup = 1;
      totalValue += currentGroup * 1000;
      currentGroup = 0;
      hasNumberWord = true;
      matchedWords.push(tok);
    } else if (tok === 'millon' || tok === 'millón' || tok === 'millones') {
      if (currentGroup === 0) currentGroup = 1;
      totalValue += currentGroup * 1_000_000;
      currentGroup = 0;
      hasNumberWord = true;
      matchedWords.push(tok);
    } else if (hasNumberWord) {
      break;
    }
  }

  const finalSpoken = totalValue + currentGroup;
  if (hasNumberWord && finalSpoken > 0) {
    return {
      amount: fromCents(toCents(finalSpoken)),
      matchedSpan: matchedWords.join(' '),
    };
  }

  // 4. Número corto de 1 a 3 dígitos acompañado de "pesos" o después de "gasté / pagué"
  const smallNumMatch = normalized.match(
    /(?:gast[eé]|pagu[eé]|comun|cost[oó]|sal[ií]o|\$)\s*(\d{1,3})\b|\b(\d{1,3})\s*pesos\b/i
  );
  if (smallNumMatch) {
    const val = Number(smallNumMatch[1] || smallNumMatch[2]);
    if (Number.isFinite(val) && val > 0) {
      return {
        amount: val,
        matchedSpan: smallNumMatch[1] || smallNumMatch[2],
      };
    }
  }

  return { amount: null, matchedSpan: null };
}

/**
 * Extrae la fecha relativa o explícita mencionada en la frase utilizando America/Argentina/Cordoba.
 */
function parseSpokenDate(text: string, todayStr: string): string {
  const lower = text.toLowerCase();

  if (/\b(anteayer|antes de ayer)\b/.test(lower)) {
    return addDays(todayStr, -2);
  }
  if (/\bayer\b/.test(lower)) {
    return addDays(todayStr, -1);
  }
  if (/\bhoy\b/.test(lower)) {
    return todayStr;
  }

  // Fecha explícita como "el 5 de octubre" o "12 de septiembre"
  const explicitMatch = lower.match(
    /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?:\s+de\s+(\d{4}))?\b/
  );
  if (explicitMatch) {
    const day = Number(explicitMatch[1]);
    const month = MONTH_NAME_MAP[explicitMatch[2]];
    const currentYear = Number(todayStr.split('-')[0]);
    const year = explicitMatch[3] ? Number(explicitMatch[3]) : currentYear;
    const candidate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (isValidDateString(candidate)) {
      return candidate;
    }
  }

  return todayStr;
}

/**
 * Detecta el medio de pago cuando se menciona en la frase.
 */
function parseSpokenPaymentMethod(text: string): PaymentMethod | '' {
  const lower = text.toLowerCase();
  if (/\b(mercado\s*pago|mercadopago|billetera|qr)\b/.test(lower)) {
    return 'mercadopago';
  }
  if (/\b(transferencia|transferi|transferí|alias|cbu)\b/.test(lower)) {
    return 'transferencia';
  }
  if (/\b(debito|débito)\b/.test(lower)) {
    return 'debito';
  }
  if (/\b(credito|crédito|cuotas|tarjeta)\b/.test(lower)) {
    return 'credito';
  }
  if (/\b(efectivo|contado|plata en mano|billete)\b/.test(lower)) {
    return 'efectivo';
  }
  return '';
}

/**
 * Extrae una descripción concisa y natural a partir de la frase dictada.
 */
function extractCleanDescription(rawTranscript: string): string {
  let desc = rawTranscript.trim();

  // Buscar lo que sigue después de "en " o "de " o "por " tras el importe
  const conceptMatch = desc.match(
    /\b(?:pesos\s+)?(?:en|de|por|para)\s+(?:el\s+|la\s+|los\s+|las\s+|un\s+|una\s+|unos\s+|unas\s+)?(.+?)$/i
  );

  if (conceptMatch && conceptMatch[1]) {
    desc = conceptMatch[1].trim();
  } else {
    // Limpiar verbos iniciales, fechas y montos
    desc = desc
      .replace(/^(?:hoy|ayer|anteayer|antes de ayer)\s+/i, '')
      .replace(/^(?:gast[eé]|pagu[eé]|compr[eé]|abon[eé])\s+/i, '')
      .replace(/(?:\$\s*)?\d[\d.,\s]*(?:mil|lucas|millones)?(?:\s+pesos)?/gi, '')
      .trim();
  }

  // Quitar sufijos de medio de pago o fechas relativas al final de la descripción
  desc = desc
    .replace(
      /\s+(?:con|en|por)\s+(?:tarjeta(?:\s+de\s+(?:cr[eé]dito|d[eé]bito))?|cr[eé]dito|d[eé]bito|efectivo|transferencia|mercado\s*pago|qr).*$/i,
      ''
    )
    .replace(/\s+(?:hoy|ayer|anteayer)$/i, '')
    .replace(/^[.,;:\-\s]+|[.,;:\-\s]+$/g, '')
    .trim();

  if (!desc) return '';
  return desc.charAt(0).toUpperCase() + desc.slice(1);
}

/**
 * Clasifica la categoría según las categorías activas del usuario.
 * Si hay duda o ambigüedad, deja category_id vacío para que el usuario elija en la pantalla de confirmación.
 */
function matchCategory(
  transcript: string,
  categories: Category[]
): {
  category_id: string;
  confidence: 'high' | 'low' | 'none';
  matchedName: string | null;
} {
  const lower = transcript.toLowerCase();
  const activeCategories = categories.filter((c) => c.is_active);
  const pool = activeCategories.length > 0 ? activeCategories : categories;

  // 1. Verificar si el usuario mencionó literalmente el nombre de alguna categoría suya
  for (const cat of pool) {
    const catLower = cat.name.toLowerCase();
    if (lower.includes(catLower)) {
      return {
        category_id: cat.id,
        confidence: 'high',
        matchedName: cat.name,
      };
    }
  }

  // 2. Verificar coincidencia por palabras clave de cada rubro
  const matchedCategories: Category[] = [];

  for (const rule of CATEGORY_KEYWORDS) {
    const keywordHit = rule.keywords.some((kw) => {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`\\b${escaped}\\b`, 'i').test(lower);
    });

    if (keywordHit) {
      const targetCat = pool.find((c) => rule.categoryNamePattern.test(c.name));
      if (targetCat && !matchedCategories.some((m) => m.id === targetCat.id)) {
        matchedCategories.push(targetCat);
      }
    }
  }

  if (matchedCategories.length === 1) {
    return {
      category_id: matchedCategories[0].id,
      confidence: 'high',
      matchedName: matchedCategories[0].name,
    };
  }

  if (matchedCategories.length > 1) {
    // Existe ambigüedad entre dos o más categorías: no asignar a ciegas
    return {
      category_id: '',
      confidence: 'low',
      matchedName: null,
    };
  }

  return {
    category_id: '',
    confidence: 'none',
    matchedName: null,
  };
}

/**
 * Interpreta una frase de gasto en español de Argentina y devuelve un borrador
 * para ser revisado y confirmado obligatoriamente por el usuario.
 */
export function parseVoiceExpenseTranscript(
  rawTranscript: string,
  categories: Category[],
  todayOverride?: string
): VoiceParsedDraft {
  const cleanTranscript = rawTranscript.trim();
  const todayStr = todayOverride && isValidDateString(todayOverride)
    ? todayOverride
    : getTodayInCordoba();
  const warnings: string[] = [];

  if (!cleanTranscript) {
    return {
      rawTranscript: '',
      amount: null,
      amountInput: '',
      category_id: '',
      categoryConfidence: 'none',
      matchedCategoryName: null,
      description: '',
      expense_date: todayStr,
      payment_method: '',
      warnings: ['No se detectó ningún texto en el dictado.'],
    };
  }

  const { amount } = parseSpokenAndMixedNumber(cleanTranscript);
  if (amount === null || amount <= 0) {
    warnings.push(
      'No pudimos identificar el importe con certeza. Ingresalo manualmente antes de confirmar.'
    );
  }

  const { category_id, confidence, matchedName } = matchCategory(cleanTranscript, categories);
  if (confidence !== 'high') {
    warnings.push(
      'Seleccioná la categoría correspondiente antes de guardar el gasto.'
    );
  }

  const expense_date = parseSpokenDate(cleanTranscript, todayStr);
  const payment_method = parseSpokenPaymentMethod(cleanTranscript);
  const description = extractCleanDescription(cleanTranscript);

  return {
    rawTranscript: cleanTranscript,
    amount,
    amountInput: amount !== null ? formatAmountForInput(amount) : '',
    category_id,
    categoryConfidence: confidence,
    matchedCategoryName: matchedName,
    description,
    expense_date,
    payment_method,
    warnings,
  };
}

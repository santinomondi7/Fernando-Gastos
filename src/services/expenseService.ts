import {
  Category,
  DEFAULT_INITIAL_CATEGORIES,
  Expense,
  PaymentMethod,
} from '../types/expense';
import { normalizeNumericFromDb } from '../utils/currency';
import { ValidatedExpensePayload } from '../utils/validation';
import { isSupabaseConfigured, supabase } from './supabaseClient';

/**
 * Identificador fijo para modo de usuario único sin contraseña.
 * Todos los dispositivos leen y escriben sobre este mismo identificador en Supabase.
 */
export const SINGLE_USER_ID = '00000000-0000-0000-0000-000000000001';

function assertOnlineAndConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase aún no está configurado. Definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en las variables de entorno y ejecutá la migración SQL inicial.'
    );
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    throw new Error(
      'Sin conexión a internet. No se pudo guardar ni sincronizar con la base de datos. Verificá tu conexión e intentá nuevamente.'
    );
  }
}

export function translateSupabaseError(err: unknown): string {
  if (!err) return 'Ocurrió un error inesperado al comunicarse con la base de datos.';
  if (err instanceof Error) {
    const msg = err.message;
    if (/Failed to fetch|NetworkError|fetch/i.test(msg)) {
      return 'Error de red: no se pudo conectar con Supabase. Verificá tu conexión a internet.';
    }
    if (/row-level security|permission denied/i.test(msg)) {
      return 'Operación rechazada por políticas de seguridad (RLS). Asegurate de haber ejecutado la migración SQL actualizada para usuario único en el SQL Editor de Supabase.';
    }
    if (/uq_categories_user_name_idx|duplicate key/i.test(msg)) {
      return 'Ya existe una categoría con ese nombre.';
    }
    if (/fk_expenses_category_owner|foreign key constraint/i.test(msg)) {
      return 'No se puede eliminar ni desvincular una categoría que tiene gastos registrados.';
    }
    if (/relation "public\.(categories|expenses)" does not exist|42P01/i.test(msg)) {
      return 'Las tablas aún no existen en Supabase. Ejecutá la migración SQL inicial (001_initial_schema.sql) en el SQL Editor de tu proyecto Supabase.';
    }
    return msg;
  }
  return String(err);
}

function mapCategoryRow(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    icon: row.icon ? String(row.icon) : 'receipt',
    color: row.color ? String(row.color) : '#0F172A',
    is_active: Boolean(row.is_active),
    created_at: String(row.created_at),
  };
}

function mapExpenseRow(row: Record<string, unknown>): Expense {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    amount: normalizeNumericFromDb(row.amount as string | number),
    category_id: String(row.category_id),
    description: row.description ? String(row.description) : null,
    expense_date: String(row.expense_date),
    payment_method: (row.payment_method as PaymentMethod) || null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/**
 * Obtiene todas las categorías del usuario único desde Supabase.
 * Si aún no existen en la tabla, inserta las 9 categorías iniciales.
 */
export async function fetchAndEnsureCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) {
    return DEFAULT_INITIAL_CATEGORIES.map((cat, idx) => ({
      id: `unconfigured-cat-${idx + 1}`,
      user_id: SINGLE_USER_ID,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      is_active: true,
      created_at: new Date().toISOString(),
    }));
  }

  assertOnlineAndConfigured();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', SINGLE_USER_ID)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(translateSupabaseError(error));
  }

  if (data && data.length > 0) {
    return data.map((row) => mapCategoryRow(row as Record<string, unknown>));
  }

  const seedRows = DEFAULT_INITIAL_CATEGORIES.map((cat) => ({
    user_id: SINGLE_USER_ID,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    is_active: true,
  }));

  const { data: insertedData, error: insertError } = await supabase
    .from('categories')
    .insert(seedRows)
    .select('*');

  if (insertError) {
    throw new Error(translateSupabaseError(insertError));
  }

  return (insertedData || [])
    .map((row) => mapCategoryRow(row as Record<string, unknown>))
    .sort((a, b) => a.name.localeCompare(b.name, 'es-AR'));
}

export async function createCategoryInDb(payload: {
  name: string;
  color: string;
  icon?: string;
}): Promise<Category> {
  assertOnlineAndConfigured();

  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: SINGLE_USER_ID,
      name: payload.name.trim(),
      color: payload.color,
      icon: payload.icon || 'receipt',
      is_active: true,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(translateSupabaseError(error));
  }

  return mapCategoryRow(data as Record<string, unknown>);
}

export async function updateCategoryInDb(
  categoryId: string,
  payload: { name?: string; color?: string; is_active?: boolean }
): Promise<Category> {
  assertOnlineAndConfigured();

  const updateFields: Record<string, unknown> = {};
  if (payload.name !== undefined) updateFields.name = payload.name.trim();
  if (payload.color !== undefined) updateFields.color = payload.color;
  if (payload.is_active !== undefined) updateFields.is_active = payload.is_active;

  const { data, error } = await supabase
    .from('categories')
    .update(updateFields)
    .eq('id', categoryId)
    .eq('user_id', SINGLE_USER_ID)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(translateSupabaseError(error));
  }

  return mapCategoryRow(data as Record<string, unknown>);
}

/**
 * Obtiene todos los gastos del usuario único ordenados por fecha descendente.
 */
export async function fetchUserExpenses(): Promise<Expense[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  assertOnlineAndConfigured();

  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', SINGLE_USER_ID)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(translateSupabaseError(error));
  }

  return (data || []).map((row) => mapExpenseRow(row as Record<string, unknown>));
}

/**
 * Crea un gasto en Supabase para el usuario único y espera confirmación real del servidor.
 */
export async function createExpenseInDb(
  payload: ValidatedExpensePayload
): Promise<Expense> {
  assertOnlineAndConfigured();

  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: SINGLE_USER_ID,
      amount: payload.amount,
      category_id: payload.category_id,
      description: payload.description,
      expense_date: payload.expense_date,
      payment_method: payload.payment_method,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(translateSupabaseError(error));
  }

  return mapExpenseRow(data as Record<string, unknown>);
}

/**
 * Actualiza un gasto existente en Supabase y espera confirmación real del registro modificado.
 */
export async function updateExpenseInDb(
  expenseId: string,
  payload: ValidatedExpensePayload
): Promise<Expense> {
  assertOnlineAndConfigured();

  const { data, error } = await supabase
    .from('expenses')
    .update({
      amount: payload.amount,
      category_id: payload.category_id,
      description: payload.description,
      expense_date: payload.expense_date,
      payment_method: payload.payment_method,
    })
    .eq('id', expenseId)
    .eq('user_id', SINGLE_USER_ID)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(translateSupabaseError(error));
  }

  return mapExpenseRow(data as Record<string, unknown>);
}

/**
 * Elimina un gasto en Supabase.
 */
export async function deleteExpenseInDb(expenseId: string): Promise<void> {
  assertOnlineAndConfigured();

  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .eq('user_id', SINGLE_USER_ID);

  if (error) {
    throw new Error(translateSupabaseError(error));
  }
}

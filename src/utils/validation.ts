import { Category, ExpenseFormValues, PaymentMethod, PAYMENT_METHOD_LABELS } from '../types/expense';
import { parseARSInput } from './currency';
import { isValidDateString } from './dates';

export interface ValidationErrors {
  amountInput?: string;
  category_id?: string;
  expense_date?: string;
  description?: string;
  payment_method?: string;
}

export interface ValidatedExpensePayload {
  amount: number;
  category_id: string;
  description: string | null;
  expense_date: string;
  payment_method: PaymentMethod | null;
}

const VALID_PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[];

export function validateExpenseForm(
  values: ExpenseFormValues,
  categories: Category[]
): {
  valid: boolean;
  errors: ValidationErrors;
  payload?: ValidatedExpensePayload;
} {
  const errors: ValidationErrors = {};

  // 1. Validar importe
  const parsedAmount = parseARSInput(values.amountInput);
  if (!parsedAmount.valid || parsedAmount.value === null) {
    errors.amountInput = parsedAmount.error || 'Ingresá un importe válido mayor que cero.';
  }

  // 2. Validar categoría
  if (!values.category_id || !values.category_id.trim()) {
    errors.category_id = 'Seleccioná una categoría para el gasto.';
  } else {
    const foundCategory = categories.find((c) => c.id === values.category_id);
    if (!foundCategory) {
      errors.category_id = 'La categoría seleccionada no es válida.';
    }
  }

  // 3. Validar fecha
  if (!values.expense_date || !isValidDateString(values.expense_date)) {
    errors.expense_date = 'Ingresá una fecha válida (AAAA-MM-DD).';
  }

  // 4. Validar descripción (opcional, máx. 300 caracteres)
  const trimmedDesc = values.description.trim();
  if (trimmedDesc.length > 300) {
    errors.description = 'La descripción no puede superar los 300 caracteres.';
  }

  // 5. Validar medio de pago (opcional)
  if (
    values.payment_method &&
    !VALID_PAYMENT_METHODS.includes(values.payment_method as PaymentMethod)
  ) {
    errors.payment_method = 'El medio de pago seleccionado no es válido.';
  }

  if (Object.keys(errors).length > 0 || parsedAmount.value === null) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    payload: {
      amount: parsedAmount.value,
      category_id: values.category_id,
      description: trimmedDesc.length > 0 ? trimmedDesc : null,
      expense_date: values.expense_date,
      payment_method: values.payment_method ? (values.payment_method as PaymentMethod) : null,
    },
  };
}

export function validateCategoryName(
  name: string,
  existingCategories: Category[],
  editingCategoryId?: string
): { valid: boolean; error?: string; trimmedName: string } {
  const trimmedName = name.trim().replace(/\s+/g, ' ');
  if (!trimmedName) {
    return { valid: false, error: 'Ingresá un nombre para la categoría.', trimmedName };
  }
  if (trimmedName.length > 80) {
    return {
      valid: false,
      error: 'El nombre de la categoría no puede superar los 80 caracteres.',
      trimmedName,
    };
  }
  const duplicate = existingCategories.find(
    (c) =>
      c.id !== editingCategoryId &&
      c.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (duplicate) {
    return {
      valid: false,
      error: `Ya existe una categoría llamada «${duplicate.name}».`,
      trimmedName,
    };
  }
  return { valid: true, trimmedName };
}

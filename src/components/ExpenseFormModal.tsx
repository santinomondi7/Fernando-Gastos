import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Loader2, X } from 'lucide-react';
import {
  Category,
  Expense,
  ExpenseFormValues,
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
} from '../types/expense';
import { formatAmountForInput, formatARS, parseARSInput } from '../utils/currency';
import { addDays, getTodayInCordoba } from '../utils/dates';
import {
  ValidatedExpensePayload,
  validateExpenseForm,
  ValidationErrors,
} from '../utils/validation';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitExpense: (payload: ValidatedExpensePayload) => Promise<void>;
  categories: Category[];
  editingExpense?: Expense | null;
  initialDraft?: Partial<ExpenseFormValues> | null;
  title?: string;
}

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  onSubmitExpense,
  categories,
  editingExpense,
  initialDraft,
  title,
}) => {
  const todayStr = getTodayInCordoba();

  const [values, setValues] = useState<ExpenseFormValues>({
    amountInput: '',
    category_id: '',
    description: '',
    expense_date: todayStr,
    payment_method: '',
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectableCategories = categories.filter(
    (c) => c.is_active || (editingExpense && c.id === editingExpense.category_id)
  );

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setSubmitError(null);

    if (editingExpense) {
      setValues({
        amountInput: formatAmountForInput(editingExpense.amount),
        category_id: editingExpense.category_id,
        description: editingExpense.description || '',
        expense_date: editingExpense.expense_date,
        payment_method: editingExpense.payment_method || '',
      });
    } else if (initialDraft) {
      const defaultCategoryId =
        initialDraft.category_id ||
        selectableCategories[0]?.id ||
        '';
      setValues({
        amountInput: initialDraft.amountInput ?? '',
        category_id: defaultCategoryId,
        description: initialDraft.description ?? '',
        expense_date: initialDraft.expense_date || todayStr,
        payment_method: initialDraft.payment_method ?? '',
      });
    } else {
      setValues({
        amountInput: '',
        category_id: selectableCategories[0]?.id || '',
        description: '',
        expense_date: todayStr,
        payment_method: '',
      });
    }
  }, [isOpen, editingExpense, initialDraft, todayStr]);

  if (!isOpen) return null;

  const liveAmountPreview = parseARSInput(values.amountInput);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setSubmitError(null);
    const validation = validateExpenseForm(values, categories);
    if (!validation.valid || !validation.payload) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);
    try {
      await onSubmitExpense(validation.payload);
      setValues({
        amountInput: '',
        category_id: selectableCategories[0]?.id || '',
        description: '',
        expense_date: todayStr,
        payment_method: '',
      });
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el gasto. Verificá tu conexión e intentá de nuevo.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle =
    title || (editingExpense ? 'Editar gasto' : 'Registrar gasto');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-form-modal-title"
    >
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <h2
            id="expense-form-modal-title"
            className="text-xl font-bold text-slate-900"
          >
            {modalTitle}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Cerrar ventana"
            className="p-2.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6" noValidate>
          {submitError && (
            <div
              role="alert"
              className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 text-base text-red-800"
            >
              <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Campo obligatorio: Importe */}
          <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
              <label
                htmlFor="expense-amount"
                className="block text-base font-bold text-slate-900"
              >
                Importe en pesos (ARS) <span className="text-red-600">*</span>
              </label>
              {liveAmountPreview.valid && liveAmountPreview.value !== null && (
                <span className="text-sm font-mono tabular-nums text-emerald-700 font-bold">
                  Se registrará: {formatARS(liveAmountPreview.value)}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-500 font-mono">
                $
              </span>
              <input
                id="expense-amount"
                type="text"
                inputMode="decimal"
                autoFocus
                placeholder="Ej: 18.500"
                value={values.amountInput}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, amountInput: e.target.value }));
                  if (errors.amountInput) {
                    setErrors((prev) => ({ ...prev, amountInput: undefined }));
                  }
                }}
                disabled={isSubmitting}
                className={`w-full pl-11 pr-4 py-3.5 text-2xl font-bold font-mono tabular-nums border rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.amountInput
                    ? 'border-red-400 focus:ring-red-600'
                    : 'border-slate-300 focus:ring-slate-900'
                }`}
              />
            </div>
            {errors.amountInput ? (
              <p className="mt-2 text-sm text-red-600 font-semibold">
                {errors.amountInput}
              </p>
            ) : (
              <p className="mt-1.5 text-sm text-slate-600">
                Podés escribir números enteros o con coma (ej: 25.000 o 25.000,50).
              </p>
            )}
          </div>

          {/* Campo obligatorio: Categoría */}
          <div>
            <label
              htmlFor="expense-category"
              className="block text-base font-bold text-slate-900 mb-2"
            >
              Categoría <span className="text-red-600">*</span>
            </label>
            <select
              id="expense-category"
              value={values.category_id}
              onChange={(e) => {
                setValues((prev) => ({ ...prev, category_id: e.target.value }));
                if (errors.category_id) {
                  setErrors((prev) => ({ ...prev, category_id: undefined }));
                }
              }}
              disabled={isSubmitting}
              className={`w-full px-4 py-3.5 text-lg font-medium border rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 ${
                errors.category_id
                  ? 'border-red-400 focus:ring-red-600'
                  : 'border-slate-300 focus:ring-slate-900'
              }`}
            >
              <option value="">Seleccioná una categoría...</option>
              {selectableCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                  {!cat.is_active ? ' (Inactiva)' : ''}
                </option>
              ))}
            </select>
            {errors.category_id && (
              <p className="mt-2 text-sm text-red-600 font-semibold">
                {errors.category_id}
              </p>
            )}
          </div>

          {/* Campo opcional: Descripción */}
          <div>
            <label
              htmlFor="expense-description"
              className="block text-base font-bold text-slate-900 mb-2"
            >
              Descripción <span className="text-sm font-normal text-slate-600">(opcional)</span>
            </label>
            <input
              id="expense-description"
              type="text"
              maxLength={300}
              placeholder="Ej: Nafta YPF, Carnicería, Luz"
              value={values.description}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, description: e.target.value }))
              }
              disabled={isSubmitting}
              className="w-full px-4 py-3.5 text-lg border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            {errors.description && (
              <p className="mt-2 text-sm text-red-600 font-semibold">
                {errors.description}
              </p>
            )}
          </div>

          {/* Fecha del gasto y Medio de pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="expense-date"
                  className="block text-base font-bold text-slate-900"
                >
                  Fecha del gasto
                </label>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <button
                    type="button"
                    onClick={() =>
                      setValues((prev) => ({ ...prev, expense_date: todayStr }))
                    }
                    className="text-slate-700 hover:text-slate-900 underline cursor-pointer"
                  >
                    Hoy
                  </button>
                  <span className="text-slate-400">·</span>
                  <button
                    type="button"
                    onClick={() =>
                      setValues((prev) => ({
                        ...prev,
                        expense_date: addDays(todayStr, -1),
                      }))
                    }
                    className="text-slate-700 hover:text-slate-900 underline cursor-pointer"
                  >
                    Ayer
                  </button>
                </div>
              </div>
              <input
                id="expense-date"
                type="date"
                value={values.expense_date}
                onChange={(e) => {
                  setValues((prev) => ({ ...prev, expense_date: e.target.value }));
                  if (errors.expense_date) {
                    setErrors((prev) => ({ ...prev, expense_date: undefined }));
                  }
                }}
                disabled={isSubmitting}
                className={`w-full px-4 py-3.5 text-lg font-mono tabular-nums border rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.expense_date
                    ? 'border-red-400 focus:ring-red-600'
                    : 'border-slate-300 focus:ring-slate-900'
                }`}
              />
              {errors.expense_date && (
                <p className="mt-2 text-sm text-red-600 font-semibold">
                  {errors.expense_date}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="expense-payment-method"
                className="block text-base font-bold text-slate-900 mb-2"
              >
                Medio de pago <span className="text-sm font-normal text-slate-600">(opcional)</span>
              </label>
              <select
                id="expense-payment-method"
                value={values.payment_method}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    payment_method: e.target.value as PaymentMethod | '',
                  }))
                }
                disabled={isSubmitting}
                className="w-full px-4 py-3.5 text-lg border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Sin especificar</option>
                {(Object.entries(PAYMENT_METHOD_LABELS) as Array<[PaymentMethod, string]>).map(
                  ([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3.5 text-base font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-7 py-3.5 text-base font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>{editingExpense ? 'Guardar cambios' : 'Guardar gasto'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

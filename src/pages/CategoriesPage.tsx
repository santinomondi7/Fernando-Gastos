import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Edit2,
  Loader2,
  Plus,
  Power,
  X,
} from 'lucide-react';
import { Category, Expense } from '../types/expense';
import { formatARS, sumAmounts } from '../utils/currency';
import { validateCategoryName } from '../utils/validation';

interface CategoriesPageProps {
  categories: Category[];
  expenses: Expense[];
  onCreateCategory: (payload: { name: string; color: string }) => Promise<void>;
  onUpdateCategory: (
    categoryId: string,
    payload: { name?: string; color?: string; is_active?: boolean }
  ) => Promise<void>;
}

const COLOR_SWATCHES = [
  '#0F766E',
  '#B45309',
  '#1D4ED8',
  '#BE123C',
  '#6D28D9',
  '#047857',
  '#C2410C',
  '#0369A1',
  '#475569',
  '#0F172A',
];

export const CategoriesPage: React.FC<CategoriesPageProps> = ({
  categories,
  expenses,
  onCreateCategory,
  onUpdateCategory,
}) => {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(COLOR_SWATCHES[0]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(COLOR_SWATCHES[0]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyCategoryId, setBusyCategoryId] = useState<string | null>(null);

  const usageByCategory = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const cat of categories) {
      const catExpenses = expenses.filter((e) => e.category_id === cat.id);
      map.set(cat.id, {
        count: catExpenses.length,
        total: sumAmounts(catExpenses.map((e) => e.amount)),
      });
    }
    return map;
  }, [categories, expenses]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) return;
    setCreateError(null);

    const validation = validateCategoryName(newName, categories);
    if (!validation.valid) {
      setCreateError(validation.error || 'Nombre inválido.');
      return;
    }

    setIsCreating(true);
    try {
      await onCreateCategory({
        name: validation.trimmedName,
        color: newColor,
      });
      setNewName('');
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'No se pudo crear la categoría.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const startEditing = (cat: Category) => {
    setActionError(null);
    setEditingCategoryId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color || COLOR_SWATCHES[0]);
  };

  const handleSaveEdit = async (cat: Category) => {
    if (busyCategoryId) return;
    setActionError(null);

    const validation = validateCategoryName(editName, categories, cat.id);
    if (!validation.valid) {
      setActionError(validation.error || 'Nombre inválido.');
      return;
    }

    setBusyCategoryId(cat.id);
    try {
      await onUpdateCategory(cat.id, {
        name: validation.trimmedName,
        color: editColor,
      });
      setEditingCategoryId(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'No se pudo actualizar la categoría.'
      );
    } finally {
      setBusyCategoryId(null);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    if (busyCategoryId) return;
    setActionError(null);
    setBusyCategoryId(cat.id);
    try {
      await onUpdateCategory(cat.id, {
        is_active: !cat.is_active,
      });
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : 'No se pudo cambiar el estado de la categoría.'
      );
    } finally {
      setBusyCategoryId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Administración de categorías
        </h1>
        <p className="text-base sm:text-lg text-slate-600 mt-1">
          Creá nuevas categorías, editá sus nombres o desactivá las que ya no uses. Al desactivar una categoría, sus gastos anteriores siguen apareciendo intactos en el historial.
        </p>
      </div>

      {/* Formulario para crear nueva categoría */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">
          Crear nueva categoría
        </h2>

        {createError && (
          <div
            role="alert"
            className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-base text-red-800"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span>{createError}</span>
          </div>
        )}

        <form
          onSubmit={handleCreate}
          className="flex flex-col md:flex-row items-stretch md:items-end gap-5"
        >
          <div className="flex-1">
            <label
              htmlFor="new-category-name"
              className="block text-sm font-bold text-slate-800 mb-2"
            >
              Nombre de la categoría
            </label>
            <input
              id="new-category-name"
              type="text"
              maxLength={80}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ej: Mascotas, Impuestos..."
              disabled={isCreating}
              className="w-full px-4 py-3 text-base border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <span className="block text-sm font-bold text-slate-800 mb-2">
              Color identificativo
            </span>
            <div className="flex items-center gap-2 py-1">
              {COLOR_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  onClick={() => setNewColor(swatch)}
                  aria-label={`Seleccionar color ${swatch}`}
                  className={`w-8 h-8 rounded-lg transition-transform cursor-pointer ${
                    newColor === swatch
                      ? 'ring-2 ring-offset-2 ring-slate-900 scale-105'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isCreating}
            className="px-6 py-3.5 text-base font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creando...</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>Crear categoría</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Lista de categorías existentes */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Categorías configuradas ({categories.length})
          </h2>
        </div>

        {actionError && (
          <div
            role="alert"
            className="m-4 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-base text-red-800"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}

        <div className="divide-y divide-slate-200">
          {categories.map((cat) => {
            const usage = usageByCategory.get(cat.id) ?? { count: 0, total: 0 };
            const isEditing = editingCategoryId === cat.id;
            const isBusy = busyCategoryId === cat.id;

            return (
              <div
                key={cat.id}
                className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                {isEditing ? (
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3.5">
                    <input
                      type="text"
                      maxLength={80}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-4 py-2.5 text-base border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <div className="flex items-center gap-2">
                      {COLOR_SWATCHES.map((swatch) => (
                        <button
                          key={swatch}
                          type="button"
                          onClick={() => setEditColor(swatch)}
                          className={`w-7 h-7 rounded-md cursor-pointer ${
                            editColor === swatch
                              ? 'ring-2 ring-offset-1 ring-slate-900'
                              : 'opacity-75'
                          }`}
                          style={{ backgroundColor: swatch }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(cat)}
                        disabled={isBusy}
                        className="px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Guardar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCategoryId(null)}
                        disabled={isBusy}
                        className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancelar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-4 h-4 rounded-xs shrink-0"
                          style={{ backgroundColor: cat.color || '#0F172A' }}
                        />
                        <span
                          className={`text-base sm:text-lg font-bold ${
                            cat.is_active ? 'text-slate-900' : 'text-slate-400 line-through'
                          }`}
                        >
                          {cat.name}
                        </span>
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 text-sm sm:text-base text-slate-600">
                        <span>
                          Estado: {cat.is_active ? 'Activa' : 'Inactiva (solo historial)'}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums font-medium">
                          {usage.count} {usage.count === 1 ? 'gasto asociado' : 'gastos asociados'}
                        </span>
                        {usage.count > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums font-bold text-slate-800">
                              Acumulado: {formatARS(usage.total)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEditing(cat)}
                        disabled={isBusy}
                        className="px-4 py-2.5 text-sm sm:text-base font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Editar nombre</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleActive(cat)}
                        disabled={isBusy}
                        className={`px-4 py-2.5 text-sm sm:text-base font-semibold rounded-xl border flex items-center gap-2 transition-colors cursor-pointer ${
                          cat.is_active
                            ? 'text-amber-900 bg-amber-50 border-amber-200 hover:bg-amber-100'
                            : 'text-emerald-900 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        <Power className="w-4 h-4" />
                        <span>{cat.is_active ? 'Desactivar' : 'Activar'}</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

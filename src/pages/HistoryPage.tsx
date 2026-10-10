import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Edit2,
  Eye,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { PeriodSelector } from '../components/PeriodSelector';
import {
  Category,
  DateRange,
  Expense,
  PAYMENT_METHOD_LABELS,
  PeriodPreset,
} from '../types/expense';
import { downloadExpensesCsv } from '../utils/csvExport';
import { formatARS, sumAmounts } from '../utils/currency';
import { formatDateAR, formatTimestampAR } from '../utils/dates';

interface HistoryPageProps {
  expenses: Expense[];
  categories: Category[];
  preset: PeriodPreset;
  onSelectPreset: (preset: PeriodPreset) => void;
  customRange: { from: string; to: string };
  onChangeCustomRange: (range: { from: string; to: string }) => void;
  activeDateRange: DateRange;
  onOpenNewExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
}

type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';

const PAGE_SIZE = 15;

export const HistoryPage: React.FC<HistoryPageProps> = ({
  expenses,
  categories,
  preset,
  onSelectPreset,
  customRange,
  onChangeCustomRange,
  activeDateRange,
  onOpenNewExpense,
  onEditExpense,
  onDeleteExpense,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [applyDateFilter, setApplyDateFilter] = useState<boolean>(true);
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [detailExpense, setDetailExpense] = useState<Expense | null>(null);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach((c) => map.set(c.id, c));
    return map;
  }, [categories]);

  const filteredAndSorted = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = expenses.filter((exp) => {
      if (applyDateFilter) {
        if (exp.expense_date < activeDateRange.from || exp.expense_date > activeDateRange.to) {
          return false;
        }
      }
      if (selectedCategoryId !== 'all' && exp.category_id !== selectedCategoryId) {
        return false;
      }
      if (query) {
        const desc = (exp.description || '').toLowerCase();
        const catName = (categoryMap.get(exp.category_id)?.name || '').toLowerCase();
        if (!desc.includes(query) && !catName.includes(query)) {
          return false;
        }
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'date_desc') {
        if (b.expense_date !== a.expense_date) {
          return b.expense_date.localeCompare(a.expense_date);
        }
        return b.created_at.localeCompare(a.created_at);
      }
      if (sortBy === 'date_asc') {
        if (a.expense_date !== b.expense_date) {
          return a.expense_date.localeCompare(b.expense_date);
        }
        return a.created_at.localeCompare(b.created_at);
      }
      if (sortBy === 'amount_desc') {
        return b.amount - a.amount;
      }
      return a.amount - b.amount;
    });

    return filtered;
  }, [
    expenses,
    applyDateFilter,
    activeDateRange,
    selectedCategoryId,
    searchQuery,
    sortBy,
    categoryMap,
  ]);

  const filteredTotal = useMemo(
    () => sumAmounts(filteredAndSorted.map((e) => e.amount)),
    [filteredAndSorted]
  );

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedExpenses = filteredAndSorted.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const handleExportCsv = () => {
    if (filteredAndSorted.length === 0) return;
    downloadExpensesCsv(filteredAndSorted, categories, 'gastos_filtrados');
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y botón de exportación */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Historial de gastos
          </h1>
          <p className="text-base sm:text-lg text-slate-600 mt-1">
            Consultá, filtrá, editá o exportá a Excel todos los movimientos registrados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3.5 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredAndSorted.length === 0}
            className="px-5 py-3.5 text-base font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 border border-slate-300 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-5 h-5" />
            <span>Exportar CSV ({filteredAndSorted.length})</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewExpense}
            className="px-5 py-3.5 text-base font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Registrar gasto</span>
          </button>
        </div>
      </div>

      {/* Filtro de período opcional */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <label className="inline-flex items-center gap-2.5 text-base font-semibold text-slate-800 cursor-pointer">
            <input
              type="checkbox"
              checked={applyDateFilter}
              onChange={(e) => {
                setApplyDateFilter(e.target.checked);
                setCurrentPage(1);
              }}
              className="w-5 h-5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <span>Filtrar por el período seleccionado</span>
          </label>
          {!applyDateFilter && (
            <span className="text-sm sm:text-base font-semibold text-slate-600">
              Mostrando todas las fechas históricas
            </span>
          )}
        </div>

        {applyDateFilter && (
          <PeriodSelector
            preset={preset}
            onSelectPreset={(p) => {
              onSelectPreset(p);
              setCurrentPage(1);
            }}
            customRange={customRange}
            onChangeCustomRange={(r) => {
              onChangeCustomRange(r);
              setCurrentPage(1);
            }}
            activeDateRange={activeDateRange}
          />
        )}
      </div>

      {/* Barra de búsqueda, categoría y ordenamiento */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Buscar por descripción */}
        <div>
          <label
            htmlFor="history-search"
            className="block text-sm font-bold text-slate-800 mb-1.5"
          >
            Buscar por descripción
          </label>
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="history-search"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Ej: nafta, luz, supermercado..."
              className="w-full pl-11 pr-4 py-3 text-base border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Filtrar por categoría */}
        <div>
          <label
            htmlFor="history-category-filter"
            className="block text-sm font-bold text-slate-800 mb-1.5"
          >
            Categoría
          </label>
          <select
            id="history-category-filter"
            value={selectedCategoryId}
            onChange={(e) => {
              setSelectedCategoryId(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-3 text-base border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
                {!cat.is_active ? ' (Inactiva)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Ordenar por */}
        <div>
          <label
            htmlFor="history-sort"
            className="block text-sm font-bold text-slate-800 mb-1.5"
          >
            Ordenar por
          </label>
          <select
            id="history-sort"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as SortOption);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-3 text-base border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="date_desc">Fecha (más recientes primero)</option>
            <option value="date_asc">Fecha (más antiguos primero)</option>
            <option value="amount_desc">Importe (de mayor a menor)</option>
            <option value="amount_asc">Importe (de menor a mayor)</option>
          </select>
        </div>
      </div>

      {/* Resumen de resultados filtrados */}
      <div className="bg-white border border-slate-200 rounded-xl px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="text-base text-slate-700">
          Mostrando{' '}
          <strong className="font-mono tabular-nums text-slate-900 font-bold">
            {filteredAndSorted.length}
          </strong>{' '}
          {filteredAndSorted.length === 1 ? 'gasto encontrado' : 'gastos encontrados'}
        </div>
        <div className="text-base text-slate-700">
          Total filtrado:{' '}
          <strong className="text-xl font-bold font-mono tabular-nums text-slate-900">
            {formatARS(filteredTotal)}
          </strong>
        </div>
      </div>

      {/* Tabla / Lista de gastos */}
      {filteredAndSorted.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <p className="text-lg font-bold text-slate-900">
            No se encontraron gastos con los filtros aplicados
          </p>
          <p className="mt-1.5 text-base text-slate-600">
            Probá cambiar el período, limpiar la búsqueda o seleccionar «Todas las categorías».
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-sm font-bold text-slate-700">
                  <th className="py-4 px-4 sm:px-6">Fecha</th>
                  <th className="py-4 px-4">Categoría y descripción</th>
                  <th className="py-4 px-4 hidden md:table-cell">Medio de pago</th>
                  <th className="py-4 px-4 text-right">Importe</th>
                  <th className="py-4 px-4 sm:px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-base">
                {paginatedExpenses.map((exp) => {
                  const cat = categoryMap.get(exp.category_id);
                  return (
                    <tr
                      key={exp.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-4 px-4 sm:px-6 font-mono tabular-nums font-medium text-slate-800 whitespace-nowrap align-top">
                        {formatDateAR(exp.expense_date, 'short')}
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="font-bold text-slate-900 text-base sm:text-lg">
                          {exp.description || cat?.name || 'Sin descripción'}
                        </div>
                        <div className="text-sm text-slate-600 mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="font-medium">{cat?.name || 'Sin categoría'}</span>
                          {exp.payment_method && (
                            <span className="md:hidden">
                              · {PAYMENT_METHOD_LABELS[exp.payment_method]}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-slate-700 hidden md:table-cell align-top whitespace-nowrap">
                        {exp.payment_method
                          ? PAYMENT_METHOD_LABELS[exp.payment_method]
                          : '—'}
                      </td>

                      <td className="py-4 px-4 text-right font-mono tabular-nums font-bold text-lg sm:text-xl text-slate-900 whitespace-nowrap align-top">
                        {formatARS(exp.amount)}
                      </td>

                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap align-top">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailExpense(exp)}
                            title="Ver detalle"
                            aria-label="Ver detalle del gasto"
                            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditExpense(exp)}
                            title="Editar gasto"
                            aria-label="Editar gasto"
                            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteExpense(exp)}
                            title="Eliminar gasto"
                            aria-label="Eliminar gasto"
                            className="p-2.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
              <span className="text-sm sm:text-base font-semibold text-slate-700 font-mono tabular-nums">
                Página {safePage} de {totalPages}
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-4 py-2 text-sm sm:text-base font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span>Anterior</span>
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-4 py-2 text-sm sm:text-base font-semibold text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Siguiente</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de consulta de detalle de un gasto */}
      {detailExpense && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="expense-detail-title"
        >
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
              <h2
                id="expense-detail-title"
                className="text-xl font-bold text-slate-900"
              >
                Detalle del gasto
              </h2>
              <button
                type="button"
                onClick={() => setDetailExpense(null)}
                aria-label="Cerrar detalle"
                className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-base">
              <div className="pb-4 border-b border-slate-200">
                <span className="text-sm font-medium text-slate-600 block">Importe</span>
                <span className="text-3xl font-bold font-mono tabular-nums text-slate-900 mt-1 block">
                  {formatARS(detailExpense.amount)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-slate-600 block">Fecha del gasto</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {formatDateAR(detailExpense.expense_date, 'long')}
                  </span>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-600 block">Categoría</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {categoryMap.get(detailExpense.category_id)?.name || 'Sin categoría'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-sm font-medium text-slate-600 block">Descripción</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {detailExpense.description || 'Sin descripción adicional'}
                </span>
              </div>

              <div>
                <span className="text-sm font-medium text-slate-600 block">Medio de pago</span>
                <span className="font-bold text-slate-900 mt-0.5 block">
                  {detailExpense.payment_method
                    ? PAYMENT_METHOD_LABELS[detailExpense.payment_method]
                    : 'No especificado'}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200 text-sm text-slate-600 space-y-1 font-mono tabular-nums">
                <div>
                  Registrado el: {formatTimestampAR(detailExpense.created_at)}
                </div>
                <div>
                  Última actualización: {formatTimestampAR(detailExpense.updated_at)}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  const target = detailExpense;
                  setDetailExpense(null);
                  onEditExpense(target);
                }}
                className="px-5 py-2.5 text-base font-bold text-slate-800 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => setDetailExpense(null)}
                className="px-5 py-2.5 text-base font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

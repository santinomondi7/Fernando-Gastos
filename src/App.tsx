import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  FolderKanban,
  History,
  LayoutDashboard,
  Loader2,
  Mic,
  RefreshCw,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import { ExpenseFormModal } from './components/ExpenseFormModal';
import { SetupGuideModal } from './components/SetupGuideModal';
import { VoiceExpenseModal } from './components/VoiceExpenseModal';
import { CategoriesPage } from './pages/CategoriesPage';
import { DashboardPage } from './pages/DashboardPage';
import { HistoryPage } from './pages/HistoryPage';
import { StatisticsPage } from './pages/StatisticsPage';
import {
  createCategoryInDb,
  createExpenseInDb,
  deleteExpenseInDb,
  fetchAndEnsureCategories,
  fetchUserExpenses,
  updateCategoryInDb,
  updateExpenseInDb,
} from './services/expenseService';
import { isSupabaseConfigured } from './services/supabaseClient';
import {
  Category,
  Expense,
  ExpenseFormValues,
  PeriodPreset,
} from './types/expense';
import { formatARS } from './utils/currency';
import {
  addDays,
  formatDateAR,
  getDateRangeForPreset,
  getPreviousEquivalentRange,
  getTodayInCordoba,
} from './utils/dates';
import {
  computeHeadlineTotals,
  computePeriodStatistics,
  filterExpensesByDateRange,
} from './utils/statistics';
import { ValidatedExpensePayload } from './utils/validation';

type ActiveTab = 'dashboard' | 'history' | 'statistics' | 'categories';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const configured = isSupabaseConfigured();

  // Selector de período compartido
  const todayStr = getTodayInCordoba();
  const [preset, setPreset] = useState<PeriodPreset>('this_month');
  const [customRange, setCustomRange] = useState<{ from: string; to: string }>({
    from: addDays(todayStr, -6),
    to: todayStr,
  });

  // Modales de registro manual, edición, voz, confirmación de borrado y guía
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [initialDraft, setInitialDraft] = useState<Partial<ExpenseFormValues> | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSetupGuideOpen, setIsSetupGuideOpen] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);
    try {
      const [loadedCategories, loadedExpenses] = await Promise.all([
        fetchAndEnsureCategories(),
        fetchUserExpenses(),
      ]);
      setCategories(loadedCategories);
      setExpenses(loadedExpenses);
    } catch (err) {
      setDataError(
        err instanceof Error
          ? err.message
          : 'Error al consultar los datos de Supabase.'
      );
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cálculos derivados reales
  const activeDateRange = useMemo(
    () => getDateRangeForPreset(preset, customRange, todayStr),
    [preset, customRange, todayStr]
  );

  const previousDateRange = useMemo(
    () => getPreviousEquivalentRange(activeDateRange, preset),
    [activeDateRange, preset]
  );

  const headlineTotals = useMemo(
    () => computeHeadlineTotals(expenses, todayStr),
    [expenses, todayStr]
  );

  const periodExpenses = useMemo(
    () => filterExpensesByDateRange(expenses, activeDateRange),
    [expenses, activeDateRange]
  );

  const previousPeriodExpenses = useMemo(
    () => filterExpensesByDateRange(expenses, previousDateRange),
    [expenses, previousDateRange]
  );

  const periodStats = useMemo(
    () =>
      computePeriodStatistics(
        periodExpenses,
        previousPeriodExpenses,
        categories,
        activeDateRange
      ),
    [periodExpenses, previousPeriodExpenses, categories, activeDateRange]
  );

  const handleSaveExpense = async (payload: ValidatedExpensePayload) => {
    if (editingExpense) {
      const updated = await updateExpenseInDb(editingExpense.id, payload);
      setExpenses((prev) =>
        prev
          .map((item) => (item.id === updated.id ? updated : item))
          .sort((a, b) => {
            if (b.expense_date !== a.expense_date) {
              return b.expense_date.localeCompare(a.expense_date);
            }
            return b.created_at.localeCompare(a.created_at);
          })
      );
      setEditingExpense(null);
      setInitialDraft(null);
      showToast('Gasto actualizado correctamente.');
    } else {
      const created = await createExpenseInDb(payload);
      setExpenses((prev) =>
        [created, ...prev].sort((a, b) => {
          if (b.expense_date !== a.expense_date) {
            return b.expense_date.localeCompare(a.expense_date);
          }
          return b.created_at.localeCompare(a.created_at);
        })
      );
      setInitialDraft(null);
      showToast(`Gasto de ${formatARS(created.amount)} registrado correctamente.`);
    }
  };

  const handleConfirmDeleteExpense = async () => {
    if (!expenseToDelete || isDeleting) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await deleteExpenseInDb(expenseToDelete.id);
      setExpenses((prev) => prev.filter((e) => e.id !== expenseToDelete.id));
      setExpenseToDelete(null);
      showToast('Gasto eliminado correctamente.');
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'No se pudo eliminar el gasto.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateCategory = async (payload: { name: string; color: string }) => {
    const created = await createCategoryInDb(payload);
    setCategories((prev) =>
      [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'es-AR'))
    );
    showToast(`Categoría «${created.name}» creada.`);
  };

  const handleUpdateCategory = async (
    categoryId: string,
    payload: { name?: string; color?: string; is_active?: boolean }
  ) => {
    const updated = await updateCategoryInDb(categoryId, payload);
    setCategories((prev) =>
      prev
        .map((c) => (c.id === updated.id ? updated : c))
        .sort((a, b) => a.name.localeCompare(b.name, 'es-AR'))
    );
    showToast(`Categoría «${updated.name}» actualizada.`);
  };

  const openNewManualExpense = () => {
    setEditingExpense(null);
    setInitialDraft(null);
    setIsExpenseModalOpen(true);
  };

  const openEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setInitialDraft(null);
    setIsExpenseModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 md:pb-12">
      {/* Top Bar Contract: [Brand title, one line] — [4 nav links, single-line] — [1 primary action] */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-8 px-4 sm:px-6 py-4">
          {/* Zona 1: Marca (1 sola línea) */}
          <a
            href="#resumen"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('dashboard');
            }}
            className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            Control de Gastos
          </a>

          {/* Zona 2: 4 enlaces de navegación de una sola línea con letra grande */}
          <nav
            className="hidden md:flex items-center gap-7 text-base font-semibold text-slate-600"
            aria-label="Navegación principal"
          >
            <a
              href="#resumen"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('dashboard');
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'dashboard'
                  ? 'text-slate-900 font-bold underline underline-offset-8 decoration-2'
                  : 'hover:text-slate-900'
              }`}
            >
              Resumen
            </a>
            <a
              href="#historial"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('history');
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'history'
                  ? 'text-slate-900 font-bold underline underline-offset-8 decoration-2'
                  : 'hover:text-slate-900'
              }`}
            >
              Historial
            </a>
            <a
              href="#estadisticas"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('statistics');
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'statistics'
                  ? 'text-slate-900 font-bold underline underline-offset-8 decoration-2'
                  : 'hover:text-slate-900'
              }`}
            >
              Estadísticas
            </a>
            <a
              href="#categorias"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('categories');
              }}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'categories'
                  ? 'text-slate-900 font-bold underline underline-offset-8 decoration-2'
                  : 'hover:text-slate-900'
              }`}
            >
              Categorías
            </a>
          </nav>

          {/* Zona 3: 1 acción principal */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={openNewManualExpense}
              className="px-5 py-2.5 text-sm sm:text-base font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Registrar gasto
            </button>
          </div>
        </div>
      </header>

      {/* Barra secundaria de acciones rápidas y sincronización */}
      <div className="bg-slate-100/80 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-sm sm:text-base text-slate-700">
          <div className="flex items-center gap-2 font-medium">
            <span>Acceso directo personal</span>
          </div>

          <div className="flex items-center gap-5 shrink-0">
            <button
              type="button"
              onClick={() => setIsVoiceModalOpen(true)}
              className="font-semibold text-slate-800 hover:text-slate-900 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Dictar gasto</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={dataLoading}
              className="font-semibold text-slate-800 hover:text-slate-900 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`}
              />
              <span>Actualizar</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSetupGuideOpen(true)}
              className="font-semibold text-slate-800 hover:text-slate-900 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              <span>Configuración SQL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Aviso si falta configurar las variables de entorno de Supabase */}
      {!configured && (
        <div
          role="alert"
          className="bg-amber-50 border-b border-amber-200 px-4 py-3.5 text-amber-950 text-sm sm:text-base"
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                Falta configurar <code className="font-mono font-bold">VITE_SUPABASE_URL</code> y{' '}
                <code className="font-mono font-bold">VITE_SUPABASE_ANON_KEY</code> para guardar los gastos en Supabase.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsSetupGuideOpen(true)}
              className="px-4 py-2 text-sm font-bold text-white bg-amber-900 hover:bg-amber-800 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
            >
              Ver instrucciones y copiar SQL
            </button>
          </div>
        </div>
      )}

      {/* Aviso de pérdida de conexión */}
      {!isOnline && (
        <div
          role="alert"
          className="bg-amber-100 border-b border-amber-300 px-4 py-3.5 text-amber-950 text-base"
        >
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-amber-800 shrink-0" />
            <span className="font-semibold">
              Sin conexión a internet. Los nuevos gastos o cambios no se guardarán hasta que recuperes la conexión.
            </span>
          </div>
        </div>
      )}

      {/* Confirmación flotante no intrusiva */}
      {toastMessage && (
        <div
          role="status"
          className="max-w-7xl mx-auto px-4 sm:px-6 pt-4"
        >
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-base flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-700 shrink-0" />
              <span className="font-bold">{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              aria-label="Cerrar notificación"
              className="text-emerald-700 hover:text-emerald-950 p-1.5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {dataError && (
          <div
            role="alert"
            className="mb-6 p-5 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-base text-red-900"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error al sincronizar con Supabase</p>
                <p className="mt-1 text-red-800">{dataError}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsSetupGuideOpen(true)}
                className="px-4 py-2.5 text-sm font-bold text-red-900 bg-white border border-red-300 rounded-xl hover:bg-red-100 cursor-pointer"
              >
                Ver migración SQL
              </button>
              <button
                type="button"
                onClick={loadData}
                className="px-4 py-2.5 text-sm font-bold text-white bg-red-700 rounded-xl hover:bg-red-800 cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {dataLoading && expenses.length === 0 && categories.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <Loader2 className="w-8 h-8 text-slate-900 animate-spin mx-auto" />
            <p className="mt-3 text-base font-semibold text-slate-600">
              Cargando tus gastos y categorías...
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardPage
                preset={preset}
                onSelectPreset={setPreset}
                customRange={customRange}
                onChangeCustomRange={setCustomRange}
                activeDateRange={activeDateRange}
                headlineTotals={headlineTotals}
                stats={periodStats}
                recentPeriodExpenses={periodExpenses}
                categories={categories}
                onOpenNewExpense={openNewManualExpense}
                onOpenVoiceExpense={() => setIsVoiceModalOpen(true)}
                onEditExpense={openEditExpense}
                onDeleteExpense={(exp) => {
                  setDeleteError(null);
                  setExpenseToDelete(exp);
                }}
                onNavigateToHistory={() => setActiveTab('history')}
                onNavigateToStatistics={() => setActiveTab('statistics')}
              />
            )}

            {activeTab === 'history' && (
              <HistoryPage
                expenses={expenses}
                categories={categories}
                preset={preset}
                onSelectPreset={setPreset}
                customRange={customRange}
                onChangeCustomRange={setCustomRange}
                activeDateRange={activeDateRange}
                onOpenNewExpense={openNewManualExpense}
                onEditExpense={openEditExpense}
                onDeleteExpense={(exp) => {
                  setDeleteError(null);
                  setExpenseToDelete(exp);
                }}
              />
            )}

            {activeTab === 'statistics' && (
              <StatisticsPage
                preset={preset}
                onSelectPreset={setPreset}
                customRange={customRange}
                onChangeCustomRange={setCustomRange}
                activeDateRange={activeDateRange}
                previousDateRange={previousDateRange}
                stats={periodStats}
              />
            )}

            {activeTab === 'categories' && (
              <CategoriesPage
                categories={categories}
                expenses={expenses}
                onCreateCategory={handleCreateCategory}
                onUpdateCategory={handleUpdateCategory}
              />
            )}
          </>
        )}
      </main>

      {/* Navegación inferior para celulares con letra más grande (respeta <= 15% de alto de pantalla) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40"
        aria-label="Navegación móvil"
      >
        <div className="grid grid-cols-4 h-16">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center justify-center gap-1 text-sm cursor-pointer ${
              activeTab === 'dashboard' ? 'text-slate-900 font-bold' : 'text-slate-600 font-medium'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span>Resumen</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center gap-1 text-sm cursor-pointer ${
              activeTab === 'history' ? 'text-slate-900 font-bold' : 'text-slate-600 font-medium'
            }`}
          >
            <History className="w-5 h-5" />
            <span>Historial</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('statistics')}
            className={`flex flex-col items-center justify-center gap-1 text-sm cursor-pointer ${
              activeTab === 'statistics' ? 'text-slate-900 font-bold' : 'text-slate-600 font-medium'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Análisis</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`flex flex-col items-center justify-center gap-1 text-sm cursor-pointer ${
              activeTab === 'categories' ? 'text-slate-900 font-bold' : 'text-slate-600 font-medium'
            }`}
          >
            <FolderKanban className="w-5 h-5" />
            <span>Categorías</span>
          </button>
        </div>
      </nav>

      {/* Modal de registro manual / edición */}
      <ExpenseFormModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
          setInitialDraft(null);
        }}
        onSubmitExpense={handleSaveExpense}
        categories={categories}
        editingExpense={editingExpense}
        initialDraft={initialDraft}
      />

      {/* Modal de registro por voz con pantalla de confirmación obligatoria */}
      <VoiceExpenseModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        categories={categories}
        onConfirmSave={handleSaveExpense}
        onSwitchToEditModal={(draft) => {
          setIsVoiceModalOpen(false);
          setEditingExpense(null);
          setInitialDraft(draft);
          setIsExpenseModalOpen(true);
        }}
      />

      {/* Modal de confirmación obligatoria para eliminar un gasto */}
      {expenseToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 text-red-700 mb-3">
                <Trash2 className="w-6 h-6 shrink-0" />
                <h2
                  id="delete-confirm-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Confirmar eliminación
                </h2>
              </div>

              <p className="text-base text-slate-700">
                ¿Estás seguro de que querés eliminar este gasto de forma permanente?
              </p>

              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-base space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-600">Importe:</span>
                  <span className="font-mono tabular-nums font-bold text-slate-900">
                    {formatARS(expenseToDelete.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Fecha:</span>
                  <span className="font-mono tabular-nums font-medium text-slate-800">
                    {formatDateAR(expenseToDelete.expense_date, 'short')}
                  </span>
                </div>
                {expenseToDelete.description && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-600">Descripción:</span>
                    <span className="text-slate-900 font-semibold truncate">
                      {expenseToDelete.description}
                    </span>
                  </div>
                )}
              </div>

              {deleteError && (
                <div
                  role="alert"
                  className="mt-3 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
                >
                  {deleteError}
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setExpenseToDelete(null)}
                  disabled={isDeleting}
                  className="px-5 py-3 text-base font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteExpense}
                  disabled={isDeleting}
                  className="px-5 py-3 text-base font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <span>Sí, eliminar gasto</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guía de configuración de Supabase */}
      <SetupGuideModal
        isOpen={isSetupGuideOpen}
        onClose={() => setIsSetupGuideOpen(false)}
      />
    </div>
  );
}

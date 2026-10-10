import React from 'react';
import {
  ArrowRight,
  Edit2,
  Mic,
  Plus,
  Receipt,
  Trash2,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PeriodSelector } from '../components/PeriodSelector';
import {
  Category,
  DateRange,
  Expense,
  ExpenseStatistics,
  PAYMENT_METHOD_LABELS,
  PeriodPreset,
} from '../types/expense';
import { formatARS } from '../utils/currency';
import { formatDateAR } from '../utils/dates';

interface DashboardPageProps {
  preset: PeriodPreset;
  onSelectPreset: (preset: PeriodPreset) => void;
  customRange: { from: string; to: string };
  onChangeCustomRange: (range: { from: string; to: string }) => void;
  activeDateRange: DateRange;
  headlineTotals: {
    todayTotal: number;
    todayCount: number;
    currentMonthTotal: number;
    currentMonthCount: number;
  };
  stats: ExpenseStatistics;
  recentPeriodExpenses: Expense[];
  categories: Category[];
  onOpenNewExpense: () => void;
  onOpenVoiceExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
  onNavigateToHistory: () => void;
  onNavigateToStatistics: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  preset,
  onSelectPreset,
  customRange,
  onChangeCustomRange,
  activeDateRange,
  headlineTotals,
  stats,
  recentPeriodExpenses,
  categories,
  onOpenNewExpense,
  onOpenVoiceExpense,
  onEditExpense,
  onDeleteExpense,
  onNavigateToHistory,
  onNavigateToStatistics,
}) => {
  const categoryMap = new Map<string, Category>();
  categories.forEach((c) => categoryMap.set(c.id, c));

  const chartCategories = stats.byCategory.filter((c) => c.total > 0);

  return (
    <div className="space-y-6">
      {/* Barra superior de acciones rápidas pensada para celular y escritorio */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Resumen de gastos
          </h1>
          <p className="text-base sm:text-lg text-slate-600 mt-1">
            Registrá un gasto nuevo en segundos con el micrófono o de forma manual.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 shrink-0">
          <button
            type="button"
            onClick={onOpenVoiceExpense}
            className="px-6 py-4 text-base sm:text-lg font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors flex items-center justify-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Mic className="w-5 h-5 text-slate-900" />
            <span>Dictar por voz</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewExpense}
            className="px-6 py-4 text-base sm:text-lg font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Registrar gasto</span>
          </button>
        </div>
      </div>

      {/* Selector de período */}
      <PeriodSelector
        preset={preset}
        onSelectPreset={onSelectPreset}
        customRange={customRange}
        onChangeCustomRange={onChangeCustomRange}
        activeDateRange={activeDateRange}
      />

      {/* 4 Indicadores principales (KPIs) con letra grande y legible */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total gastado durante el mes actual */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-sm sm:text-base font-semibold text-slate-600">
            Total gastado (mes actual)
          </p>
          <p className="mt-2.5 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900">
            {formatARS(headlineTotals.currentMonthTotal)}
          </p>
          <p className="mt-2 text-sm sm:text-base text-slate-600 font-mono tabular-nums">
            {headlineTotals.currentMonthCount}{' '}
            {headlineTotals.currentMonthCount === 1 ? 'gasto en el mes' : 'gastos en el mes'}
          </p>
        </div>

        {/* 2. Total gastado durante el día actual */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-sm sm:text-base font-semibold text-slate-600">
            Total gastado (hoy)
          </p>
          <p className="mt-2.5 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900">
            {formatARS(headlineTotals.todayTotal)}
          </p>
          <p className="mt-2 text-sm sm:text-base text-slate-600 font-mono tabular-nums">
            {headlineTotals.todayCount}{' '}
            {headlineTotals.todayCount === 1 ? 'gasto registrado hoy' : 'gastos registrados hoy'}
          </p>
        </div>

        {/* 3. Total y cantidad de gastos en el período seleccionado */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-sm sm:text-base font-semibold text-slate-600">
            Gastos del período seleccionado
          </p>
          <p className="mt-2.5 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900">
            {formatARS(stats.totalPeriod)}
          </p>
          <p className="mt-2 text-sm sm:text-base text-slate-600 font-mono tabular-nums">
            {stats.countPeriod}{' '}
            {stats.countPeriod === 1 ? 'registro en el período' : 'registros en el período'}
          </p>
        </div>

        {/* 4. Categoría con mayor gasto en el período */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-sm sm:text-base font-semibold text-slate-600">
            Categoría con mayor gasto
          </p>
          {stats.topCategory ? (
            <>
              <p
                className="mt-2.5 text-xl sm:text-2xl font-bold text-slate-900 truncate"
                title={stats.topCategory.category_name}
              >
                {stats.topCategory.category_name}
              </p>
              <p className="mt-2 text-sm sm:text-base text-slate-700 font-mono tabular-nums font-medium">
                {formatARS(stats.topCategory.total)} · {stats.topCategory.percentage}%
              </p>
            </>
          ) : (
            <>
              <p className="mt-2.5 text-xl font-bold text-slate-400">
                Sin gastos
              </p>
              <p className="mt-2 text-sm sm:text-base text-slate-500">
                No hay registros en este período
              </p>
            </>
          )}
        </div>
      </div>

      {/* Estado vacío si no hay gastos en el período */}
      {stats.countPeriod === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-700">
            <Receipt className="w-7 h-7" />
          </div>
          <h2 className="mt-4 text-xl sm:text-2xl font-bold text-slate-900">
            No hay gastos registrados en este período
          </h2>
          <p className="mt-2 text-base sm:text-lg text-slate-600 max-w-lg mx-auto">
            {activeDateRange.label} aún no tiene movimientos cargados. Podés registrar un gasto manualmente o dictarlo con el micrófono.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              onClick={onOpenNewExpense}
              className="w-full sm:w-auto px-6 py-4 text-base sm:text-lg font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>Registrar gasto</span>
            </button>
            <button
              type="button"
              onClick={onOpenVoiceExpense}
              className="w-full sm:w-auto px-6 py-4 text-base sm:text-lg font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Mic className="w-5 h-5" />
              <span>Dictar por voz</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Gráficos: Distribución por categoría y Evolución temporal */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* 6. Gráfico de distribución de gastos por categoría */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                      Distribución por categoría
                    </h2>
                    <p className="text-sm sm:text-base text-slate-600">
                      Proporción sobre el total ({formatARS(stats.totalPeriod)})
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onNavigateToStatistics}
                    className="text-sm sm:text-base font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <span>Ver análisis</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartCategories}
                        dataKey="total"
                        nameKey="category_name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {chartCategories.map((entry) => (
                          <Cell key={entry.category_id} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: unknown) => [
                          formatARS(Number(value)),
                          'Importe',
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 space-y-2.5">
                {chartCategories.slice(0, 5).map((item) => (
                  <div
                    key={item.category_id}
                    className="flex items-center justify-between text-sm sm:text-base gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-xs shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-900 font-semibold truncate">
                        {item.category_name}
                      </span>
                    </div>
                    <div className="font-mono tabular-nums text-slate-800 shrink-0">
                      <span className="font-bold text-slate-900">
                        {formatARS(item.total)}
                      </span>
                      <span className="text-slate-400 mx-1.5">·</span>
                      <span className="font-medium">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 7. Evolución de los gastos a lo largo del tiempo */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                      Evolución de gastos en el tiempo
                    </h2>
                    <p className="text-sm sm:text-base text-slate-600">
                      Importes diarios en {activeDateRange.label.toLowerCase()}
                    </p>
                  </div>
                  <span className="text-sm font-mono tabular-nums font-semibold text-slate-700 shrink-0">
                    Promedio/día: {formatARS(stats.averagePerDay)}
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stats.dailyEvolution}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 13, fill: '#475569' }}
                        tickLine={false}
                        axisLine={{ stroke: '#cbd5e1' }}
                      />
                      <YAxis
                        tick={{ fontSize: 13, fill: '#475569' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val: number) =>
                          val >= 1000 ? `$${Math.round(val / 1000)}k` : `$${val}`
                        }
                      />
                      <Tooltip
                        formatter={(value: unknown) => [
                          formatARS(Number(value)),
                          'Total del día',
                        ]}
                        labelFormatter={(label) => `Fecha: ${String(label)}`}
                      />
                      <Bar
                        dataKey="total"
                        fill="#0f172a"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={44}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-sm sm:text-base text-slate-600">
                <span>
                  Promedio por gasto:{' '}
                  <strong className="font-mono tabular-nums text-slate-900">
                    {formatARS(stats.averagePerExpense)}
                  </strong>
                </span>
                <span>Hora Córdoba (AR)</span>
              </div>
            </div>
          </div>

          {/* 5. Lista de los gastos más recientes */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Gastos más recientes del período
                </h2>
                <p className="text-sm sm:text-base text-slate-600">
                  Últimos movimientos registrados en {activeDateRange.label.toLowerCase()}
                </p>
              </div>
              <button
                type="button"
                onClick={onNavigateToHistory}
                className="text-sm sm:text-base font-semibold text-slate-800 hover:text-slate-900 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Ver historial completo</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <div className="divide-y divide-slate-200">
              {recentPeriodExpenses.slice(0, 8).map((exp) => {
                const cat = categoryMap.get(exp.category_id);
                return (
                  <div
                    key={exp.id}
                    className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-base sm:text-lg font-bold text-slate-900 truncate">
                        {exp.description || cat?.name || 'Gasto registrado'}
                      </p>
                      {/* Metadatos sin píldoras (Zero-Pill Discipline) */}
                      <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm sm:text-base text-slate-600">
                        <span className="font-mono tabular-nums font-medium">
                          {formatDateAR(exp.expense_date, 'short')}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-semibold text-slate-800">
                          {cat?.name || 'Sin categoría'}
                        </span>
                        {exp.payment_method && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{PAYMENT_METHOD_LABELS[exp.payment_method]}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-slate-900">
                        {formatARS(exp.amount)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditExpense(exp)}
                          aria-label="Editar gasto"
                          title="Editar gasto"
                          className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteExpense(exp)}
                          aria-label="Eliminar gasto"
                          title="Eliminar gasto"
                          className="p-2.5 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

import React from 'react';
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
  DateRange,
  ExpenseStatistics,
  PeriodPreset,
} from '../types/expense';
import { formatARS } from '../utils/currency';

interface StatisticsPageProps {
  preset: PeriodPreset;
  onSelectPreset: (preset: PeriodPreset) => void;
  customRange: { from: string; to: string };
  onChangeCustomRange: (range: { from: string; to: string }) => void;
  activeDateRange: DateRange;
  previousDateRange: DateRange;
  stats: ExpenseStatistics;
}

export const StatisticsPage: React.FC<StatisticsPageProps> = ({
  preset,
  onSelectPreset,
  customRange,
  onChangeCustomRange,
  activeDateRange,
  previousDateRange,
  stats,
}) => {
  const activeCategoriesWithSpending = stats.byCategory.filter((c) => c.total > 0);
  const categoriesIncreased = stats.byCategory.filter((c) => c.deltaAmount > 0);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Análisis y estadísticas
        </h1>
        <p className="text-base sm:text-lg text-slate-600 mt-1">
          Totales por categoría, evolución temporal y comparación con el período equivalente anterior ({previousDateRange.label}).
        </p>
      </div>

      <PeriodSelector
        preset={preset}
        onSelectPreset={onSelectPreset}
        customRange={customRange}
        onChangeCustomRange={onChangeCustomRange}
        activeDateRange={activeDateRange}
      />

      {/* Resumen comparativo de períodos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-sm sm:text-base font-semibold text-slate-600">
            Total en el período seleccionado
          </p>
          <p className="mt-2.5 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900">
            {formatARS(stats.totalPeriod)}
          </p>
          <p className="mt-2 text-sm sm:text-base text-slate-600 font-mono tabular-nums">
            {stats.countPeriod} {stats.countPeriod === 1 ? 'gasto' : 'gastos'} · {activeDateRange.label}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-sm sm:text-base font-semibold text-slate-600">
            Período equivalente anterior
          </p>
          <p className="mt-2.5 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-700">
            {formatARS(stats.previousPeriodTotal)}
          </p>
          <p className="mt-2 text-sm sm:text-base text-slate-600 font-mono tabular-nums">
            {previousDateRange.label}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-sm sm:text-base font-semibold text-slate-600">
            Variación frente al período anterior
          </p>
          <p
            className={`mt-2.5 text-2xl sm:text-3xl font-bold font-mono tabular-nums ${
              stats.previousPeriodDelta > 0
                ? 'text-red-700'
                : stats.previousPeriodDelta < 0
                ? 'text-emerald-700'
                : 'text-slate-900'
            }`}
          >
            {stats.previousPeriodDelta > 0 ? '+ ' : ''}
            {formatARS(stats.previousPeriodDelta)}
          </p>
          <p className="mt-2 text-sm sm:text-base text-slate-600 font-mono tabular-nums">
            {stats.previousPeriodPercentage !== null
              ? `${stats.previousPeriodPercentage > 0 ? '+' : ''}${stats.previousPeriodPercentage}% respecto al período previo`
              : 'Sin gastos en el período previo'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-sm sm:text-base font-semibold text-slate-600">
            Promedio diario en el período
          </p>
          <p className="mt-2.5 text-2xl sm:text-3xl font-bold font-mono tabular-nums text-slate-900">
            {formatARS(stats.averagePerDay)}
          </p>
          <p className="mt-2 text-sm sm:text-base text-slate-600 font-mono tabular-nums">
            Promedio por gasto: {formatARS(stats.averagePerExpense)}
          </p>
        </div>
      </div>

      {/* Respuestas rápidas a preguntas frecuentes */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4">
          Síntesis del período ({activeDateRange.label})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-base text-slate-800">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-sm font-medium text-slate-600">
              ¿Cuál fue la categoría de mayor gasto?
            </p>
            {stats.topCategory ? (
              <p className="mt-1.5 text-base sm:text-lg font-bold text-slate-900">
                {stats.topCategory.category_name} con{' '}
                <span className="font-mono tabular-nums">
                  {formatARS(stats.topCategory.total)}
                </span>{' '}
                ({stats.topCategory.percentage}% del total).
              </p>
            ) : (
              <p className="mt-1.5 text-slate-500">
                No se registraron gastos en este período.
              </p>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-sm font-medium text-slate-600">
              ¿En qué categorías aumentó el gasto respecto a {previousDateRange.label}?
            </p>
            {categoriesIncreased.length > 0 ? (
              <p className="mt-1.5 text-base sm:text-lg font-bold text-slate-900">
                {categoriesIncreased
                  .slice(0, 3)
                  .map(
                    (c) =>
                      `${c.category_name} (+${formatARS(c.deltaAmount)})`
                  )
                  .join(', ')}
                .
              </p>
            ) : (
              <p className="mt-1.5 text-slate-500">
                Ninguna categoría superó el gasto del período anterior.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Gráficos */}
      {stats.countPeriod > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
              Distribución por categoría
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mb-4">
              Participación de cada rubro sobre {formatARS(stats.totalPeriod)}
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activeCategoriesWithSpending}
                    dataKey="total"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {activeCategoriesWithSpending.map((entry) => (
                      <Cell key={entry.category_id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: unknown) => [formatARS(Number(val)), 'Total']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-1">
              Evolución diaria del gasto
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mb-4">
              Comportamiento de los gastos a lo largo de {activeDateRange.label.toLowerCase()}
            </p>
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
                    formatter={(val: unknown) => [formatARS(Number(val)), 'Gasto del día']}
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
        </div>
      )}

      {/* Tabla de categorías ordenada por importe */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200">
          <h2 className="text-lg sm:text-xl font-bold text-slate-900">
            Tabla de categorías ordenada por importe
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Desglose completo de importes, porcentajes y comparación contra {previousDateRange.label}
          </p>
        </div>

        {stats.byCategory.length === 0 ? (
          <div className="p-8 text-center text-base text-slate-600">
            No existen gastos registrados ni en el período actual ni en el período anterior.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-sm font-bold text-slate-700">
                  <th className="py-4 px-6">Categoría</th>
                  <th className="py-4 px-4 text-right">Cantidad</th>
                  <th className="py-4 px-4 text-right">Total período</th>
                  <th className="py-4 px-4 text-right">% del total</th>
                  <th className="py-4 px-4 text-right">Período anterior</th>
                  <th className="py-4 px-6 text-right">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-base">
                {stats.byCategory.map((item) => (
                  <tr
                    key={item.category_id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-4 px-6 font-bold text-slate-900">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3.5 h-3.5 rounded-xs shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.category_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right font-mono tabular-nums font-medium text-slate-700">
                      {item.count}
                    </td>
                    <td className="py-4 px-4 text-right font-mono tabular-nums font-bold text-lg text-slate-900">
                      {formatARS(item.total)}
                    </td>
                    <td className="py-4 px-4 text-right font-mono tabular-nums font-medium text-slate-700">
                      {item.percentage.toFixed(1)}%
                    </td>
                    <td className="py-4 px-4 text-right font-mono tabular-nums text-slate-600">
                      {formatARS(item.previousTotal)}
                    </td>
                    <td
                      className={`py-4 px-6 text-right font-mono tabular-nums font-bold ${
                        item.deltaAmount > 0
                          ? 'text-red-700'
                          : item.deltaAmount < 0
                          ? 'text-emerald-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {item.deltaAmount > 0 ? '+ ' : ''}
                      {formatARS(item.deltaAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

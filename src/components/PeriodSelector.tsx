import React from 'react';
import { Calendar } from 'lucide-react';
import { DateRange, PeriodPreset } from '../types/expense';

interface PeriodSelectorProps {
  preset: PeriodPreset;
  onSelectPreset: (preset: PeriodPreset) => void;
  customRange: { from: string; to: string };
  onChangeCustomRange: (range: { from: string; to: string }) => void;
  activeDateRange: DateRange;
}

const PRESET_OPTIONS: Array<{ id: PeriodPreset; label: string }> = [
  { id: 'today', label: 'Hoy' },
  { id: 'this_week', label: 'Esta semana' },
  { id: 'this_month', label: 'Este mes' },
  { id: 'last_month', label: 'Mes anterior' },
  { id: 'last_30_days', label: 'Últimos 30 días' },
  { id: 'custom', label: 'Personalizado' },
];

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  preset,
  onSelectPreset,
  customRange,
  onChangeCustomRange,
  activeDateRange,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex items-center gap-2.5 text-base sm:text-lg text-slate-700">
          <Calendar className="w-5 h-5 text-slate-600 shrink-0" />
          <span className="font-semibold text-slate-900">Período:</span>
          <span className="text-slate-800 font-mono tabular-nums font-medium">
            {activeDateRange.label}
          </span>
        </div>

        <div
          className="flex flex-wrap items-center gap-2 bg-slate-100 p-2 rounded-xl"
          role="group"
          aria-label="Selector de período"
        >
          {PRESET_OPTIONS.map((option) => {
            const isActive = preset === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectPreset(option.id)}
                className={`px-4 py-2.5 text-sm sm:text-base font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/80'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {preset === 'custom' && (
        <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
          <div className="flex-1">
            <label
              htmlFor="custom-date-from"
              className="block text-sm font-semibold text-slate-800 mb-1.5"
            >
              Desde fecha
            </label>
            <input
              id="custom-date-from"
              type="date"
              value={customRange.from}
              max={customRange.to || undefined}
              onChange={(e) =>
                onChangeCustomRange({ ...customRange, from: e.target.value })
              }
              className="w-full px-4 py-3 text-base border border-slate-300 rounded-lg bg-white text-slate-900 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div className="flex-1">
            <label
              htmlFor="custom-date-to"
              className="block text-sm font-semibold text-slate-800 mb-1.5"
            >
              Hasta fecha
            </label>
            <input
              id="custom-date-to"
              type="date"
              value={customRange.to}
              min={customRange.from || undefined}
              onChange={(e) =>
                onChangeCustomRange({ ...customRange, to: e.target.value })
              }
              className="w-full px-4 py-3 text-base border border-slate-300 rounded-lg bg-white text-slate-900 font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>
      )}
    </div>
  );
};

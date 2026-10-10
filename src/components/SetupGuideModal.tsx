import React, { useState } from 'react';
import { Check, Copy, Database, Terminal, X } from 'lucide-react';
import { INITIAL_SQL_MIGRATION } from '../lib/sqlMigration';
import { DEFAULT_INITIAL_CATEGORIES, PAYMENT_METHOD_LABELS } from '../types/expense';
import { formatARS } from '../utils/currency';
import { formatDateAR, getTodayInCordoba } from '../utils/dates';
import { parseVoiceExpenseTranscript } from '../utils/voiceParser';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [testPhrase, setTestPhrase] = useState('Gasté 18.500 pesos en combustible');

  if (!isOpen) return null;

  const mockCategoriesForPreview = DEFAULT_INITIAL_CATEGORIES.map((c, idx) => ({
    id: `cat-${idx + 1}`,
    user_id: '00000000-0000-0000-0000-000000000001',
    name: c.name,
    icon: c.icon,
    color: c.color,
    is_active: true,
    created_at: new Date().toISOString(),
  }));

  const parsedPreview = parseVoiceExpenseTranscript(
    testPhrase,
    mockCategoriesForPreview,
    getTodayInCordoba()
  );

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(INITIAL_SQL_MIGRATION);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-guide-title"
    >
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden my-auto max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-slate-900" />
            <h2 id="setup-guide-title" className="text-lg font-semibold text-slate-900">
              Guía de Configuración de Supabase (Usuario Único sin Contraseña)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar guía"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {/* Paso 1: Variables de Entorno */}
          <section className="space-y-2">
            <h3 className="text-base font-semibold text-slate-900">
              01. Configurar variables de entorno
            </h3>
            <p>
              En tu proyecto de Supabase, dirigite a{' '}
              <span className="font-medium text-slate-900">
                Project Settings → API
              </span>{' '}
              y configurá las siguientes variables de entorno en AI Studio (panel Secrets / Variables) o en tu archivo{' '}
              <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                .env
              </code>{' '}
              / Vercel:
            </p>
            <div className="p-3.5 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs space-y-1 overflow-x-auto">
              <div>VITE_SUPABASE_URL="https://tu-proyecto-id.supabase.co"</div>
              <div>VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."</div>
            </div>
            <p className="text-xs text-slate-500">
              Importante: Utilizá únicamente la clave pública <code className="font-mono">anon / public</code>. No se requiere iniciar sesión con correo ni contraseña.
            </p>
          </section>

          {/* Paso 2: Migración SQL */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-slate-900">
                02. Ejecutar migración SQL en Supabase
              </h3>
              <button
                type="button"
                onClick={handleCopySql}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>SQL copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar migración SQL</span>
                  </>
                )}
              </button>
            </div>
            <p>
              Abrí el{' '}
              <span className="font-medium text-slate-900">SQL Editor</span> en el panel de Supabase, pegá el contenido de{' '}
              <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                supabase/migrations/001_initial_schema.sql
              </code>{' '}
              y presioná <span className="font-medium text-slate-900">Run</span>. Esto creará las tablas{' '}
              <code className="font-mono text-xs">categories</code> y{' '}
              <code className="font-mono text-xs">expenses</code> con tipo{' '}
              <code className="font-mono text-xs">NUMERIC(14,2)</code>, cargará automáticamente las 9 categorías iniciales y dejará habilitado el acceso directo de usuario único sin contraseña.
            </p>
            <pre className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs text-slate-800 max-h-48 overflow-y-auto">
              {INITIAL_SQL_MIGRATION}
            </pre>
          </section>

          {/* Paso 3: Probador interactivo del intérprete de voz y moneda */}
          <section className="space-y-3 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-slate-700" />
              <h3 className="text-base font-semibold text-slate-900">
                Verificador en vivo del intérprete de voz (es-AR)
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Probá cómo el motor interpreta expresiones monetarias argentinas, fechas relativas y categorías:
            </p>
            <input
              type="text"
              value={testPhrase}
              onChange={(e) => setTestPhrase(e.target.value)}
              className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              placeholder="Ej: Ayer gasté 12.000 en el supermercado"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <div>
                <span className="text-slate-500 block">Importe detectado</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5 block">
                  {parsedPreview.amount !== null
                    ? formatARS(parsedPreview.amount)
                    : 'No especificado'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Categoría</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {parsedPreview.matchedCategoryName || 'Requiere selección'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Fecha (Córdoba)</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5 block">
                  {formatDateAR(parsedPreview.expense_date, 'short')}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Descripción / Pago</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {parsedPreview.description || '—'}
                  {parsedPreview.payment_method
                    ? ` · ${PAYMENT_METHOD_LABELS[parsedPreview.payment_method]}`
                    : ''}
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Edit3,
  Loader2,
  Mic,
  MicOff,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  Category,
  ExpenseFormValues,
  PAYMENT_METHOD_LABELS,
  VoiceParsedDraft,
} from '../types/expense';
import { formatARS, parseARSInput } from '../utils/currency';
import { formatDateAR, getTodayInCordoba } from '../utils/dates';
import { ValidatedExpensePayload, validateExpenseForm } from '../utils/validation';
import { parseVoiceExpenseTranscript } from '../utils/voiceParser';

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface BrowserSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognitionConstructor(): (new () => BrowserSpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as Record<string, unknown>;
  return (
    (win.SpeechRecognition as new () => BrowserSpeechRecognition) ||
    (win.webkitSpeechRecognition as new () => BrowserSpeechRecognition) ||
    null
  );
}

interface VoiceExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onConfirmSave: (payload: ValidatedExpensePayload) => Promise<void>;
  onSwitchToEditModal: (draft: Partial<ExpenseFormValues>) => void;
}

const EXAMPLE_PHRASES = [
  'Gasté 18.500 pesos en combustible',
  'Ayer gasté 12.000 en el supermercado',
  'Pagué 45.000 pesos de luz',
  'Gasté 8.500 en una cena',
  'Hoy gasté 30.000 en ropa con tarjeta',
];

export const VoiceExpenseModal: React.FC<VoiceExpenseModalProps> = ({
  isOpen,
  onClose,
  categories,
  onConfirmSave,
  onSwitchToEditModal,
}) => {
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [parsedDraft, setParsedDraft] = useState<VoiceParsedDraft | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const selectableCategories = categories.filter((c) => c.is_active);

  useEffect(() => {
    const Constructor = getSpeechRecognitionConstructor();
    setIsSupported(Boolean(Constructor));
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignorar errores al abortar al cerrar el modal
        }
      }
      setIsListening(false);
      setTranscript('');
      setSpeechError(null);
      setParsedDraft(null);
      setSaveError(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const startListening = () => {
    const Constructor = getSpeechRecognitionConstructor();
    if (!Constructor) {
      setIsSupported(false);
      setSpeechError(
        'El reconocimiento de voz no está disponible en este navegador. Podés escribir la frase abajo o registrar el gasto manualmente.'
      );
      return;
    }

    setSpeechError(null);
    setSaveError(null);
    setParsedDraft(null);
    setTranscript('');

    try {
      const recognition = new Constructor();
      recognition.lang = 'es-AR';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let latestText = '';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let combined = '';
        for (let i = 0; i < event.results.length; i++) {
          combined += event.results[i][0].transcript;
        }
        latestText = combined.trim();
        setTranscript(latestText);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setSpeechError(
            'Permiso de micrófono denegado. Habilitá el acceso al micrófono en el navegador o escribí la frase a continuación.'
          );
        } else if (event.error === 'no-speech') {
          setSpeechError(
            'No se escuchó ninguna frase. Tocá el micrófono nuevamente y hablá claro cerca del dispositivo.'
          );
        } else {
          setSpeechError(
            'No se pudo procesar el audio del micrófono. Podés reintentar o usar el cuadro de texto.'
          );
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (latestText.trim()) {
          const draft = parseVoiceExpenseTranscript(
            latestText.trim(),
            categories,
            getTodayInCordoba()
          );
          setParsedDraft(draft);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
      setSpeechError(
        'No se pudo iniciar el micrófono en este dispositivo. Podés escribir la frase o usar el formulario manual.'
      );
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleInterpretText = (textToParse: string) => {
    setSpeechError(null);
    setSaveError(null);
    const trimmed = textToParse.trim();
    if (!trimmed) {
      setSpeechError('Ingresá o dictá una frase para interpretar el gasto.');
      return;
    }
    setTranscript(trimmed);
    const draft = parseVoiceExpenseTranscript(
      trimmed,
      categories,
      getTodayInCordoba()
    );
    setParsedDraft(draft);
  };

  const handleConfirmAndSave = async () => {
    if (!parsedDraft || isSaving) return;
    setSaveError(null);

    const formValues: ExpenseFormValues = {
      amountInput: parsedDraft.amountInput,
      category_id: parsedDraft.category_id,
      description: parsedDraft.description,
      expense_date: parsedDraft.expense_date,
      payment_method: parsedDraft.payment_method,
    };

    const validation = validateExpenseForm(formValues, categories);
    if (!validation.valid || !validation.payload) {
      const firstError =
        validation.errors.amountInput ||
        validation.errors.category_id ||
        validation.errors.expense_date ||
        'Revisá que el importe y la categoría estén completos antes de confirmar.';
      setSaveError(firstError);
      return;
    }

    setIsSaving(true);
    try {
      await onConfirmSave(validation.payload);
      onClose();
    } catch (err) {
      setSaveError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el gasto en Supabase. Intentá nuevamente.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSwitchToEdit = () => {
    if (!parsedDraft) {
      onSwitchToEditModal({});
      return;
    }
    onSwitchToEditModal({
      amountInput: parsedDraft.amountInput,
      category_id: parsedDraft.category_id,
      description: parsedDraft.description,
      expense_date: parsedDraft.expense_date,
      payment_method: parsedDraft.payment_method,
    });
  };

  const selectedCategoryObj = parsedDraft
    ? categories.find((c) => c.id === parsedDraft.category_id)
    : undefined;

  const parsedAmountPreview = parsedDraft
    ? parseARSInput(parsedDraft.amountInput)
    : { valid: false, value: null };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voice-modal-title"
    >
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden my-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
          <h2 id="voice-modal-title" className="text-xl font-bold text-slate-900">
            {parsedDraft ? 'Revisar gasto reconocido por voz' : 'Registrar gasto por voz'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Cerrar ventana"
            className="p-2.5 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* PASO 1: Escucha o ingreso de frase */}
          {!parsedDraft && (
            <>
              {!isSupported && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-base text-amber-900 flex items-start gap-3">
                  <MicOff className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-2.5">
                    <p className="font-semibold">
                      El reconocimiento de voz directo no está disponible en este navegador.
                    </p>
                    <p className="text-sm text-amber-800">
                      Podés usar el micrófono del teclado de tu celular en el cuadro de abajo o abrir el formulario manual.
                    </p>
                    <button
                      type="button"
                      onClick={() => onSwitchToEditModal({})}
                      className="px-4 py-2 text-sm font-bold bg-amber-900 text-white rounded-lg hover:bg-amber-800 transition-colors cursor-pointer"
                    >
                      Ir al formulario manual
                    </button>
                  </div>
                </div>
              )}

              {speechError && (
                <div
                  role="alert"
                  className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-base text-red-800"
                >
                  <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                  <span>{speechError}</span>
                </div>
              )}

              {/* Botón principal de micrófono */}
              {isSupported && (
                <div className="flex flex-col items-center justify-center py-5 text-center">
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={`w-28 h-28 rounded-full flex items-center justify-center transition-transform cursor-pointer ${
                      isListening
                        ? 'bg-red-600 text-white scale-105 ring-4 ring-red-100'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                    aria-label={isListening ? 'Detener dictado' : 'Comenzar a hablar'}
                  >
                    <Mic className="w-12 h-12" />
                  </button>
                  <p className="mt-4 text-lg font-bold text-slate-900">
                    {isListening
                      ? 'Escuchando... Tocá el botón rojo para terminar'
                      : 'Tocá el micrófono y decí tu gasto'}
                  </p>
                  <p className="mt-1.5 text-sm text-slate-600 max-w-md">
                    Ejemplo: «Gasté 18.500 pesos en combustible» o «Ayer gasté 12.000 en el supermercado»
                  </p>
                </div>
              )}

              {/* Transcripción en vivo o entrada alternativa */}
              <div>
                <label
                  htmlFor="voice-transcript-input"
                  className="block text-sm font-bold text-slate-800 mb-2"
                >
                  Frase dictada (también podés escribirla acá):
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    id="voice-transcript-input"
                    type="text"
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Ej: Gasté 18.500 pesos en combustible"
                    className="flex-1 px-4 py-3 text-base border border-slate-300 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleInterpretText(transcript)}
                    className="px-5 py-3 text-base font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Interpretar
                  </button>
                </div>
              </div>

              {/* Frases de prueba rápida */}
              <div className="pt-3 border-t border-slate-200">
                <p className="text-sm font-semibold text-slate-600 mb-2.5">
                  Ejemplos de frases que podés decir o tocar para probar:
                </p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PHRASES.map((phrase) => (
                    <button
                      key={phrase}
                      type="button"
                      onClick={() => handleInterpretText(phrase)}
                      className="text-left px-3 py-2 text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      «{phrase}»
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* PASO 2: Pantalla de revisión obligatoria antes de guardar */}
          {parsedDraft && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-sm text-slate-600 mb-1">Frase reconocida:</p>
                <p className="text-base font-bold text-slate-900">
                  «{parsedDraft.rawTranscript}»
                </p>
              </div>

              {parsedDraft.warnings.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-950 space-y-1.5">
                  {parsedDraft.warnings.map((w, idx) => (
                    <p key={idx} className="font-semibold">
                      • {w}
                    </p>
                  ))}
                </div>
              )}

              {saveError && (
                <div
                  role="alert"
                  className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-base text-red-800"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Tarjeta de datos reconocidos */}
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-200 bg-white">
                {/* Importe */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-base text-slate-700 font-medium">Importe:</span>
                  {parsedAmountPreview.valid && parsedAmountPreview.value !== null ? (
                    <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                      {formatARS(parsedAmountPreview.value)}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-mono font-bold text-slate-500">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Ingresá el importe"
                        value={parsedDraft.amountInput}
                        onChange={(e) =>
                          setParsedDraft((prev) =>
                            prev ? { ...prev, amountInput: e.target.value } : prev
                          )
                        }
                        className="px-3.5 py-2 text-lg font-mono tabular-nums border border-amber-400 rounded-lg bg-amber-50/40 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  )}
                </div>

                {/* Categoría */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <span className="text-base text-slate-700 font-medium">Categoría:</span>
                  {selectedCategoryObj ? (
                    <span className="text-base font-bold text-slate-900">
                      {selectedCategoryObj.name}
                    </span>
                  ) : (
                    <select
                      aria-label="Seleccionar categoría"
                      value={parsedDraft.category_id}
                      onChange={(e) =>
                        setParsedDraft((prev) =>
                          prev ? { ...prev, category_id: e.target.value } : prev
                        )
                      }
                      className="px-3.5 py-2 text-base font-medium border border-amber-400 rounded-lg bg-amber-50/40 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="">Seleccioná una categoría...</option>
                      {selectableCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Fecha */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-base text-slate-700 font-medium">Fecha:</span>
                  <span className="text-base font-bold text-slate-900">
                    {formatDateAR(parsedDraft.expense_date, 'long')}
                  </span>
                </div>

                {/* Descripción */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-base text-slate-700 font-medium">Descripción:</span>
                  <span className="text-base font-bold text-slate-900">
                    {parsedDraft.description || 'Sin descripción'}
                  </span>
                </div>

                {/* Medio de pago */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <span className="text-base text-slate-700 font-medium">Medio de pago:</span>
                  <span className="text-base font-bold text-slate-900">
                    {parsedDraft.payment_method
                      ? PAYMENT_METHOD_LABELS[parsedDraft.payment_method]
                      : 'Sin especificar'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setParsedDraft(null);
                    setSaveError(null);
                  }}
                  disabled={isSaving}
                  className="text-sm font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Volver a dictar otra frase</span>
                </button>
              </div>

              {/* Botones obligatorios: Confirmar y guardar | Editar | Cancelar */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-5 py-3.5 text-base font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSwitchToEdit}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-5 py-3.5 text-base font-semibold text-slate-900 border border-slate-300 bg-white hover:bg-slate-50 rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Edit3 className="w-5 h-5" />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndSave}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-3.5 text-base font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-60 rounded-xl transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      <span>Confirmar y guardar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

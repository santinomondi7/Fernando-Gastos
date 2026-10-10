# Control de Gastos — Aplicación Personal (ARS, Usuario Único sin Contraseña)

Aplicación web responsive en español de Argentina para registrar, consultar y analizar gastos personales en pesos argentinos (`ARS`), con acceso directo de usuario único (sin pantalla de login ni contraseña), carga manual y reconocimiento de voz (`es-AR`) con confirmación obligatoria, respaldada por **Supabase** (PostgreSQL + RLS).

---

## 1. Arquitectura y Estructura del Proyecto

```text
/
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql      # Esquema PostgreSQL usuario único, categorías iniciales y RLS
├── src/
│   ├── components/
│   │   ├── ExpenseFormModal.tsx        # Formulario de alta/edición manual con validaciones
│   │   ├── PeriodSelector.tsx          # Selector de período (Hoy, Semana, Mes, Mes anterior, 30 días, Personalizado)
│   │   ├── SetupGuideModal.tsx         # Guía interactiva de configuración SQL y verificador de voz
│   │   └── VoiceExpenseModal.tsx       # Dictado por voz (es-AR) + pantalla de confirmación obligatoria
│   ├── lib/
│   │   └── sqlMigration.ts             # Copia embebida de la migración SQL para consulta rápida
│   ├── pages/
│   │   ├── CategoriesPage.tsx          # Administración de categorías (crear, renombrar, activar/desactivar)
│   │   ├── DashboardPage.tsx           # Pantalla principal con KPIs, gráficos Recharts y últimos gastos
│   │   ├── HistoryPage.tsx             # Historial completo, búsqueda, filtros, paginación y exportación CSV
│   │   └── StatisticsPage.tsx          # Estadísticas detalladas y comparación entre períodos equivalentes
│   ├── services/
│   │   ├── expenseService.ts           # Operaciones reales de lectura/escritura contra Supabase (usuario único)
│   │   └── supabaseClient.ts           # Inicialización del cliente de Supabase
│   ├── types/
│   │   └── expense.ts                  # Definiciones TypeScript del dominio financiero
│   └── utils/
│       ├── __tests__/
│       │   └── financialLogic.test.ts  # Suite de pruebas automatizadas (Vitest)
│       ├── csvExport.ts                # Exportación CSV con BOM UTF-8 y protección anti-inyección de fórmulas
│       ├── currency.ts                 # Aritmética exacta en centavos y formato monetario argentino ($ 25.000,00)
│       ├── dates.ts                    # Manejo de fechas en zona horaria America/Argentina/Cordoba
│       ├── statistics.ts               # Cálculo de indicadores, porcentajes y variaciones por período
│       ├── validation.ts               # Validaciones de gastos y categorías
│       └── voiceParser.ts              # Intérprete de frases de gasto en español de Argentina
├── .env.example                        # Plantilla de variables de entorno (sin secretos)
├── vercel.json                         # Configuración de despliegue para Vercel
└── package.json
```

---

## 2. Variables de Entorno Requeridas

Copiá el archivo `.env.example` a `.env` (o configuralas en el panel de secretos de AI Studio / Vercel):

| Variable | Descripción | Dónde obtenerla |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | URL pública del proyecto de Supabase | Supabase Dashboard → *Project Settings* → *API* → *Project URL* |
| `VITE_SUPABASE_ANON_KEY` | Clave pública `anon` de Supabase | Supabase Dashboard → *Project Settings* → *API* → *Project API keys* → `anon` / `public` |

---

## 3. Instrucciones para Configurar Supabase (Sin Cuentas ni Contraseñas)

1. Ingresá a [https://supabase.com](https://supabase.com) y creá un proyecto llamado **Control de Gastos**.
2. En el menú lateral izquierdo, abrí **SQL Editor** → **New query**.
3. Copiá el contenido completo del archivo `supabase/migrations/001_initial_schema.sql` (también disponible desde el botón **«Configuración SQL»** dentro de la app) y ejecutalo haciendo clic en **Run**.
   - Se crearán las tablas `public.categories` y `public.expenses` con montos `NUMERIC(14, 2)` y el identificador de usuario único por defecto (`00000000-0000-0000-0000-000000000001`).
   - Se insertarán automáticamente las 9 categorías iniciales (*Comida y supermercado*, *Combustible y transporte*, *Servicios e impuestos*, *Salud*, *Compras personales*, *Hogar*, *Salidas y entretenimiento*, *Deporte*, *Otros*).
   - Todos los dispositivos donde se abra la aplicación (PC y celular de tu papá) verán y guardarán exactamente los mismos gastos sin pedir correo ni contraseña.

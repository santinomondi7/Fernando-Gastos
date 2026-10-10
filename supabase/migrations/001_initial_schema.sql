-- =============================================================================
-- MIGRACIÓN 001: ESQUEMA USUARIO ÚNICO SIN CONTRASEÑA — CONTROL DE GASTOS
-- Base de datos: PostgreSQL (Supabase)
-- Zona horaria de referencia: America/Argentina/Cordoba
-- Usuario único fijo: 00000000-0000-0000-0000-000000000001
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- 1. TABLA: categories
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) > 0 AND char_length(name) <= 80),
  icon TEXT DEFAULT 'receipt',
  color TEXT DEFAULT '#0F172A',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_categories_id_user UNIQUE (id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_user_name_idx
  ON public.categories (user_id, lower(btrim(name)));

CREATE INDEX IF NOT EXISTS idx_categories_user_active
  ON public.categories (user_id, is_active);

-- -----------------------------------------------------------------------------
-- 2. TABLA: expenses
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  category_id UUID NOT NULL,
  description TEXT CHECK (description IS NULL OR char_length(description) <= 300),
  expense_date DATE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Cordoba')::DATE,
  payment_method TEXT CHECK (
    payment_method IS NULL OR
    payment_method IN ('efectivo', 'debito', 'credito', 'transferencia', 'mercadopago', 'otro')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_expenses_category_owner
    FOREIGN KEY (category_id, user_id)
    REFERENCES public.categories (id, user_id)
    ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_expenses_user_date
  ON public.expenses (user_id, expense_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_user_category
  ON public.expenses (user_id, category_id);

-- -----------------------------------------------------------------------------
-- 3. TRIGGER: actualización automática de updated_at
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 4. CARGA INICIAL: 9 Categorías por defecto para el usuario único
-- -----------------------------------------------------------------------------
INSERT INTO public.categories (user_id, name, icon, color, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Comida y supermercado', 'shopping-cart', '#0F766E', true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Combustible y transporte', 'car', '#B45309', true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Servicios e impuestos', 'file-text', '#1D4ED8', true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Salud', 'heart-pulse', '#BE123C', true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Compras personales', 'shopping-bag', '#6D28D9', true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Hogar', 'home', '#047857', true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Salidas y entretenimiento', 'utensils', '#C2410C', true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Deporte', 'dumbbell', '#0369A1', true),
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Otros', 'circle-dot', '#475569', true)
ON CONFLICT (user_id, lower(btrim(name))) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. SEGURIDAD: Row Level Security (RLS) para usuario único sin login
-- -----------------------------------------------------------------------------
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories FORCE ROW LEVEL SECURITY;

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses FORCE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon, authenticated;

-- Políticas para categories (restringidas al ID de usuario único)
DROP POLICY IF EXISTS "categories_single_user_all" ON public.categories;
CREATE POLICY "categories_single_user_all"
  ON public.categories
  FOR ALL
  TO anon, authenticated
  USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid)
  WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Políticas para expenses (restringidas al ID de usuario único y categorías válidas)
DROP POLICY IF EXISTS "expenses_single_user_all" ON public.expenses;
CREATE POLICY "expenses_single_user_all"
  ON public.expenses
  FOR ALL
  TO anon, authenticated
  USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid)
  WITH CHECK (
    user_id = '00000000-0000-0000-0000-000000000001'::uuid
    AND EXISTS (
      SELECT 1
      FROM public.categories c
      WHERE c.id = category_id
        AND c.user_id = '00000000-0000-0000-0000-000000000001'::uuid
    )
  );

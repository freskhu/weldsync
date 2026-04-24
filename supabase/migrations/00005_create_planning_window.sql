-- Planning window: defines the active horizon for scheduling
-- Migration: 00005_create_planning_window
--
-- Only one row with is_active = true exists at a time (enforced via partial unique index).
-- Inactive rows are kept as history. The UI always reads the single active row.

CREATE TABLE planning_window (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    label TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT planning_window_end_after_start CHECK (end_date >= start_date)
);

-- Only one active window at a time
CREATE UNIQUE INDEX idx_planning_window_single_active
    ON planning_window (is_active)
    WHERE is_active = true;

-- Auto-update updated_at
CREATE TRIGGER trg_planning_window_updated_at
    BEFORE UPDATE ON planning_window
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed with a sensible default: next 4 weeks starting from Monday of current week
INSERT INTO planning_window (start_date, end_date, label, is_active)
VALUES (
    date_trunc('week', CURRENT_DATE)::date,
    (date_trunc('week', CURRENT_DATE) + INTERVAL '4 weeks - 1 day')::date,
    'Janela inicial',
    true
);

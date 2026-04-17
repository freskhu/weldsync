-- Core tables for WeldSync
-- Migration: 00002_create_tables

-- Robot table
CREATE TABLE robot (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    capacity_kg INTEGER NOT NULL,
    setup_type TEXT NOT NULL,
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Project table
CREATE TABLE project (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_ref TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    deadline DATE,
    status project_status NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Program table (before Piece, since Piece references it)
CREATE TABLE program (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    piece_reference TEXT NOT NULL,
    client_ref TEXT,
    is_template BOOLEAN NOT NULL DEFAULT false,
    template_id UUID REFERENCES program(id) ON DELETE SET NULL,
    robot_id INTEGER REFERENCES robot(id) ON DELETE SET NULL,
    file_type program_file_type NOT NULL,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    execution_time_min INTEGER,
    wps TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Piece table
CREATE TABLE piece (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES project(id) ON DELETE CASCADE,
    reference TEXT NOT NULL,
    description TEXT,
    material TEXT,
    wps TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    weight_kg NUMERIC,
    estimated_hours NUMERIC,
    status piece_status NOT NULL DEFAULT 'backlog',
    robot_id INTEGER REFERENCES robot(id) ON DELETE SET NULL,
    scheduled_date DATE,
    scheduled_period schedule_period,
    urgent BOOLEAN NOT NULL DEFAULT false,
    barcode TEXT,
    program_id UUID REFERENCES program(id) ON DELETE SET NULL,
    position INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (project_id, reference)
);

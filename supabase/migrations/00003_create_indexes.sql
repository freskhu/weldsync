-- Indexes for WeldSync
-- Migration: 00003_create_indexes

-- Piece indexes
CREATE INDEX idx_piece_project_id ON piece(project_id);
CREATE INDEX idx_piece_robot_scheduled ON piece(robot_id, scheduled_date);
CREATE INDEX idx_piece_status ON piece(status);

-- Program indexes
CREATE INDEX idx_program_piece_reference ON program(piece_reference);
CREATE INDEX idx_program_client_ref ON program(client_ref);

-- Full-text search index on Program
ALTER TABLE program ADD COLUMN search_vector tsvector
    GENERATED ALWAYS AS (
        to_tsvector('simple',
            coalesce(piece_reference, '') || ' ' ||
            coalesce(client_ref, '') || ' ' ||
            coalesce(notes, '')
        )
    ) STORED;

CREATE INDEX idx_program_search ON program USING gin(search_vector);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at on Robot
CREATE TRIGGER trg_robot_updated_at
    BEFORE UPDATE ON robot
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update updated_at on Project
CREATE TRIGGER trg_project_updated_at
    BEFORE UPDATE ON project
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update updated_at on Piece
CREATE TRIGGER trg_piece_updated_at
    BEFORE UPDATE ON piece
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

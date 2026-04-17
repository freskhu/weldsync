-- Seed data: 5 Curval welding robots
-- Migration: 00004_seed_robots

INSERT INTO robot (name, description, capacity_kg, setup_type, capabilities) VALUES
    ('Robot 1 — Posicionador 7t', 'Posicionador com capacidade de 7 toneladas', 7000, 'posicionador', '["posicionador"]'::jsonb),
    ('Robot 2 — Coluna + Posicionador 15t', 'Coluna com posicionador, capacidade de 15 toneladas', 15000, 'coluna_posicionador', '["coluna", "posicionador"]'::jsonb),
    ('Robot 3 — Coluna + Posicionador 15t', 'Coluna com posicionador, capacidade de 15 toneladas', 15000, 'coluna_posicionador', '["coluna", "posicionador"]'::jsonb),
    ('Robot 4 — Monobloco 2 Áreas 1t', 'Monobloco com 2 áreas de trabalho, capacidade de 1 tonelada', 1000, 'monobloco', '["monobloco", "2_areas"]'::jsonb),
    ('Robot 5 — Mesa Rotativa 10t', 'Mesa rotativa com capacidade de 10 toneladas', 10000, 'mesa_rotativa', '["mesa_rotativa"]'::jsonb);

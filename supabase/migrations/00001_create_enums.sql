-- Enums for WeldSync
-- Migration: 00001_create_enums

CREATE TYPE project_status AS ENUM ('active', 'completed', 'archived');
CREATE TYPE piece_status AS ENUM ('backlog', 'programmed', 'allocated', 'in_production', 'completed');
CREATE TYPE schedule_period AS ENUM ('AM', 'PM');
CREATE TYPE program_file_type AS ENUM ('tp', 'ls');

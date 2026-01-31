-- OnSite Eagle Database Schema
-- Execute this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sites (Construction sites / subdivisions)
CREATE TABLE sites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  svg_data TEXT, -- SVG do mapa do loteamento
  original_plan_url TEXT, -- URL do PDF/imagem original
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Houses (Individual lots/houses)
CREATE TABLE houses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  lot_number VARCHAR(50) NOT NULL,
  address TEXT,
  status VARCHAR(20) DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'delayed', 'completed')),
  current_phase INTEGER DEFAULT 0,
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  coordinates JSONB, -- {x, y, width, height} for SVG positioning
  qr_code_data TEXT, -- QR code identifier
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(site_id, lot_number)
);

-- Phases (Construction phases template)
CREATE TABLE phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  order_index INTEGER NOT NULL,
  description TEXT,
  required_photos INTEGER DEFAULT 2,
  ai_checklist JSONB DEFAULT '[]', -- Items AI should verify
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Phase Items (Detailed checklist items per phase)
CREATE TABLE phase_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id UUID REFERENCES phases(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_critical BOOLEAN DEFAULT false,
  ai_detection_keywords JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- House Progress (Progress tracking per house per phase)
CREATE TABLE house_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES phases(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'ai_review', 'approved', 'rejected')),
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(house_id, phase_id)
);

-- Phase Photos (Photos uploaded by workers)
CREATE TABLE phase_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES phases(id) ON DELETE CASCADE,
  uploaded_by UUID,
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  ai_validation_status VARCHAR(20) DEFAULT 'pending' CHECK (ai_validation_status IN ('pending', 'approved', 'rejected', 'needs_review')),
  ai_validation_notes TEXT,
  ai_detected_items JSONB DEFAULT '[]',
  ai_confidence DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timeline Events (Chronological diary of each house)
CREATE TABLE timeline_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('photo', 'email', 'calendar', 'note', 'alert', 'ai_validation', 'status_change', 'issue', 'inspection')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  source VARCHAR(50), -- 'gmail', 'calendar', 'manual', 'system', 'worker_app'
  source_link TEXT, -- Link to original (email, calendar event, etc)
  metadata JSONB, -- Additional structured data
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Issues (Problems reported)
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_id UUID REFERENCES houses(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES phases(id),
  reported_by UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  photo_urls JSONB DEFAULT '[]',
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plan Scans (Uploaded subdivision plans for AI processing)
CREATE TABLE plan_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  file_type VARCHAR(20), -- 'pdf', 'png', 'jpg'
  ai_processed BOOLEAN DEFAULT false,
  ai_result JSONB, -- Full AI analysis result
  generated_svg TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default phases (wood frame construction)
INSERT INTO phases (name, order_index, description, required_photos, ai_checklist) VALUES
('First Floor', 1, 'First floor framing - joists, subfloor, blocking', 2, '["floor joists installed", "subfloor sheathing", "blocking between joists", "beam pockets", "rim board"]'),
('First Floor Walls', 2, 'First floor wall framing', 2, '["wall studs", "headers over openings", "corner framing", "top plate", "bottom plate", "window rough openings", "door rough openings"]'),
('Second Floor', 3, 'Second floor framing', 1, '["floor joists", "subfloor sheathing", "stairwell opening", "blocking"]'),
('Second Floor Walls', 4, 'Second floor wall framing', 2, '["wall studs", "headers", "corner framing", "top plate", "ceiling joists connection"]'),
('Roof', 5, 'Roof framing and sheathing', 2, '["roof trusses", "ridge board", "sheathing", "fascia board", "soffit framing", "gable end framing"]'),
('Stairs Landing', 6, 'Stair framing and landing', 1, '["stair stringers", "landing framing", "headers", "handrail blocking"]'),
('Backing Frame', 7, 'Backing for fixtures and finishes', 1, '["bathroom blocking", "kitchen cabinet blocking", "handrail blocking", "TV mount blocking", "grab bar blocking"]');

-- Create indexes for performance
CREATE INDEX idx_houses_site ON houses(site_id);
CREATE INDEX idx_houses_status ON houses(status);
CREATE INDEX idx_house_progress_house ON house_progress(house_id);
CREATE INDEX idx_phase_photos_house ON phase_photos(house_id);
CREATE INDEX idx_timeline_house ON timeline_events(house_id);
CREATE INDEX idx_timeline_created ON timeline_events(created_at DESC);
CREATE INDEX idx_issues_house ON issues(house_id);
CREATE INDEX idx_issues_status ON issues(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON sites FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_houses_updated_at BEFORE UPDATE ON houses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_house_progress_updated_at BEFORE UPDATE ON house_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies (basic - expand based on auth needs)
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_scans ENABLE ROW LEVEL SECURITY;

-- Allow all for now (development) - tighten for production
CREATE POLICY "Allow all for sites" ON sites FOR ALL USING (true);
CREATE POLICY "Allow all for houses" ON houses FOR ALL USING (true);
CREATE POLICY "Allow all for phases" ON phases FOR ALL USING (true);
CREATE POLICY "Allow all for phase_items" ON phase_items FOR ALL USING (true);
CREATE POLICY "Allow all for house_progress" ON house_progress FOR ALL USING (true);
CREATE POLICY "Allow all for phase_photos" ON phase_photos FOR ALL USING (true);
CREATE POLICY "Allow all for timeline_events" ON timeline_events FOR ALL USING (true);
CREATE POLICY "Allow all for issues" ON issues FOR ALL USING (true);
CREATE POLICY "Allow all for plan_scans" ON plan_scans FOR ALL USING (true);

-- Storage bucket for photos and plans
-- Run this in Supabase Dashboard > Storage > Create bucket
-- Bucket name: eagle-files
-- Public: false

CREATE TABLE reviewers (
  id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('doctor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID REFERENCES reviewers(id) ON DELETE SET NULL,
  patient_ref TEXT,
  image_url TEXT NOT NULL,
  gradcam_url TEXT,
  prediction TEXT NOT NULL CHECK (prediction IN ('healthy', 'infected')),
  confidence NUMERIC(5,2) NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'validated', 'rejected')),
  reviewer_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cases_reviewer_id ON cases(reviewer_id);
CREATE INDEX idx_cases_review_status ON cases(review_status);
CREATE INDEX idx_cases_prediction ON cases(prediction);
CREATE INDEX idx_cases_created_at ON cases(created_at DESC);

ALTER TABLE cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviewers DISABLE ROW LEVEL SECURITY;

INSERT INTO reviewers (id, full_name, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'Dr. Test', 'doctor')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

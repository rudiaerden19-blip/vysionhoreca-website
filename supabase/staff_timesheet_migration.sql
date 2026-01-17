-- Staff & Timesheet Migration
-- Tabellen voor personeel en uren registratie

-- 1. Staff (medewerkers)
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  pin VARCHAR(4) NOT NULL,
  role VARCHAR(20) DEFAULT 'EMPLOYEE', -- ADMIN, MANAGER, EMPLOYEE
  color VARCHAR(7) DEFAULT '#3b82f6',
  contract_type VARCHAR(20), -- VAST, INTERIM, FLEXI, STUDENT, SEIZOEN, FREELANCE, STAGE
  hours_per_week DECIMAL(5,2),
  hourly_rate DECIMAL(10,2),
  contract_start DATE,
  contract_end DATE,
  contract_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Timesheet Entries (uren per dag)
CREATE TABLE IF NOT EXISTS timesheet_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug VARCHAR(100) NOT NULL,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIME,
  clock_out TIME,
  break_minutes INTEGER DEFAULT 0,
  worked_hours DECIMAL(5,2) DEFAULT 0,
  absence_type VARCHAR(20) DEFAULT 'WORKED', -- WORKED, SICK, VACATION, SHORT_LEAVE, AUTHORIZED, HOLIDAY, MATERNITY, PATERNITY, UNPAID, TRAINING, OTHER
  absence_hours DECIMAL(5,2),
  notes TEXT,
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES staff(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_slug, staff_id, date)
);

-- 3. Monthly Timesheets (maandoverzichten)
CREATE TABLE IF NOT EXISTS monthly_timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug VARCHAR(100) NOT NULL,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_worked_hours DECIMAL(6,2) DEFAULT 0,
  total_sick_hours DECIMAL(6,2) DEFAULT 0,
  total_vacation_hours DECIMAL(6,2) DEFAULT 0,
  total_short_leave_hours DECIMAL(6,2) DEFAULT 0,
  total_authorized_hours DECIMAL(6,2) DEFAULT 0,
  total_holiday_hours DECIMAL(6,2) DEFAULT 0,
  total_maternity_hours DECIMAL(6,2) DEFAULT 0,
  total_paternity_hours DECIMAL(6,2) DEFAULT 0,
  total_unpaid_hours DECIMAL(6,2) DEFAULT 0,
  total_training_hours DECIMAL(6,2) DEFAULT 0,
  total_other_hours DECIMAL(6,2) DEFAULT 0,
  total_paid_hours DECIMAL(6,2) DEFAULT 0,
  contracted_hours DECIMAL(5,2) DEFAULT 0,
  overtime DECIMAL(6,2) DEFAULT 0,
  is_closed BOOLEAN DEFAULT false,
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID REFERENCES staff(id),
  exported_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_slug, staff_id, year, month)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_staff_tenant ON staff(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(tenant_slug, is_active);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_tenant ON timesheet_entries(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_staff ON timesheet_entries(staff_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_date ON timesheet_entries(tenant_slug, staff_id, date);
CREATE INDEX IF NOT EXISTS idx_monthly_timesheets_tenant ON monthly_timesheets(tenant_slug);
CREATE INDEX IF NOT EXISTS idx_monthly_timesheets_period ON monthly_timesheets(tenant_slug, staff_id, year, month);

-- Row Level Security
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_timesheets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "public_staff" ON staff FOR ALL USING (true);
CREATE POLICY "public_timesheet_entries" ON timesheet_entries FOR ALL USING (true);
CREATE POLICY "public_monthly_timesheets" ON monthly_timesheets FOR ALL USING (true);

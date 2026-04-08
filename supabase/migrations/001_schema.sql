-- ============================================================
-- REATIVA — Schema principal
-- Execute no Supabase SQL Editor
-- ============================================================

-- companies
CREATE TABLE IF NOT EXISTS companies (
  id uuid DEFAULT auth.uid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  segment text CHECK (segment IN ('clinica','salao','academia','loja','outro')),
  plan text DEFAULT 'starter' CHECK (plan IN ('starter','pro','business')),
  status text DEFAULT 'trial' CHECK (status IN ('trial','active','inactive','blocked')),
  messages_used_month int DEFAULT 0,
  trial_ends_at timestamptz DEFAULT now() + interval '14 days',
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_self" ON companies FOR SELECT USING (id = auth.uid());
CREATE POLICY "companies_insert_self" ON companies FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "companies_update_self" ON companies FOR UPDATE USING (id = auth.uid());

-- company_integrations
CREATE TABLE IF NOT EXISTS company_integrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  zapi_instance_id text,
  zapi_token text,
  zapi_phone text,
  zapi_status text DEFAULT 'disconnected' CHECK (zapi_status IN ('disconnected','connecting','connected')),
  last_sync_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE company_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integrations_select" ON company_integrations FOR SELECT USING (company_id = auth.uid());
CREATE POLICY "integrations_insert" ON company_integrations FOR INSERT WITH CHECK (company_id = auth.uid());
CREATE POLICY "integrations_update" ON company_integrations FOR UPDATE USING (company_id = auth.uid());

-- contacts
CREATE TABLE IF NOT EXISTS contacts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  last_interaction_date date,
  total_spent numeric(10,2) DEFAULT 0,
  visit_count int DEFAULT 0,
  source text DEFAULT 'csv',
  status text DEFAULT 'inactive' CHECK (status IN ('active','inactive','reactivated','unsubscribed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, phone)
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_select" ON contacts FOR SELECT USING (company_id = auth.uid());
CREATE POLICY "contacts_insert" ON contacts FOR INSERT WITH CHECK (company_id = auth.uid());
CREATE POLICY "contacts_update" ON contacts FOR UPDATE USING (company_id = auth.uid());
CREATE POLICY "contacts_delete" ON contacts FOR DELETE USING (company_id = auth.uid());

-- campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  segment_days int NOT NULL DEFAULT 30,
  message_template text NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft','scheduled','running','paused','finished')),
  total_contacts int DEFAULT 0,
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_select" ON campaigns FOR SELECT USING (company_id = auth.uid());
CREATE POLICY "campaigns_insert" ON campaigns FOR INSERT WITH CHECK (company_id = auth.uid());
CREATE POLICY "campaigns_update" ON campaigns FOR UPDATE USING (company_id = auth.uid());
CREATE POLICY "campaigns_delete" ON campaigns FOR DELETE USING (company_id = auth.uid());

-- messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  phone text NOT NULL,
  message_text text NOT NULL,
  zapi_message_id text,
  status text DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','delivered','read','replied','failed')),
  error_message text,
  queued_at timestamptz DEFAULT now(),
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  replied_at timestamptz
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select" ON messages FOR SELECT USING (company_id = auth.uid());
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (company_id = auth.uid());
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (company_id = auth.uid());

-- conversions
CREATE TABLE IF NOT EXISTS conversions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES contacts(id),
  campaign_id uuid REFERENCES campaigns(id),
  revenue_amount numeric(10,2) DEFAULT 0,
  notes text,
  converted_at timestamptz DEFAULT now()
);

ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversions_select" ON conversions FOR SELECT USING (company_id = auth.uid());
CREATE POLICY "conversions_insert" ON conversions FOR INSERT WITH CHECK (company_id = auth.uid());

-- webhook_logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id),
  source text,
  payload jsonb,
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(company_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_campaign ON messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(company_id, status);
CREATE INDEX IF NOT EXISTS idx_conversions_company ON conversions(company_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_company ON campaigns(company_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversions;

-- Trigger: updated_at on contacts
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RPC: increment messages used
CREATE OR REPLACE FUNCTION increment_messages_used(
  p_company_id uuid,
  p_amount int DEFAULT 1
) RETURNS void AS $$
BEGIN
  UPDATE companies
  SET messages_used_month = messages_used_month + p_amount
  WHERE id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: batch upsert contacts
CREATE OR REPLACE FUNCTION upsert_contacts(
  p_company_id uuid,
  p_contacts jsonb
) RETURNS jsonb AS $$
DECLARE
  v_imported int := 0;
  v_duplicates int := 0;
  v_errors int := 0;
  v_contact jsonb;
BEGIN
  FOR v_contact IN SELECT * FROM jsonb_array_elements(p_contacts)
  LOOP
    BEGIN
      INSERT INTO contacts (company_id, name, phone, email, last_interaction_date, total_spent, visit_count, source)
      VALUES (
        p_company_id,
        v_contact->>'name',
        v_contact->>'phone',
        v_contact->>'email',
        (v_contact->>'last_interaction_date')::date,
        COALESCE((v_contact->>'total_spent')::numeric, 0),
        COALESCE((v_contact->>'visit_count')::int, 0),
        'csv'
      )
      ON CONFLICT (company_id, phone) DO NOTHING;

      IF FOUND THEN
        v_imported := v_imported + 1;
      ELSE
        v_duplicates := v_duplicates + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'imported', v_imported,
    'duplicates', v_duplicates,
    'errors', v_errors
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

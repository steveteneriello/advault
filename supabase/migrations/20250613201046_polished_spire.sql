-- Create campaign categories table
CREATE TABLE IF NOT EXISTS campaign_manager_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  parent_category_id uuid REFERENCES campaign_manager_categories(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaign_manager_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES campaign_manager_categories(id),
  description text,
  start_date date,
  end_date date,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  target_locations jsonb,
  budget numeric(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create keywords table
CREATE TABLE IF NOT EXISTS campaign_manager_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaign_manager_campaigns(id),
  keyword text NOT NULL,
  match_type text DEFAULT 'broad' CHECK (match_type IN ('broad', 'phrase', 'exact')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create keyword statistics table
CREATE TABLE IF NOT EXISTS campaign_manager_keyword_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword_id uuid REFERENCES campaign_manager_keywords(id),
  local_volume integer,
  market_volume integer,
  keyword_difficulty integer,
  cpc numeric(10,2),
  competitive_density numeric(5,2),
  last_updated timestamptz DEFAULT now(),
  UNIQUE(keyword_id)
);

-- Create negative keywords table
CREATE TABLE IF NOT EXISTS campaign_manager_negative_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaign_manager_campaigns(id),
  keyword text NOT NULL,
  match_type text DEFAULT 'broad' CHECK (match_type IN ('broad', 'phrase', 'exact')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_manager_campaigns_category ON campaign_manager_campaigns(category_id);
CREATE INDEX IF NOT EXISTS idx_campaign_manager_keywords_campaign ON campaign_manager_keywords(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_manager_negative_keywords_campaign ON campaign_manager_negative_keywords(campaign_id);

-- Enable Row Level Security (RLS)
ALTER TABLE campaign_manager_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_manager_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_manager_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_manager_keyword_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_manager_negative_keywords ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read campaign_manager_categories"
  ON campaign_manager_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read campaign_manager_campaigns"
  ON campaign_manager_campaigns FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read campaign_manager_keywords"
  ON campaign_manager_keywords FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read campaign_manager_keyword_stats"
  ON campaign_manager_keyword_stats FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read campaign_manager_negative_keywords"
  ON campaign_manager_negative_keywords FOR SELECT TO authenticated USING (true);

-- Create policies for service role (full access)
CREATE POLICY "Allow service role full access to campaign_manager_categories"
  ON campaign_manager_categories FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to campaign_manager_campaigns"
  ON campaign_manager_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to campaign_manager_keywords"
  ON campaign_manager_keywords FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to campaign_manager_keyword_stats"
  ON campaign_manager_keyword_stats FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow service role full access to campaign_manager_negative_keywords"
  ON campaign_manager_negative_keywords FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Sample data insertion
-- Insert a plumbing category
INSERT INTO campaign_manager_categories (name, description) 
VALUES ('Plumbing', 'Plumbing services and related categories');

-- Insert a drain cleaning campaign
WITH plumbing_category AS (
  SELECT id FROM campaign_manager_categories WHERE name = 'Plumbing'
)
INSERT INTO campaign_manager_campaigns (name, category_id, description, start_date, status)
VALUES (
  'Drain Cleaning Campaign', 
  (SELECT id FROM plumbing_category),
  'Targeted drain cleaning services campaign',
  CURRENT_DATE,
  'draft'
);

-- Insert keywords for the drain cleaning campaign
WITH drain_cleaning_campaign AS (
  SELECT id FROM campaign_manager_campaigns WHERE name = 'Drain Cleaning Campaign'
)
INSERT INTO campaign_manager_keywords (campaign_id, keyword, match_type)
VALUES 
  ((SELECT id FROM drain_cleaning_campaign), 'drain cleaning', 'broad'),
  ((SELECT id FROM drain_cleaning_campaign), 'drain cleaning near me', 'phrase'),
  ((SELECT id FROM drain_cleaning_campaign), 'emergency drain cleaning', 'exact'),
  ((SELECT id FROM drain_cleaning_campaign), 'roto rooter', 'broad'),
  ((SELECT id FROM drain_cleaning_campaign), 'roto rooter near me', 'phrase');

-- Insert keyword statistics
WITH drain_cleaning_keywords AS (
  SELECT id, keyword FROM campaign_manager_keywords 
  WHERE campaign_id = (SELECT id FROM campaign_manager_campaigns WHERE name = 'Drain Cleaning Campaign')
)
INSERT INTO campaign_manager_keyword_stats (keyword_id, local_volume, market_volume, keyword_difficulty, cpc, competitive_density)
SELECT 
  id,
  CASE 
    WHEN keyword = 'drain cleaning' THEN 1200
    WHEN keyword = 'drain cleaning near me' THEN 850
    WHEN keyword = 'emergency drain cleaning' THEN 450
    WHEN keyword = 'roto rooter' THEN 600
    WHEN keyword = 'roto rooter near me' THEN 320
  END,
  CASE 
    WHEN keyword = 'drain cleaning' THEN 3500
    WHEN keyword = 'drain cleaning near me' THEN 2700
    WHEN keyword = 'emergency drain cleaning' THEN 1200
    WHEN keyword = 'roto rooter' THEN 1800
    WHEN keyword = 'roto rooter near me' THEN 950
  END,
  CASE 
    WHEN keyword = 'drain cleaning' THEN 55
    WHEN keyword = 'drain cleaning near me' THEN 62
    WHEN keyword = 'emergency drain cleaning' THEN 70
    WHEN keyword = 'roto rooter' THEN 45
    WHEN keyword = 'roto rooter near me' THEN 50
  END,
  CASE 
    WHEN keyword = 'drain cleaning' THEN 12.50
    WHEN keyword = 'drain cleaning near me' THEN 15.75
    WHEN keyword = 'emergency drain cleaning' THEN 18.25
    WHEN keyword = 'roto rooter' THEN 10.90
    WHEN keyword = 'roto rooter near me' THEN 13.50
  END,
  CASE 
    WHEN keyword = 'drain cleaning' THEN 0.75
    WHEN keyword = 'drain cleaning near me' THEN 0.85
    WHEN keyword = 'emergency drain cleaning' THEN 0.90
    WHEN keyword = 'roto rooter' THEN 0.65
    WHEN keyword = 'roto rooter near me' THEN 0.70
  END
FROM drain_cleaning_keywords;

-- Insert negative keywords for the drain cleaning campaign
WITH drain_cleaning_campaign AS (
  SELECT id FROM campaign_manager_campaigns WHERE name = 'Drain Cleaning Campaign'
)
INSERT INTO campaign_manager_negative_keywords (campaign_id, keyword, match_type)
VALUES 
  ((SELECT id FROM drain_cleaning_campaign), 'draino', 'exact'),
  ((SELECT id FROM drain_cleaning_campaign), 'how to unclog drain', 'broad'),
  ((SELECT id FROM drain_cleaning_campaign), 'best drain cleaning treatments', 'phrase'),
  ((SELECT id FROM drain_cleaning_campaign), 'best drain cleaners', 'phrase'),
  ((SELECT id FROM drain_cleaning_campaign), 'floor drain cleaning', 'broad'),
  ((SELECT id FROM drain_cleaning_campaign), 'gutter drain cleaning', 'broad'),
  ((SELECT id FROM drain_cleaning_campaign), 'ac drain cleaning', 'broad');
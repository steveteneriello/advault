/*
  # Campaign Manager Schema

  1. New Tables
    - `campaign_manager_categories` - Categories for organizing campaigns
    - `campaign_manager_campaigns` - Main campaigns table
    - `campaign_manager_keywords` - Keywords associated with campaigns
    - `campaign_manager_keyword_stats` - Performance metrics for keywords
    - `campaign_manager_negative_keywords` - Negative keywords for campaigns
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users and service role
  
  3. Sample Data
    - Add sample category, campaign, keywords, and stats with existence checks
*/

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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campaign_manager_categories' 
    AND policyname = 'Allow authenticated users to read campaign_manager_categories'
  ) THEN
    CREATE POLICY "Allow authenticated users to read campaign_manager_categories"
      ON campaign_manager_categories FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campaign_manager_campaigns' 
    AND policyname = 'Allow authenticated users to read campaign_manager_campaigns'
  ) THEN
    CREATE POLICY "Allow authenticated users to read campaign_manager_campaigns"
      ON campaign_manager_campaigns FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campaign_manager_keywords' 
    AND policyname = 'Allow authenticated users to read campaign_manager_keywords'
  ) THEN
    CREATE POLICY "Allow authenticated users to read campaign_manager_keywords"
      ON campaign_manager_keywords FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campaign_manager_keyword_stats' 
    AND policyname = 'Allow authenticated users to read campaign_manager_keyword_stats'
  ) THEN
    CREATE POLICY "Allow authenticated users to read campaign_manager_keyword_stats"
      ON campaign_manager_keyword_stats FOR SELECT TO authenticated USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campaign_manager_negative_keywords' 
    AND policyname = 'Allow authenticated users to read campaign_manager_negative_keywords'
  ) THEN
    CREATE POLICY "Allow authenticated users to read campaign_manager_negative_keywords"
      ON campaign_manager_negative_keywords FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

-- Create policies for service role (full access)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campaign_manager_categories' 
    AND policyname = 'Allow service role full access to campaign_manager_categories'
  ) THEN
    CREATE POLICY "Allow service role full access to campaign_manager_categories"
      ON campaign_manager_categories FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campaign_manager_campaigns' 
    AND policyname = 'Allow service role full access to campaign_manager_campaigns'
  ) THEN
    CREATE POLICY "Allow service role full access to campaign_manager_campaigns"
      ON campaign_manager_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campaign_manager_keywords' 
    AND policyname = 'Allow service role full access to campaign_manager_keywords'
  ) THEN
    CREATE POLICY "Allow service role full access to campaign_manager_keywords"
      ON campaign_manager_keywords FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campaign_manager_keyword_stats' 
    AND policyname = 'Allow service role full access to campaign_manager_keyword_stats'
  ) THEN
    CREATE POLICY "Allow service role full access to campaign_manager_keyword_stats"
      ON campaign_manager_keyword_stats FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'campaign_manager_negative_keywords' 
    AND policyname = 'Allow service role full access to campaign_manager_negative_keywords'
  ) THEN
    CREATE POLICY "Allow service role full access to campaign_manager_negative_keywords"
      ON campaign_manager_negative_keywords FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Sample data insertion with existence checks
-- Insert a plumbing category if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM campaign_manager_categories WHERE name = 'Plumbing') THEN
    INSERT INTO campaign_manager_categories (name, description) 
    VALUES ('Plumbing', 'Plumbing services and related categories');
  END IF;
END $$;

-- Insert a drain cleaning campaign if it doesn't exist
DO $$
DECLARE
  plumbing_category_id uuid;
BEGIN
  SELECT id INTO plumbing_category_id FROM campaign_manager_categories WHERE name = 'Plumbing';
  
  IF NOT EXISTS (SELECT 1 FROM campaign_manager_campaigns WHERE name = 'Drain Cleaning Campaign') THEN
    INSERT INTO campaign_manager_campaigns (name, category_id, description, start_date, status)
    VALUES (
      'Drain Cleaning Campaign', 
      plumbing_category_id,
      'Targeted drain cleaning services campaign',
      CURRENT_DATE,
      'draft'
    );
  END IF;
END $$;

-- Insert keywords for the drain cleaning campaign if they don't exist
DO $$
DECLARE
  campaign_id uuid;
BEGIN
  SELECT id INTO campaign_id FROM campaign_manager_campaigns WHERE name = 'Drain Cleaning Campaign';
  
  -- Insert keywords only if they don't exist for this campaign
  IF NOT EXISTS (SELECT 1 FROM campaign_manager_keywords WHERE campaign_id = campaign_id AND keyword = 'drain cleaning') THEN
    INSERT INTO campaign_manager_keywords (campaign_id, keyword, match_type)
    VALUES (campaign_id, 'drain cleaning', 'broad');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM campaign_manager_keywords WHERE campaign_id = campaign_id AND keyword = 'drain cleaning near me') THEN
    INSERT INTO campaign_manager_keywords (campaign_id, keyword, match_type)
    VALUES (campaign_id, 'drain cleaning near me', 'phrase');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM campaign_manager_keywords WHERE campaign_id = campaign_id AND keyword = 'emergency drain cleaning') THEN
    INSERT INTO campaign_manager_keywords (campaign_id, keyword, match_type)
    VALUES (campaign_id, 'emergency drain cleaning', 'exact');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM campaign_manager_keywords WHERE campaign_id = campaign_id AND keyword = 'roto rooter') THEN
    INSERT INTO campaign_manager_keywords (campaign_id, keyword, match_type)
    VALUES (campaign_id, 'roto rooter', 'broad');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM campaign_manager_keywords WHERE campaign_id = campaign_id AND keyword = 'roto rooter near me') THEN
    INSERT INTO campaign_manager_keywords (campaign_id, keyword, match_type)
    VALUES (campaign_id, 'roto rooter near me', 'phrase');
  END IF;
END $$;

-- Insert keyword statistics for each keyword if they don't exist
DO $$
DECLARE
  keyword_rec RECORD;
BEGIN
  FOR keyword_rec IN 
    SELECT id, keyword 
    FROM campaign_manager_keywords 
    WHERE campaign_id = (SELECT id FROM campaign_manager_campaigns WHERE name = 'Drain Cleaning Campaign')
  LOOP
    -- Skip if stats already exist for this keyword
    IF NOT EXISTS (SELECT 1 FROM campaign_manager_keyword_stats WHERE keyword_id = keyword_rec.id) THEN
      INSERT INTO campaign_manager_keyword_stats (
        keyword_id, 
        local_volume, 
        market_volume, 
        keyword_difficulty, 
        cpc, 
        competitive_density
      )
      VALUES (
        keyword_rec.id,
        CASE 
          WHEN keyword_rec.keyword = 'drain cleaning' THEN 1200
          WHEN keyword_rec.keyword = 'drain cleaning near me' THEN 850
          WHEN keyword_rec.keyword = 'emergency drain cleaning' THEN 450
          WHEN keyword_rec.keyword = 'roto rooter' THEN 600
          WHEN keyword_rec.keyword = 'roto rooter near me' THEN 320
          ELSE 0
        END,
        CASE 
          WHEN keyword_rec.keyword = 'drain cleaning' THEN 3500
          WHEN keyword_rec.keyword = 'drain cleaning near me' THEN 2700
          WHEN keyword_rec.keyword = 'emergency drain cleaning' THEN 1200
          WHEN keyword_rec.keyword = 'roto rooter' THEN 1800
          WHEN keyword_rec.keyword = 'roto rooter near me' THEN 950
          ELSE 0
        END,
        CASE 
          WHEN keyword_rec.keyword = 'drain cleaning' THEN 55
          WHEN keyword_rec.keyword = 'drain cleaning near me' THEN 62
          WHEN keyword_rec.keyword = 'emergency drain cleaning' THEN 70
          WHEN keyword_rec.keyword = 'roto rooter' THEN 45
          WHEN keyword_rec.keyword = 'roto rooter near me' THEN 50
          ELSE 0
        END,
        CASE 
          WHEN keyword_rec.keyword = 'drain cleaning' THEN 12.50
          WHEN keyword_rec.keyword = 'drain cleaning near me' THEN 15.75
          WHEN keyword_rec.keyword = 'emergency drain cleaning' THEN 18.25
          WHEN keyword_rec.keyword = 'roto rooter' THEN 10.90
          WHEN keyword_rec.keyword = 'roto rooter near me' THEN 13.50
          ELSE 0.00
        END,
        CASE 
          WHEN keyword_rec.keyword = 'drain cleaning' THEN 0.75
          WHEN keyword_rec.keyword = 'drain cleaning near me' THEN 0.85
          WHEN keyword_rec.keyword = 'emergency drain cleaning' THEN 0.90
          WHEN keyword_rec.keyword = 'roto rooter' THEN 0.65
          WHEN keyword_rec.keyword = 'roto rooter near me' THEN 0.70
          ELSE 0.00
        END
      );
    END IF;
  END LOOP;
END $$;

-- Insert negative keywords for the drain cleaning campaign if they don't exist
DO $$
DECLARE
  campaign_id uuid;
BEGIN
  SELECT id INTO campaign_id FROM campaign_manager_campaigns WHERE name = 'Drain Cleaning Campaign';
  
  -- Array of negative keywords to insert
  DECLARE
    negative_keywords text[] := ARRAY['draino', 'how to unclog drain', 'best drain cleaning treatments', 
                                     'best drain cleaners', 'floor drain cleaning', 'gutter drain cleaning', 
                                     'ac drain cleaning'];
    match_types text[] := ARRAY['exact', 'broad', 'phrase', 'phrase', 'broad', 'broad', 'broad'];
    i integer;
  BEGIN
    FOR i IN 1..array_length(negative_keywords, 1) LOOP
      IF NOT EXISTS (
        SELECT 1 FROM campaign_manager_negative_keywords 
        WHERE campaign_id = campaign_id AND keyword = negative_keywords[i]
      ) THEN
        INSERT INTO campaign_manager_negative_keywords (campaign_id, keyword, match_type)
        VALUES (campaign_id, negative_keywords[i], match_types[i]);
      END IF;
    END LOOP;
  END;
END $$;
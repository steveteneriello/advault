-- Add is_active column to campaign_manager_campaigns if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'campaign_manager_campaigns' 
    AND column_name = 'is_active'
  ) THEN
    ALTER TABLE campaign_manager_campaigns ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Create negative keywords table if it doesn't exist
CREATE TABLE IF NOT EXISTS campaign_manager_negative_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaign_manager_campaigns(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  match_type text DEFAULT 'broad' CHECK (match_type IN ('broad', 'phrase', 'exact')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on campaign_id for better performance
CREATE INDEX IF NOT EXISTS idx_campaign_manager_negative_keywords_campaign ON campaign_manager_negative_keywords(campaign_id);

-- Enable Row Level Security (RLS)
ALTER TABLE campaign_manager_negative_keywords ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
DO $$
BEGIN
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
    WHERE tablename = 'campaign_manager_negative_keywords' 
    AND policyname = 'Allow service role full access to campaign_manager_negative_keywords'
  ) THEN
    CREATE POLICY "Allow service role full access to campaign_manager_negative_keywords"
      ON campaign_manager_negative_keywords FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Add sample negative keywords for existing campaigns
DO $$
DECLARE
  campaign_rec RECORD;
  neg_keywords TEXT[] := ARRAY['free', 'diy', 'how to', 'tutorial', 'cheap', 'budget'];
  match_types TEXT[] := ARRAY['broad', 'phrase', 'exact'];
  i INTEGER;
  keyword TEXT;
  match_type TEXT;
BEGIN
  -- For each campaign
  FOR campaign_rec IN SELECT id FROM campaign_manager_campaigns LOOP
    -- Add 3-5 random negative keywords
    FOR i IN 1..3 + floor(random() * 3)::int LOOP
      -- Select random keyword and match type
      keyword := neg_keywords[1 + floor(random() * array_length(neg_keywords, 1))::int];
      match_type := match_types[1 + floor(random() * array_length(match_types, 1))::int];
      
      -- Insert if not exists
      IF NOT EXISTS (
        SELECT 1 FROM campaign_manager_negative_keywords 
        WHERE campaign_id = campaign_rec.id AND keyword = keyword
      ) THEN
        INSERT INTO campaign_manager_negative_keywords (campaign_id, keyword, match_type)
        VALUES (campaign_rec.id, keyword, match_type);
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Add function to count keywords and negative keywords for a campaign
CREATE OR REPLACE FUNCTION get_campaign_keyword_counts(campaign_id uuid)
RETURNS TABLE (keyword_count bigint, negative_keyword_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM campaign_manager_keywords WHERE campaign_id = $1) AS keyword_count,
    (SELECT COUNT(*) FROM campaign_manager_negative_keywords WHERE campaign_id = $1) AS negative_keyword_count;
END;
$$ LANGUAGE plpgsql;
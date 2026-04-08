-- Adiciona campo slug na tabela companies
ALTER TABLE companies ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Índice para busca por slug
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);

-- Master database: only knows WHICH database belongs to which company,
-- and which company each username belongs to. No business data lives here.

CREATE TABLE IF NOT EXISTS companies (
    id          SERIAL PRIMARY KEY,
    code        VARCHAR(50)  NOT NULL UNIQUE,
    db_name     VARCHAR(100) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Global username -> company lookup used by the shared login page.
-- Usernames are unique across all companies.
CREATE TABLE IF NOT EXISTS user_directory (
    username    VARCHAR(50) PRIMARY KEY,
    company_id  INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_directory_company ON user_directory(company_id);

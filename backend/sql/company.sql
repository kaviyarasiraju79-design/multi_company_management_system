-- Schema applied to EACH company database (mcms_company_1 ... mcms_company_5).

CREATE TABLE IF NOT EXISTS company (
    id          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- exactly one row per database
    name        VARCHAR(150) NOT NULL,
    industry    VARCHAR(100),
    email       VARCHAR(150),
    phone       VARCHAR(30),
    address     TEXT,
    website     VARCHAR(200),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id             SERIAL PRIMARY KEY,
    username       VARCHAR(50)  NOT NULL UNIQUE,
    password_hash  VARCHAR(100) NOT NULL,
    full_name      VARCHAR(150) NOT NULL,
    email          VARCHAR(150),
    role           VARCHAR(20)  NOT NULL DEFAULT 'Employee' CHECK (role IN ('Admin', 'Employee')),
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE EXTENSION IF NOT EXISTS pgcrypto;


CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), 

 name varchar(100) NOT NULL, 

 email varchar(255) UNIQUE NOT NULL,

 password_hash text NOT NULL, 

 token_version integer NOT NULL DEFAULT 0,
  
 created_at timestamptz NOT NULL DEFAULT now(), 
 
 updated_at timestamptz NOT NULL DEFAULT now()
);
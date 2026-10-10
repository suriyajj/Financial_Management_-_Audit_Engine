CREATE TABLE revoked_refresh_tokens (


 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), 

 user_id uuid NOT NULL 
 REFERENCES users(id) 
 ON DELETE CASCADE,



 token_hash char(64) 
 UNIQUE NOT NULL, 
 
 expires_at timestamptz NOT NULL, 
 
 revoked_at timestamptz NOT NULL DEFAULT now(), 
 
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_revoked_refresh_expires ON revoked_refresh_tokens(expires_at);
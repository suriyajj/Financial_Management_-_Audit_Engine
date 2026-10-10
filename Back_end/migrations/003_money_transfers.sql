CREATE TABLE money_transfers (

 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), 

 from_account_id uuid NOT NULL 
 REFERENCES bank_accounts(id) ON DELETE RESTRICT,

to_account_id uuid NOT NULL 
REFERENCES bank_accounts(id) 
ON DELETE RESTRICT, 

amount numeric(19,2) NOT NULL 
CHECK(amount > 0), 

currency char(3) NOT NULL,

status varchar(20) NOT NULL 
CHECK(status IN ('COMPLETED','FAILED')), 
 
idempotency_key varchar(100) NOT NULL, 
 
created_at timestamptz NOT NULL DEFAULT now(),
CONSTRAINT different_accounts 
CHECK(from_account_id <> to_account_id), 

UNIQUE(from_account_id,idempotency_key)


);


CREATE INDEX idx_transfers_from ON
money_transfers(from_account_id,created_at DESC);


CREATE INDEX idx_transfers_to ON 
money_transfers(to_account_id,created_at DESC);
CREATE TABLE bank_accounts (


id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

user_id uuid NOT NULL REFERENCES 
users(id) ON DELETE RESTRICT,

account_number varchar(30) UNIQUE NOT NULL,

balance numeric(19,2) NOT NULL DEFAULT 0 CHECK(balance >= 0), 
  
  
currency char(3) NOT NULL DEFAULT 'INR',

created_at timestamptz NOT NULL DEFAULT now()

);


CREATE INDEX idx_bank_accounts_user_id ON bank_accounts(user_id);
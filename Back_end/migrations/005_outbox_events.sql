CREATE TABLE outbox_events (
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
event_type varchar(80) NOT NULL,
aggregate_id uuid NOT NULL,
payload jsonb NOT NULL, 
status varchar(20) 
NOT NULL DEFAULT 'PENDING' 
CHECK(status IN ('PENDING','PROCESSING','PROCESSED')),
attempts integer NOT NULL DEFAULT 0,
last_error text,
created_at timestamptz 
NOT NULL DEFAULT now(), 
processed_at timestamptz
);
CREATE INDEX idx_outbox_status_created ON outbox_events(status,created_at);
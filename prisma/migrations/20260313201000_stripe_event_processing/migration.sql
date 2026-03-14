DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'StripeEventStatus' AND e.enumlabel = 'processing'
  ) THEN
    ALTER TYPE "StripeEventStatus" ADD VALUE 'processing';
  END IF;
END $$;


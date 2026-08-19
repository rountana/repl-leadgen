ALTER TABLE "fb_campaigns"
  ADD COLUMN IF NOT EXISTS "call_to_action" text NOT NULL DEFAULT 'LEARN_MORE';
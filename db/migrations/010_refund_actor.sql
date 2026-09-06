-- Who issued a refund.
--
-- Refunds happen two ways: the automatic sweep (services/paymentService.js
-- reconcileOrphanedPayments) and an operator clicking Refund in the admin
-- panel. Until now both landed identically in the payments row, so "why did
-- this money go back, and who decided that" had no answer in the data.
--
-- 'system' for the sweep, an operator's display name for a manual one.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_by TEXT;

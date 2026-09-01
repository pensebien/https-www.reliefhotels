-- Backfill payment_method/payment_channel for existing online-checkout payments.
--
-- Before this fix, only front-desk deposits (cash / Moniepoint) ever set
-- payment_method/payment_channel — Paystack online-checkout payments left
-- both null, so staff dashboards showed no payment-method label for them.
-- src/lib/paystack.ts now tags new payments 'paystack'/'paystack' at
-- creation time; this migration backfills existing rows the same way.
--
-- Scope is exactly the rows with BOTH fields still null — front-desk rows
-- already have payment_method set (e.g. 'cash') and are untouched.
update payments
set payment_method = 'paystack',
    payment_channel = 'paystack'
where payment_method is null
  and payment_channel is null;

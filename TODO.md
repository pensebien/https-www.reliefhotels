# TODO

- [ ] Remove the "View demo dashboard" button from the guest payment success page
      (`src/components/payment-callback.tsx` → `<Link href="/demo">{t("viewDashboard")}</Link>`;
      also drop the unused `payment.viewDashboard` key from `messages/*.json`).
- [ ] Apply Supabase migrations 005–015 (never run on the project in `.env.local`). Missing:
      `folio_charges` (minibar/snacks/laundry/other charges fail), `room_blocks`,
      `room_inventory`, `staff_accounts`, `tax_settings`, plus columns
      `reservations.staff_notes` and `payments.client_mutation_id`. Run the files in order in the
      Supabase SQL Editor, then `notify pgrst, 'reload schema';`.
- [ ] Before setting `STAFF_AUTH_ENABLED=true`: seed `staff_accounts` (the table starts empty, so
      nobody could log in).
- [ ] Production is on Paystack **test** keys (`/api/health` → `paystackMode: "test"`).

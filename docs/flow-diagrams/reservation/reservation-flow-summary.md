# Guest Reservation & Payment Email Flow

## Flow Breakdown & Execution Summary

### 1. Reservation Initiation
* **Sender:** `reservations@mail.reliefhotelsandsuites.com`
* **Reply-To:** `reservations@reliefhotelsandsuites.com`
* **Execution:** Keeps outgoing app messages separated on the sending subdomain while routing any direct guest replies straight into your main Google Workspace inbox.

---

### 2. Paystack Webhook & Payment Receipt
* **Sender:** `finance@mail.reliefhotelsandsuites.com`
* **Reply-To:** `finance@reliefhotelsandsuites.com`
* **BCC:** `finance@reliefhotelsandsuites.com`
* **Execution:** Automatically archives a copy of every payment receipt in your Google Group inbox for accounting audit trails without requiring manual intervention.

---

### 3. Inbound Reply Loop
* **Execution:** Any direct reply sent by a guest routes seamlessly to your root domain's Google Group, allowing management to view and respond using "Send As" directly from Gmail.
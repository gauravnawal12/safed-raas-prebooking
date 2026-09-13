# Safed Raas 2026 — Pre-booking page

A single-page pre-booking site: booking form → payment QR → screenshot upload → writes straight to a Google Sheet. Built to host on GitHub Pages, same pattern as the Helix apps (`config.json` as the single source of truth for URLs and event details, so you never need to touch code again after setup).

## 1. Fill in the real event details

Open `config.json` and replace the placeholders:

- `event.venue_name`, `event.venue_address`, `event.time_display`
- `pricing.amount_display` (e.g. `"₹500"`) and `pricing.amount_note` (e.g. `"per person"`, or `"per couple"` if you switch to couple pricing later)
- `payment.upi_id`
- Leave `payment.qr_image` as `"assets/payment-qr.png"` and just replace that file with your real UPI QR image (same filename, so nothing else needs to change)
- `referral_options` if you want different "how did you hear about us" choices

`APPS_SCRIPT_URL` stays as `PASTE_YOUR_DEPLOYED_WEB_APP_URL_HERE` until step 2 is done — the form will show a clear inline message instead of failing silently if someone tries to submit before it's set.

## 2. Set up the Google Sheet + Apps Script backend

1. Create a new Google Sheet. Rename the first tab to `Bookings`.
2. In row 1, add these exact headers across columns A–H:
   `Timestamp | Name | WhatsApp Number | Guests | Referral | Amount Expected | Screenshot Link | Status`
3. **Extensions → Apps Script**. Delete the starter code and paste in the full contents of `apps-script/Code.gs`.
4. **Deploy → New deployment → type: Web app.**
   - Execute as: **Me**
   - Who has access: **Anyone**
5. Copy the deployed web app URL and paste it into `config.json` as `APPS_SCRIPT_URL`.
6. Any time you edit `Code.gs` later, you must **Deploy → New deployment** again — saving alone doesn't push changes to the live URL.

Payment screenshots are saved to a Drive folder called **"Safed Raas 2026 - Payment Screenshots"** (auto-created on first submission), with a view-link written into the sheet row next to each booking.

## 3. Host on GitHub Pages

1. Push this whole folder to a GitHub repo.
2. **Settings → Pages → Deploy from branch → `main` / root.**
3. Your live URL will be `https://<username>.github.io/<repo-name>/`.

## 4. Before sharing the link

- [ ] Real venue, time, and price are in `config.json`
- [ ] `assets/payment-qr.png` replaced with your actual UPI QR
- [ ] `APPS_SCRIPT_URL` set and re-deployed
- [ ] Submit a test booking yourself with a real screenshot and confirm the row + Drive link appear correctly
- [ ] Open the page on an actual phone, not just desktop — check the video hero loads quickly on mobile data

## Notes

- The payment screenshot is compressed in-browser (max 1280px, JPEG ~75%) before upload, so it stays fast even on slower connections and won't hit Apps Script's payload limits.
- The form uses a single POST per submission with a script lock on the backend — no risk of duplicate rows from double-taps or retries.
- Everything text-facing (venue, price, dress code, cause line, referral options) lives in `config.json`, so you can update the page without touching HTML/JS.

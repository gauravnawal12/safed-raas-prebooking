/**
 * Safed Raas 2.0 — Pre-booking backend
 *
 * SETUP:
 * 1. Create a new Google Sheet. Name the first tab "Bookings".
 *    In row 1, add these headers (exact text, columns A-I):
 *    Timestamp | Name | WhatsApp Number | Guests | Referral | Amount Due | WhatsApp Link | Screenshot Link | Status
 * 2. Extensions > Apps Script. Delete any starter code and paste this whole file in.
 * 3. Update FOLDER_NAME below if you want a different Drive folder name.
 * 4. Deploy > New deployment > type: Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the deployed Web App URL into config.json as APPS_SCRIPT_URL.
 *
 * UPDATING LATER:
 * If you edit this file after the URL is already in config.json, do NOT create
 * another "New deployment" — that gives you a different URL and breaks the live
 * page. Instead: Deploy > Manage deployments > pencil (edit) icon on the
 * existing deployment > Version: "New version" > Deploy. This keeps the same
 * URL and pushes your code changes live.
 */

const SHEET_NAME = 'Bookings';
const FOLDER_NAME = 'Safed Raas 2.0 - Payment Screenshots';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const body = JSON.parse(e.postData.contents);

    const name = (body.name || '').toString().trim();
    const phone = (body.phone || '').toString().trim();
    const guests = (body.guests || '').toString().trim();
    const referral = (body.referral || '').toString().trim();
    const amountDue = (body.amountDue || '').toString().trim();

    if (!name || !phone) {
      return jsonResponse({ status: 'error', message: 'Name and WhatsApp number are required.' });
    }

    let screenshotLink = '';
    if (body.screenshotBase64 && body.screenshotMimeType) {
      screenshotLink = saveScreenshot(body.screenshotBase64, body.screenshotMimeType, name);
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    sheet.getRange(1, 1, 1, 1).setNumberFormat('@'); // keep timestamp column as plain text

    // Plain-text timestamp, avoids date-format drift across locales (DD/MM vs MM/DD)
    const now = new Date();
    const timestampText = Utilities.formatDate(now, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');

    sheet.appendRow([
      timestampText,   // A Timestamp
      name,            // B Name
      phone,           // C WhatsApp Number
      guests,          // D Guests
      referral,        // E Referral
      amountDue,       // F Amount Due
      '',              // G WhatsApp Link — filled in as a formula just below
      screenshotLink,  // H Screenshot Link
      'Pending confirmation' // I Status
    ]);

    const lastRow = sheet.getLastRow();
    const waLink = buildWhatsAppLink(phone);
    sheet.getRange(lastRow, 7).setFormula('=HYPERLINK("' + waLink + '","Message on WhatsApp")');

    return jsonResponse({ status: 'success' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Builds a wa.me link from whatever phone format the guest typed in.
 * Assumes Indian numbers by default (10-digit local numbers get a 91 prefix).
 */
function buildWhatsAppLink(phone) {
  let digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    digits = '91' + digits;
  } else if (digits.length === 11 && digits.charAt(0) === '0') {
    digits = '91' + digits.substring(1);
  }
  // else: assume it already includes a country code, use as-is

  return 'https://wa.me/' + digits;
}

function saveScreenshot(base64Data, mimeType, name) {
  const folder = getOrCreateFolder(FOLDER_NAME);
  const extension = mimeType.split('/')[1] || 'jpg';
  const safeName = name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
  const fileName = safeName + '_' + new Date().getTime() + '.' + extension;

  const decoded = Utilities.base64Decode(base64Data);
  const blob = Utilities.newBlob(decoded, mimeType, fileName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return file.getUrl();
}

function getOrCreateFolder(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

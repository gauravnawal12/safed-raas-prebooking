/**
 * Safed Raas 2026 — Pre-booking backend
 *
 * SETUP:
 * 1. Create a new Google Sheet. Name the first tab "Bookings".
 *    In row 1, add these headers (exact text, columns A-H):
 *    Timestamp | Name | WhatsApp Number | Guests | Referral | Amount Expected | Screenshot Link | Status
 * 2. Extensions > Apps Script. Delete any starter code and paste this whole file in.
 * 3. Update FOLDER_NAME below if you want a different Drive folder name.
 * 4. Deploy > New deployment > type: Web app.
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the deployed Web App URL into config.json as APPS_SCRIPT_URL.
 * 6. Re-deploy (New deployment, not just save) any time you edit this file —
 *    editing alone does not update a live web app URL's behavior.
 */

const SHEET_NAME = 'Bookings';
const FOLDER_NAME = 'Safed Raas 2026 - Payment Screenshots';

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const body = JSON.parse(e.postData.contents);

    const name = (body.name || '').toString().trim();
    const phone = (body.phone || '').toString().trim();
    const guests = (body.guests || '').toString().trim();
    const referral = (body.referral || '').toString().trim();
    const amountExpected = (body.amountExpected || '').toString().trim();

    if (!name || !phone) {
      return jsonResponse({ status: 'error', message: 'Name and WhatsApp number are required.' });
    }

    let screenshotLink = '';
    if (body.screenshotBase64 && body.screenshotMimeType) {
      screenshotLink = saveScreenshot(body.screenshotBase64, body.screenshotMimeType, name);
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const timestampCol = sheet.getRange(1, 1, 1, 1); // ensure text formatting for timestamp column
    timestampCol.setNumberFormat('@');

    // Plain-text timestamp, avoids date-format drift across locales (DD/MM vs MM/DD)
    const now = new Date();
    const timestampText = Utilities.formatDate(now, 'Asia/Kolkata', 'yyyy-MM-dd HH:mm:ss');

    sheet.appendRow([
      timestampText,
      name,
      phone,
      guests,
      referral,
      amountExpected,
      screenshotLink,
      'Pending confirmation'
    ]);

    return jsonResponse({ status: 'success' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.message });
  } finally {
    lock.releaseLock();
  }
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

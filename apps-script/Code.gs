/**
 * Google Apps Script - Shivsagar Interior Tracker Backend
 *
 * SETUP:
 * 1. Create a new Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete default code, paste this entire file
 * 4. Click Deploy > New deployment
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Copy the deployment URL
 * 6. Paste it into config.local.js in the tracker
 *
 * SECURITY:
 * - The Apps Script deployment URL is long and unguessable (80+ chars)
 * - That URL is the only secret — no passphrase needed
 *
 * SHEET STRUCTURE (auto-created on first use):
 * - Cell A1: JSON blob with all tracker data (items, state)
 * - Cell B1: Human-readable timestamp
 * - Cells C1, D1: Summary stats
 * - Row 3+: Human-readable item table
 */

const SHEET_NAME = "data";

// ============================================================
// WEB APP HANDLERS
// ============================================================

function doGet(e) {
  const action = e?.parameter?.action || "read";
  if (action === "read") {
    return sendJson(readData());
  }
  return sendJson({ error: "Unknown action" }, 400);
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === "write") {
      writeData(body.data);
      return sendJson({ success: true, updatedAt: new Date().toISOString() });
    }
    return sendJson({ error: "Unknown action" }, 400);
  } catch (err) {
    return sendJson({ error: err.message }, 500);
  }
}

// ============================================================
// DATA OPERATIONS
// ============================================================

function readData() {
  const sheet = getOrCreateSheet();
  const raw = sheet.getRange("A1").getValue();
  if (!raw) {
    return { items: [], updatedAt: null };
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { error: "Corrupted data in sheet" };
  }
}

function writeData(data) {
  const sheet = getOrCreateSheet();
  data.updatedAt = new Date().toISOString();
  sheet.getRange("A1").setValue(JSON.stringify(data));
  sheet.getRange("B1").setValue("Last updated: " + data.updatedAt);
  writeSummary(sheet, data);
}

/**
 * Write a human-readable summary table starting at row 3.
 * @param {Sheet} sheet
 * @param {object} data
 */
function writeSummary(sheet, data) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 2) {
    sheet.getRange(3, 1, lastRow - 2, 6).clearContent();
  }

  // Header row
  const headers = ["Room", "Item", "Done", "Category", "Budget", "Note"];
  headers.forEach((h, i) => sheet.getRange(3, i + 1).setValue(h));
  sheet.getRange("A3:F3").setFontWeight("bold");

  const items = data.items || [];
  let row = 4;
  let totalBudget = 0;
  let doneCount = 0;

  for (const item of items) {
    sheet.getRange(row, 1).setValue(item.room || "");
    sheet.getRange(row, 2).setValue(item.name || "");
    sheet.getRange(row, 3).setValue(item.checked ? "YES" : "");
    sheet.getRange(row, 4).setValue(item.category || "");
    sheet.getRange(row, 5).setValue(item.budget || "");
    sheet.getRange(row, 6).setValue(item.note || "");
    if (item.budget) totalBudget += item.budget;
    if (item.checked) doneCount++;
    row++;
  }

  sheet.getRange("C1").setValue("Done: " + doneCount + "/" + items.length);
  sheet.getRange("D1").setValue("Budget: Rs. " + totalBudget.toLocaleString("en-IN"));
}

// ============================================================
// HELPERS
// ============================================================

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange("A1").setValue("{}");
    sheet.getRange("B1").setValue("Awaiting first sync");
  }
  return sheet;
}

function sendJson(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// MANUAL TEST (run from Apps Script editor)
// ============================================================
function testRead() {
  Logger.log(JSON.stringify(readData(), null, 2));
}

function testWrite() {
  writeData({
    items: [
      { id: "lr1", name: "Sofa", room: "living_room", category: "furniture", priority: "high", checked: true, budget: 25000, note: "Test" },
    ],
  });
  Logger.log("Write successful");
}

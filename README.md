# Shivsagar 2BHK Interior Tracker

A mobile-first interior design checklist tracker with Google Sheets sync.

**Stack:** Vanilla HTML + JS + Tailwind CDN + Google Apps Script

**Features:**
- Room-by-room checklist with progress tracking
- Per-item notes and budget tracking
- Priority view (Must Have / Should Have / Nice to Have)
- Summary dashboard with room progress, budget, and category breakdown
- Google Sheets sync for multi-device access (you + Foram)
- Offline-capable (localStorage fallback)
- No build step, no dependencies

---

## Quick Start (5 minutes)

### Step 1: Deploy to GitHub Pages

1. Create a new repo on GitHub (e.g., `shivsagar-tracker`)
2. Push all files to the `main` branch:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/shivsagar-tracker.git
git push -u origin main
```

3. Go to **Settings > Pages** in your repo
4. Set Source to **Deploy from a branch**, select `main`, root `/`
5. Save. Your site will be live at `https://YOUR_USERNAME.github.io/shivsagar-tracker/`

The tracker works immediately with localStorage (no Google Sheets needed).

---

### Step 2: Set Up Google Sheets Sync (optional but recommended)

This lets you and Foram share the same data across devices.

#### 2a. Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
2. Name it "Shivsagar Interior Tracker" (or anything you like)
3. Share it with Foram (optional, for viewing data directly in Sheets)

#### 2b. Add the Apps Script

1. In the Sheet, go to **Extensions > Apps Script**
2. Delete any default code in the editor
3. Copy the entire contents of `apps-script/Code.gs` and paste it
4. **Important:** Change the `PASSPHRASE` on line 20 to something only you and Foram know
5. Click **Save** (Ctrl+S)

#### 2c. Deploy as Web App

1. Click **Deploy > New deployment**
2. Click the gear icon next to "Select type" and choose **Web app**
3. Settings:
   - Description: "Shivsagar Tracker API"
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**
5. Authorise when prompted (review permissions, allow)
6. **Copy the Web App URL** (looks like `https://script.google.com/macros/s/AKfyc.../exec`)

#### 2d. Configure the Tracker

1. Open your tracker site
2. Tap the **gear icon** (top right) to go to Settings
3. Paste the Web App URL
4. Enter the same passphrase you set in Code.gs
5. Enter your name (Darshan / Foram)
6. Tap **Save Settings**
7. Tap **Sync Now** to test

**Do the same on Foram's phone** with her name.

---

## How Sync Works

| Action | What happens |
|--------|-------------|
| Check/uncheck item | Saved to localStorage instantly + synced to Sheet |
| Open the tracker | Loads from localStorage (fast) + fetches latest from Sheet in background |
| Sync Now (Settings) | Pulls latest data from Sheet, merges with local |
| Offline use | Everything works locally, syncs when back online |

**Conflict handling:** Last write wins. Since it's just 2 users, this is fine.

---

## Reusing for Other Projects

The tracker is designed to be reusable. To adapt it:

1. **Edit `js/schema.js`** - Change `PROJECT`, `PHASES`, `ROOMS`, and `ALERTS`
2. **Create a new Google Sheet** and deploy a fresh Apps Script
3. **Update the Web App URL** in Settings

The sync layer (`js/sheet-sync.js`) and app logic (`js/app.js`) don't need changes.

---

## File Structure

```
shivsagar-tracker/
+-- index.html              # Main page (loads Tailwind CDN + JS)
+-- js/
|   +-- schema.js           # Room/item definitions (swap for other projects)
|   +-- sheet-sync.js       # Google Sheets read/write module (reusable)
|   +-- app.js              # Main app: state, rendering, events
+-- apps-script/
|   +-- Code.gs             # Google Apps Script (paste into your Sheet)
+-- README.md               # This file
```

---

## Privacy & Security

- **No tokens in the browser.** The Apps Script URL is the only "secret" and it's an 80+ character random string.
- **Passphrase on writes** prevents anyone with the URL from modifying data.
- **Data stays in your Google Sheet.** No third-party services, no databases.
- **Make the GitHub repo private** if you want to hide the Apps Script URL from the source code.

---

## Troubleshooting

**Sync not working?**
- Check that the Apps Script URL is correct (must end with `/exec`)
- Make sure you deployed as "Anyone" access
- Check the passphrase matches between Code.gs and Settings
- Open browser console (F12) for error messages

**Apps Script errors?**
- In the Apps Script editor, go to Executions (left sidebar) to see logs
- Run `testRead()` and `testWrite()` manually to debug

**Data out of sync between devices?**
- Open Settings > Tap "Sync Now" on both devices
- The last write wins, so the most recent save takes priority

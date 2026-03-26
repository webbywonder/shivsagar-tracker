/**
 * SheetSync - Google Sheets read/write via Apps Script.
 * No passphrase — the long unguessable Apps Script URL is the secret.
 *
 * Usage:
 *   const sync = new SheetSync(scriptUrl);
 *   await sync.load();
 *   await sync.save(data);
 */

class SheetSync {
  constructor(scriptUrl) {
    this.scriptUrl = scriptUrl;
    this.CACHE_KEY = "shivsagar_cache";
    this.CACHE_TS_KEY = "shivsagar_cache_ts";
  }

  /**
   * Load data from Google Sheet, fallback to localStorage cache.
   * @returns {{ data: object|null, source: string }}
   */
  async load() {
    try {
      const url = `${this.scriptUrl}?action=read`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Sheet fetch failed");
      const data = await res.json();
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(this.CACHE_TS_KEY, Date.now().toString());
      return { data, source: "sheet" };
    } catch (err) {
      console.warn("Sheet read failed, using cache:", err.message);
      return this._loadFromCache();
    }
  }

  /**
   * Save data to Google Sheet + localStorage cache.
   * @param {object} data
   * @returns {{ success: boolean }}
   */
  async save(data) {
    localStorage.setItem(this.CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(this.CACHE_TS_KEY, Date.now().toString());
    try {
      const res = await fetch(this.scriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "write", data }),
      });
      if (!res.ok) throw new Error("Sheet write failed");
      const result = await res.json();
      return { success: true, result };
    } catch (err) {
      console.warn("Sheet write failed, saved locally:", err.message);
      return { success: false, error: err.message, savedLocally: true };
    }
  }

  /** @returns {{ data: object|null, source: string }} */
  _loadFromCache() {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (cached) {
        return { data: JSON.parse(cached), source: "cache" };
      }
    } catch { /* empty */ }
    return { data: null, source: "empty" };
  }

  /** @returns {Date|null} */
  getLastSyncTime() {
    const ts = localStorage.getItem(this.CACHE_TS_KEY);
    return ts ? new Date(parseInt(ts)) : null;
  }

  /** @returns {boolean} */
  isConfigured() {
    return !!(this.scriptUrl && this.scriptUrl.startsWith("https://script.google.com"));
  }
}

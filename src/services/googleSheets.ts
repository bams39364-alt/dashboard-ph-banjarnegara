import { SheetData, SheetFile, SheetTab } from "../types";

declare global {
  interface Window {
    google?: any;
  }
}

const STORAGE_KEY_TOKEN = "google_sheets_oauth_token";
const STORAGE_KEY_EXPIRY = "google_sheets_token_expiry";

export function extractSpreadsheetId(urlOrId: string): { id: string; gid?: string } {
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/);
  if (match && match[1]) {
    return { id: match[1], gid: gidMatch ? gidMatch[1] : undefined };
  }
  return { id: trimmed, gid: gidMatch ? gidMatch[1] : undefined };
}

// Simple CSV parser for fallback
function parseCSV(csvText: string): any[][] {
  const rows: any[][] = [];
  let currentRow: any[] = [];
  let currentVal = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some((c) => c !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }

  if (currentVal !== "" || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((c) => c !== "")) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export class GoogleSheetsService {
  private token: string | null = null;
  private tokenClient: any = null;
  private clientId: string | null = null;

  constructor() {
    this.token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const expiry = localStorage.getItem(STORAGE_KEY_EXPIRY);
    if (expiry && Date.now() > Number(expiry)) {
      this.clearToken();
    }
  }

  public getAccessToken(): string | null {
    return this.token;
  }

  public isAuthenticated(): boolean {
    return Boolean(this.token);
  }

  public clearToken(): void {
    this.token = null;
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_EXPIRY);
  }

  public setToken(token: string, expiresInSeconds: number = 3600): void {
    this.token = token;
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_EXPIRY, (Date.now() + expiresInSeconds * 1000).toString());
  }

  /**
   * Request an OAuth access token using Google Identity Services (GIS)
   */
  public async requestOAuthToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
        // Retry shortly if script is still downloading
        setTimeout(() => {
          if (!window.google?.accounts?.oauth2) {
            reject(new Error("Google Identity Services script is not loaded yet. Please refresh the page."));
            return;
          }
          this.executeTokenFlow(resolve, reject);
        }, 1000);
        return;
      }
      this.executeTokenFlow(resolve, reject);
    });
  }

  private executeTokenFlow(resolve: (token: string) => void, reject: (err: Error) => void) {
    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: this.clientId || "1087035576737-ai-studio-sheets.apps.googleusercontent.com",
        scope: "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly",
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (response.access_token) {
            this.setToken(response.access_token, response.expires_in || 3600);
            resolve(response.access_token);
          } else {
            reject(new Error("No access token returned by Google OAuth."));
          }
        },
        error_callback: (error: any) => {
          reject(new Error(error.message || "OAuth Flow encountered an error"));
        },
      });

      client.requestAccessToken({ prompt: "consent" });
    } catch (err: any) {
      reject(err);
    }
  }

  /**
   * List Spreadsheet files from Google Drive
   */
  public async listSpreadsheets(): Promise<SheetFile[]> {
    if (!this.token) {
      throw new Error("Not authenticated with Google");
    }

    const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,webViewLink)&pageSize=30&orderBy=modifiedTime desc`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        this.clearToken();
        throw new Error("Session expired. Please reconnect Google Sheets.");
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to list Google Sheets: ${res.statusText}`);
    }

    const data = await res.json();
    return data.files || [];
  }

  /**
   * Fetch spreadsheet data using Google Sheets API (if authenticated) or GViz/CSV fallback
   */
  public async fetchSpreadsheet(
    spreadsheetIdOrUrl: string,
    sheetTitle?: string,
    gid?: string
  ): Promise<SheetData> {
    const { id: spreadsheetId, gid: urlGid } = extractSpreadsheetId(spreadsheetIdOrUrl);
    const activeGid = gid || urlGid;

    // Method 1: If user has active OAuth Token, use official Google Sheets API v4
    if (this.token) {
      try {
        const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties(sheetId,title,gridProperties)`;
        const metaRes = await fetch(metaUrl, {
          headers: { Authorization: `Bearer ${this.token}` },
        });

        if (metaRes.ok) {
          const metaData = await metaRes.json();
          const spreadsheetTitle = metaData.properties?.title || "Spreadsheet Aktif";
          const sheets: SheetTab[] = (metaData.sheets || []).map((s: any) => ({
            sheetId: s.properties.sheetId,
            title: s.properties.title,
            rowCount: s.properties.gridProperties?.rowCount,
            columnCount: s.properties.gridProperties?.columnCount,
          }));

          let activeTitle = sheetTitle;
          if (sheetTitle) {
            // Case-insensitive match or contains
            const matched = sheets.find(
              (s) =>
                s.title.trim().toLowerCase() === sheetTitle.trim().toLowerCase() ||
                s.title.trim().toLowerCase().replace(/[\s_-]+/g, "") ===
                  sheetTitle.trim().toLowerCase().replace(/[\s_-]+/g, "")
            );
            if (matched) {
              activeTitle = matched.title;
            }
          }

          if (!activeTitle) {
            if (activeGid) {
              const matched = sheets.find((s) => String(s.sheetId) === String(activeGid));
              if (matched) activeTitle = matched.title;
            }
            if (!activeTitle) {
              activeTitle = sheets.length > 0 ? sheets[0].title : "Sheet1";
            }
          }

          const range = encodeURIComponent(`'${activeTitle}'!A1:ZZ5000`);
          const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueRenderOption=UNFORMATTED_VALUE`;

          const valuesRes = await fetch(valuesUrl, {
            headers: { Authorization: `Bearer ${this.token}` },
          });

          if (valuesRes.ok) {
            const valuesData = await valuesRes.json();
            const rawValues: any[][] = valuesData.values || [];

            if (rawValues.length === 0) {
              return {
                spreadsheetId,
                spreadsheetTitle,
                sheets,
                activeSheetTitle: activeTitle,
                headers: [],
                rows: [],
                rawValues: [],
              };
            }

            const headers = rawValues[0].map((h: any, idx: number) =>
              h !== undefined && h !== null && String(h).trim() !== ""
                ? String(h).trim()
                : `Column_${idx + 1}`
            );
            const rows = rawValues.slice(1).map((row) => {
              const record: Record<string, any> = {};
              headers.forEach((header, idx) => {
                record[header] = row[idx] !== undefined ? row[idx] : "";
              });
              return record;
            });

            return {
              spreadsheetId,
              spreadsheetTitle,
              sheets,
              activeSheetTitle: activeTitle,
              headers,
              rows,
              rawValues,
            };
          }
        }
      } catch (err) {
        console.warn("Sheets API v4 failed, attempting GViz fallback...", err);
      }
    }

    // Method 2: Public / GViz API query
    try {
      let gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
      if (activeGid) {
        gvizUrl += `&gid=${activeGid}`;
      } else if (sheetTitle) {
        gvizUrl += `&sheet=${encodeURIComponent(sheetTitle)}`;
      }

      const gvizRes = await fetch(gvizUrl);
      if (gvizRes.ok) {
        const text = await gvizRes.text();
        const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\(([\s\S\w\W]*)\);/);
        if (jsonMatch && jsonMatch[1]) {
          const gvizData = JSON.parse(jsonMatch[1]);
          if (gvizData.status === "ok" && gvizData.table) {
            const table = gvizData.table;
            let finalHeaders = (table.cols || []).map(
              (c: any, i: number) => (c && c.label ? c.label.trim() : `Column_${i + 1}`)
            );

            let rawRows = (table.rows || []).map((r: any) => {
              return (table.cols || []).map((_: any, idx: number) => {
                const cell = r.c ? r.c[idx] : null;
                return cell ? (cell.v !== undefined ? cell.v : cell.f || "") : "";
              });
            });

            // If headers are just Column_1, Column_2 and first row looks like text headers
            if (finalHeaders.every((h: string) => /^Column_\d+$/i.test(h)) && rawRows.length > 0) {
              const firstRow = rawRows[0];
              if (firstRow.some((val: any) => typeof val === "string" && val.trim() !== "")) {
                finalHeaders = firstRow.map((v: any, i: number) =>
                  v !== undefined && v !== null && String(v).trim() !== ""
                    ? String(v).trim()
                    : `Column_${i + 1}`
                );
                rawRows = rawRows.slice(1);
              }
            }

            const rows = rawRows.map((r: any[]) => {
              const record: Record<string, any> = {};
              finalHeaders.forEach((header: string, idx: number) => {
                record[header] = r[idx] !== undefined ? r[idx] : "";
              });
              return record;
            });

            const rawValues = [
              finalHeaders,
              ...rows.map((r: any) => finalHeaders.map((h: string) => r[h])),
            ];

            return {
              spreadsheetId,
              spreadsheetTitle: `Google Sheet (${spreadsheetId.slice(0, 8)}...)`,
              sheets: [{ sheetId: Number(activeGid) || 0, title: sheetTitle || "Sheet1" }],
              activeSheetTitle: sheetTitle || "Sheet1",
              headers: finalHeaders,
              rows,
              rawValues,
            };
          }
        }
      }
    } catch (e) {
      console.warn("GViz query failed, trying CSV export...", e);
    }

    // Method 3: CSV export fallback
    try {
      let csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
      if (activeGid) csvUrl += `&gid=${activeGid}`;

      const csvRes = await fetch(csvUrl);
      if (csvRes.ok) {
        const csvText = await csvRes.text();
        const rawValues = parseCSV(csvText);

        if (rawValues.length > 0) {
          const headers = rawValues[0].map((h, i) => (h ? String(h).trim() : `Column_${i + 1}`));
          const rows = rawValues.slice(1).map((row) => {
            const record: Record<string, any> = {};
            headers.forEach((header, idx) => {
              const val = row[idx] !== undefined ? row[idx] : "";
              // try parse numeric
              if (!isNaN(Number(val)) && val !== "") {
                record[header] = Number(val);
              } else {
                record[header] = val;
              }
            });
            return record;
          });

          return {
            spreadsheetId,
            spreadsheetTitle: `Google Sheet (${spreadsheetId.slice(0, 8)}...)`,
            sheets: [{ sheetId: Number(activeGid) || 0, title: sheetTitle || "Sheet1" }],
            activeSheetTitle: sheetTitle || "Sheet1",
            headers,
            rows,
            rawValues,
          };
        }
      }
    } catch (e) {
      console.warn("CSV export failed", e);
    }

    throw new Error(
      "Tidak dapat membaca Google Spreadsheet ini secara publik. Silakan klik tombol 'Hubungkan Akun Google' untuk memberikan izin akses OAuth ke file Anda."
    );
  }

  /**
   * Append a new row into the active sheet
   */
  public async appendRow(spreadsheetId: string, sheetTitle: string, newRowValues: any[]): Promise<any> {
    if (!this.token) {
      throw new Error("Izin OAuth diperlukan untuk mengubah Google Spreadsheet. Silakan hubungkan akun Google Anda.");
    }

    const range = encodeURIComponent(`'${sheetTitle}'!A:A`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [newRowValues],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to insert record: ${res.statusText}`);
    }

    return await res.json();
  }

  /**
   * Update an existing row in the active sheet
   */
  public async updateRow(
    spreadsheetId: string,
    sheetTitle: string,
    rowIndex: number,
    updatedRowValues: any[]
  ): Promise<any> {
    if (!this.token) {
      throw new Error("Izin OAuth diperlukan untuk mengubah Google Spreadsheet. Silakan hubungkan akun Google Anda.");
    }

    const range = encodeURIComponent(`'${sheetTitle}'!A${rowIndex}:ZZ${rowIndex}`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [updatedRowValues],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to update record: ${res.statusText}`);
    }

    return await res.json();
  }

  /**
   * Delete a row by batchUpdate
   */
  public async deleteRow(spreadsheetId: string, sheetId: number, rowIndex: number): Promise<any> {
    if (!this.token) {
      throw new Error("Izin OAuth diperlukan untuk menghapus baris di Google Spreadsheet. Silakan hubungkan akun Google Anda.");
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: "ROWS",
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to delete record: ${res.statusText}`);
    }

    return await res.json();
  }

  /**
   * Create a new spreadsheet with initial headers
   */
  public async createSpreadsheet(title: string, headers: string[], initialRows: any[][] = []): Promise<string> {
    if (!this.token) {
      throw new Error("Izin OAuth diperlukan untuk membuat spreadsheet baru. Silakan hubungkan akun Google Anda.");
    }

    const createUrl = "https://sheets.googleapis.com/v4/spreadsheets";
    const res = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: { title },
        sheets: [
          {
            properties: { title: "Sheet1" },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: [
                  {
                    values: headers.map((h) => ({ userEnteredValue: { stringValue: h } })),
                  },
                  ...initialRows.map((r) => ({
                    values: r.map((val) => ({
                      userEnteredValue:
                        typeof val === "number" ? { numberValue: val } : { stringValue: String(val) },
                    })),
                  })),
                ],
              },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create new spreadsheet`);
    }

    const data = await res.json();
    return data.spreadsheetId;
  }
}

export const sheetsService = new GoogleSheetsService();

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Google Sheets Export Service for Finalized Bakery Bills
 * Uses Google Sheets API v4 to log, export, and append bill objects
 * into a structured sales ledger spreadsheet for external record keeping.
 */

import { Bill } from '../types';

export interface ExportOptions {
  spreadsheetTitle?: string;
  sheetName?: string;
  shopName?: string;
}

export interface ExportResult {
  success: boolean;
  billNo: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  exportedAt: string;
  error?: string;
}

export interface BatchExportResult {
  success: boolean;
  exportedCount: number;
  spreadsheetId: string;
  spreadsheetUrl: string;
  exportedAt: string;
  error?: string;
}

export interface SpreadsheetInfo {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

const DEFAULT_SPREADSHEET_TITLE = 'DELICIOUS CAKE CORNER — Sales & Invoices Register';
const DEFAULT_SHEET_NAME = 'Sales Register';
const LOCAL_STORAGE_KEY_SHEET_ID = 'dcc_sheets_spreadsheet_id';

/**
 * Ordered column headers for the sales register spreadsheet
 */
export const BILL_SHEET_HEADERS = [
  'Bill No',
  'Date',
  'Time',
  'Customer Name',
  'Mobile Number',
  'Order Type',
  'Items Summary',
  'Items Count',
  'Subtotal (₹)',
  'Discount (₹)',
  'GST / Tax (₹)',
  'Grand Total (₹)',
  'Advance Paid (₹)',
  'Due Balance (₹)',
  'Payment Method',
  'Status',
  'Message on Cake',
  'Delivery / Pickup Date',
  'Delivery Time'
];

/**
 * Transforms a finalized Bill object into an array of cell values
 * matching BILL_SHEET_HEADERS.
 */
export function formatBillForGoogleSheet(bill: Bill): (string | number)[] {
  const dateObj = new Date(bill.createdAt);
  const formattedDate = dateObj.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const formattedTime = dateObj.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const itemsSummary = bill.items
    .map((item) => `${item.name} (${item.weightOrSize}) x${item.qty} = ₹${item.total.toFixed(0)}`)
    .join('; ');

  const totalItemUnits = bill.items.reduce((sum, item) => sum + item.qty, 0);

  return [
    bill.billNo,
    formattedDate,
    formattedTime,
    bill.customerName || 'Walk-in Customer',
    bill.customerMobile || '',
    bill.orderType.toUpperCase().replace('_', ' '),
    itemsSummary,
    totalItemUnits,
    bill.subtotal,
    bill.discountAmount,
    bill.taxAmount,
    bill.grandTotal,
    bill.advancePaid,
    bill.dueAmount,
    bill.paymentMethod,
    bill.status.toUpperCase(),
    bill.cakeMessage || '',
    bill.deliveryDate || '',
    bill.deliveryTime || ''
  ];
}

/**
 * Searches for or creates a dedicated Google Sheet with the required columns
 * and styling for the bakery sales ledger.
 */
export async function getOrCreateBakerySpreadsheet(
  accessToken: string,
  options?: ExportOptions
): Promise<SpreadsheetInfo> {
  const title = options?.spreadsheetTitle || DEFAULT_SPREADSHEET_TITLE;
  const sheetName = options?.sheetName || DEFAULT_SHEET_NAME;

  // 1. Check cached spreadsheet ID in localStorage
  const cachedId = localStorage.getItem(LOCAL_STORAGE_KEY_SHEET_ID);
  if (cachedId) {
    try {
      const verifyRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cachedId}?fields=spreadsheetId,spreadsheetUrl,properties.title`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );
      if (verifyRes.ok) {
        const data = await verifyRes.json();
        return {
          spreadsheetId: data.spreadsheetId,
          spreadsheetUrl:
            data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}/edit`,
          title: data.properties?.title || title
        };
      }
    } catch {
      // Invalid cached ID; search or create
    }
  }

  // 2. Search Google Drive for an existing spreadsheet with matching title
  const query = encodeURIComponent(
    `name = '${title}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`
  );
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      const found = searchData.files[0];
      localStorage.setItem(LOCAL_STORAGE_KEY_SHEET_ID, found.id);
      return {
        spreadsheetId: found.id,
        spreadsheetUrl: found.webViewLink || `https://docs.google.com/spreadsheets/d/${found.id}/edit`,
        title: found.name
      };
    }
  }

  // 3. Create a new Google Spreadsheet with the configured sheet name
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        {
          properties: {
            title: sheetName,
            gridProperties: {
              frozenRowCount: 1
            }
          }
        }
      ]
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Spreadsheet: ${errText}`);
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl =
    created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  localStorage.setItem(LOCAL_STORAGE_KEY_SHEET_ID, spreadsheetId);

  // 4. Initialize Header Row
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
      sheetName
    )}!A1:S1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [BILL_SHEET_HEADERS]
      })
    }
  );

  // 5. Apply Header Styling: Rich Plum / Royal Burgundy theme (#4B1D3F) with bold white text
  const sheetId = created.sheets?.[0]?.properties?.sheetId || 0;
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      requests: [
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: BILL_SHEET_HEADERS.length
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.294, green: 0.114, blue: 0.247 }, // #4B1D3F
                textFormat: {
                  foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                  bold: true,
                  fontSize: 10
                },
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
          }
        },
        {
          autoResizeDimensions: {
            dimensions: {
              sheetId,
              dimension: 'COLUMNS',
              startIndex: 0,
              endIndex: BILL_SHEET_HEADERS.length
            }
          }
        }
      ]
    })
  });

  return { spreadsheetId, spreadsheetUrl, title };
}

/**
 * Exports a single finalized Bill object to Google Sheets using the Google Sheets API.
 * Appends the bill as a new row in the "Sales Register" sheet.
 *
 * @param accessToken Valid Google OAuth access token with spreadsheets scope
 * @param bill The finalized Bill object to export
 * @param options Optional spreadsheet title and sheet name overrides
 */
export async function exportFinalizedBillToSheet(
  accessToken: string,
  bill: Bill,
  options?: ExportOptions
): Promise<ExportResult> {
  try {
    const sheetInfo = await getOrCreateBakerySpreadsheet(accessToken, options);
    const sheetName = options?.sheetName || DEFAULT_SHEET_NAME;
    const rowValues = formatBillForGoogleSheet(bill);

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${
        sheetInfo.spreadsheetId
      }/values/${encodeURIComponent(sheetName)}!A:S:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [rowValues]
        })
      }
    );

    if (!appendRes.ok) {
      const errText = await appendRes.text();
      return {
        success: false,
        billNo: bill.billNo,
        spreadsheetId: sheetInfo.spreadsheetId,
        spreadsheetUrl: sheetInfo.spreadsheetUrl,
        exportedAt: new Date().toISOString(),
        error: `Sheets API append error: ${errText}`
      };
    }

    return {
      success: true,
      billNo: bill.billNo,
      spreadsheetId: sheetInfo.spreadsheetId,
      spreadsheetUrl: sheetInfo.spreadsheetUrl,
      exportedAt: new Date().toISOString()
    };
  } catch (err: any) {
    console.error('exportFinalizedBillToSheet failed:', err);
    return {
      success: false,
      billNo: bill.billNo,
      spreadsheetId: '',
      spreadsheetUrl: '',
      exportedAt: new Date().toISOString(),
      error: err.message || 'Unknown export error'
    };
  }
}

/**
 * Batch exports an array of finalized Bill objects to Google Sheets using the Google Sheets API.
 * Appends all rows in a single batch request for maximum efficiency.
 *
 * @param accessToken Valid Google OAuth access token with spreadsheets scope
 * @param bills Array of finalized Bill objects to export
 * @param options Optional spreadsheet title and sheet name overrides
 */
export async function exportFinalizedBillsBatch(
  accessToken: string,
  bills: Bill[],
  options?: ExportOptions
): Promise<BatchExportResult> {
  if (!bills || bills.length === 0) {
    throw new Error('No bill objects provided for export.');
  }

  try {
    const sheetInfo = await getOrCreateBakerySpreadsheet(accessToken, options);
    const sheetName = options?.sheetName || DEFAULT_SHEET_NAME;
    const rows = bills.map(formatBillForGoogleSheet);

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${
        sheetInfo.spreadsheetId
      }/values/${encodeURIComponent(sheetName)}!A:S:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: rows
        })
      }
    );

    if (!appendRes.ok) {
      const errText = await appendRes.text();
      return {
        success: false,
        exportedCount: 0,
        spreadsheetId: sheetInfo.spreadsheetId,
        spreadsheetUrl: sheetInfo.spreadsheetUrl,
        exportedAt: new Date().toISOString(),
        error: `Sheets API batch append error: ${errText}`
      };
    }

    return {
      success: true,
      exportedCount: bills.length,
      spreadsheetId: sheetInfo.spreadsheetId,
      spreadsheetUrl: sheetInfo.spreadsheetUrl,
      exportedAt: new Date().toISOString()
    };
  } catch (err: any) {
    console.error('exportFinalizedBillsBatch failed:', err);
    return {
      success: false,
      exportedCount: 0,
      spreadsheetId: '',
      spreadsheetUrl: '',
      exportedAt: new Date().toISOString(),
      error: err.message || 'Unknown batch export error'
    };
  }
}

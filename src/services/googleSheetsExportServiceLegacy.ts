import { Bill } from '../types';
import {
  exportFinalizedBillToSheet,
  exportFinalizedBillsBatch
} from './googleSheetsExportService';

const STORAGE_KEY_SHEET_ID = 'dcc_sheets_spreadsheet_id';
const STORAGE_KEY_AUTO_SYNC = 'dcc_sheets_auto_sync_enabled';

export function isAutoSheetsSyncEnabled(): boolean {
  const val = localStorage.getItem(STORAGE_KEY_AUTO_SYNC);
  return val === null ? true : val === 'true';
}

export function setAutoSheetsSyncEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY_AUTO_SYNC, enabled ? 'true' : 'false');
}

export function getSavedSpreadsheetId(): string | null {
  return localStorage.getItem(STORAGE_KEY_SHEET_ID);
}

export function setSavedSpreadsheetId(id: string): void {
  localStorage.setItem(STORAGE_KEY_SHEET_ID, id);
}

export async function appendBillToGoogleSheet(
  accessToken: string,
  bill: Bill,
  shopName?: string
): Promise<{ success: boolean; spreadsheetUrl?: string }> {
  const res = await exportFinalizedBillToSheet(accessToken, bill, { shopName });
  return {
    success: res.success,
    spreadsheetUrl: res.spreadsheetUrl
  };
}

export async function syncAllBillsToGoogleSheet(
  accessToken: string,
  bills: Bill[],
  shopName?: string
): Promise<{ count: number; spreadsheetUrl: string }> {
  const res = await exportFinalizedBillsBatch(accessToken, bills, { shopName });
  return {
    count: res.exportedCount,
    spreadsheetUrl: res.spreadsheetUrl
  };
}

import React, { useState, useEffect } from 'react';
import { Bill, ShopConfig } from '../types';
import {
  getOrCreateBakerySpreadsheet,
  syncAllBillsToGoogleSheet,
  isAutoSheetsSyncEnabled,
  setAutoSheetsSyncEnabled
} from '../services/sheetsService';
import { googleSignIn, getAccessToken } from '../lib/firebase';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Table,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';

interface GoogleSheetsManagerProps {
  bills: Bill[];
  config: ShopConfig;
}

export const GoogleSheetsManager: React.FC<GoogleSheetsManagerProps> = ({
  bills,
  config
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState<boolean>(isAutoSheetsSyncEnabled());
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    getAccessToken().then((t) => {
      if (t) {
        setToken(t);
        checkSpreadsheet(t);
      }
    });
  }, []);

  const checkSpreadsheet = async (accessToken: string) => {
    try {
      const data = await getOrCreateBakerySpreadsheet(accessToken, { shopName: config.shopName });
      setSpreadsheetUrl(data.spreadsheetUrl);
    } catch (err) {
      console.warn('Google Sheet setup note:', err);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        setToken(res.accessToken);
        await checkSpreadsheet(res.accessToken);
        setStatusMsg('Connected to Google Sheets successfully!');
      } else {
        setStatusMsg('Sign-in popup closed. Click Connect whenever you are ready.');
      }
    } catch (err: any) {
      setStatusMsg(`Sign in failed: ${err?.message || 'Try again'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoSync = () => {
    const next = !autoSync;
    setAutoSync(next);
    setAutoSheetsSyncEnabled(next);
  };

  const handleSyncAllBills = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await syncAllBillsToGoogleSheet(token, bills, config.shopName);
      setSpreadsheetUrl(res.spreadsheetUrl);
      setStatusMsg(`Successfully pushed ${res.count} bills to Google Sheet!`);
    } catch (err: any) {
      setStatusMsg(`Sync failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>Google Sheets — Automated Accounting & Sales Register</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatically log every finalized bakery bill, payment method, advance, and customer order into Google Sheets
          </p>
        </div>

        {!token ? (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{loading ? 'Connecting...' : 'Connect Google Sheets'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {spreadsheetUrl && (
              <a
                href={spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Google Sheet</span>
              </a>
            )}
            <button
              onClick={handleSyncAllBills}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Push All Past Bills ({bills.length})</span>
            </button>
          </div>
        )}
      </div>

      {statusMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusMsg}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="font-bold text-emerald-700">×</button>
        </div>
      )}

      {/* Auto-Sync Banner */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-0.5">
          <span className="font-bold text-slate-900 text-xs block">
            Automatic Real-Time Push to Google Sheets
          </span>
          <span className="text-[11px] text-slate-500">
            When enabled, every finalized bill created or printed in the billing POS is instantly appended as a new row in your spreadsheet.
          </span>
        </div>

        <button
          onClick={handleToggleAutoSync}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            autoSync
              ? 'bg-emerald-600 text-white shadow-2xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
          }`}
        >
          {autoSync ? (
            <>
              <ToggleRight className="w-4 h-4 text-emerald-200" />
              <span>Auto-Push Active</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-4 h-4 text-slate-400" />
              <span>Auto-Push Paused</span>
            </>
          )}
        </button>
      </div>

      {/* Columns & Structure Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Table className="w-4 h-4 text-slate-400" />
            <span>Spreadsheet Column Headers:</span>
          </span>
          {spreadsheetUrl && (
            <a
              href={spreadsheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>View live in Google Sheets</span>
              <ArrowUpRight className="w-3 h-3" />
            </a>
          )}
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#4b1d3f] text-white font-bold text-[10px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Bill No</th>
                <th className="py-2.5 px-3">Date & Time</th>
                <th className="py-2.5 px-3">Customer</th>
                <th className="py-2.5 px-3">Contact</th>
                <th className="py-2.5 px-3">Order Type</th>
                <th className="py-2.5 px-3">Items Summary</th>
                <th className="py-2.5 px-3 text-right">Total (₹)</th>
                <th className="py-2.5 px-3 text-right">Advance (₹)</th>
                <th className="py-2.5 px-3 text-right">Due (₹)</th>
                <th className="py-2.5 px-3 text-center">Payment</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px] font-sans">
              {bills.slice(0, 3).map((bill) => (
                <tr key={bill.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-mono font-bold text-[#4b1d3f]">{bill.billNo}</td>
                  <td className="py-2 px-3 text-slate-600 text-[10px]">
                    {new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="py-2 px-3 font-medium text-slate-900">{bill.customerName}</td>
                  <td className="py-2 px-3 font-mono text-slate-500">{bill.customerMobile}</td>
                  <td className="py-2 px-3 uppercase text-[10px] font-semibold text-slate-600">{bill.orderType}</td>
                  <td className="py-2 px-3 text-slate-600 truncate max-w-[150px]">
                    {bill.items.map((i) => i.name).join(', ')}
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold">₹{bill.grandTotal.toFixed(0)}</td>
                  <td className="py-2 px-3 text-right font-mono text-emerald-700">₹{bill.advancePaid.toFixed(0)}</td>
                  <td className="py-2 px-3 text-right font-mono text-rose-600">₹{bill.dueAmount.toFixed(0)}</td>
                  <td className="py-2 px-3 text-center font-bold text-[10px]">{bill.paymentMethod}</td>
                  <td className="py-2 px-3 text-center">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                      {bill.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

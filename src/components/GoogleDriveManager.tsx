import React, { useState, useEffect } from 'react';
import { Bill, ShopConfig } from '../types';
import {
  uploadFileToDrive,
  listBakeryFiles,
  downloadFileContent,
  deleteFileFromDrive,
  DriveFileItem
} from '../services/driveService';
import { googleSignIn, getAccessToken } from '../lib/firebase';
import { importDataFromJson } from '../utils/storage';
import {
  Cloud,
  Upload,
  Download,
  Trash2,
  ExternalLink,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface GoogleDriveManagerProps {
  bills: Bill[];
  config: ShopConfig;
  onRestoreSuccess: () => void;
}

export const GoogleDriveManager: React.FC<GoogleDriveManagerProps> = ({
  bills,
  config,
  onRestoreSuccess
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);

  useEffect(() => {
    getAccessToken().then((t) => {
      if (t) {
        setToken(t);
        loadFiles(t);
      }
    });
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        setToken(res.accessToken);
        await loadFiles(res.accessToken);
        setStatusMessage('Connected to Google Drive successfully!');
      } else {
        setStatusMessage('Sign-in popup closed. Click Connect whenever you are ready.');
      }
    } catch (err: any) {
      console.warn('Google Drive sign-in notice:', err?.message || err);
      setStatusMessage(`Sign-in failed: ${err?.message || 'Check permissions'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (accessToken: string) => {
    setLoading(true);
    try {
      const items = await listBakeryFiles(accessToken);
      setFiles(items);
    } catch (err: any) {
      console.error('Error fetching drive files:', err);
    } finally {
      setLoading(false);
    }
  };

  // Upload current bills database to Google Drive
  const handleUploadBackup = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = {
        version: '2.0',
        exportDate: new Date().toISOString(),
        shopName: config.shopName,
        billsCount: bills.length,
        bills
      };
      const fileName = `DCC_Backup_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}.json`;
      await uploadFileToDrive(token, fileName, JSON.stringify(data, null, 2), 'application/json');
      setStatusMessage(`Saved "${fileName}" to Google Drive!`);
      await loadFiles(token);
    } catch (err: any) {
      setStatusMessage(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Restore backup from Google Drive (Requires explicit confirmation)
  const handleRestoreFile = async (file: DriveFileItem) => {
    if (!token) return;
    const confirmed = window.confirm(
      `Restore backup "${file.name}" from Google Drive? This will update your local bill register.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const content = await downloadFileContent(token, file.id);
      if (importDataFromJson(content)) {
        setStatusMessage(`Successfully restored data from "${file.name}"!`);
        onRestoreSuccess();
      } else {
        setStatusMessage('Invalid backup format in file.');
      }
    } catch (err: any) {
      setStatusMessage(`Restore error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Destructive deletion with mandatory user confirmation modal
  const handleConfirmDelete = async () => {
    if (!token || !fileToDelete) return;
    setLoading(true);
    try {
      await deleteFileFromDrive(token, fileToDelete.id);
      setStatusMessage(`Deleted "${fileToDelete.name}" from Google Drive.`);
      setFileToDelete(null);
      await loadFiles(token);
    } catch (err: any) {
      setStatusMessage(`Delete failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <Cloud className="w-5 h-5 text-blue-600" />
            <span>Google Drive Cloud Backup & Storage</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Store bakery invoices, daily sales ledgers, and backup records in your private Google Drive
          </p>
        </div>

        {!token ? (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
          >
            <Cloud className="w-4 h-4" />
            <span>{loading ? 'Connecting...' : 'Connect Google Drive'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleUploadBackup}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Save Backup to Drive</span>
            </button>
            <button
              onClick={() => loadFiles(token)}
              disabled={loading}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg border border-slate-200"
              title="Refresh Drive Files"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {statusMessage && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage(null)} className="font-bold text-blue-600">×</button>
        </div>
      )}

      {!token ? (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Cloud className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">Google Drive is not connected</p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
            Click "Connect Google Drive" to sync your bakery invoices, customer receipts, and daily sales registers directly to Google Drive.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-600 block">
            Saved Bakery Backups on Google Drive ({files.length}):
          </span>

          {files.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              No backups found in your Google Drive bakery folder. Click "Save Backup to Drive" to create one.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900 block">{file.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(file.createdTime).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-slate-700"
                        title="Open in Google Drive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleRestoreFile(file)}
                      className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded font-semibold text-[11px] flex items-center gap-1"
                      title="Restore local register from this file"
                    >
                      <Download className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                    <button
                      onClick={() => setFileToDelete(file)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                      title="Delete from Drive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mandatory User Confirmation Dialog for Destructive Delete */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-bold text-sm text-slate-900">Confirm Deletion</h4>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to delete <b className="text-slate-900 font-mono">{fileToDelete.name}</b> from your Google Drive? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setFileToDelete(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

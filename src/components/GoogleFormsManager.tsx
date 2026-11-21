import React, { useState, useEffect } from 'react';
import { ShopConfig } from '../types';
import {
  createBakeryOrderForm,
  getGoogleFormResponses,
  GoogleFormResponse,
  GoogleFormDetails
} from '../services/formsService';
import { googleSignIn, getAccessToken } from '../lib/firebase';
import {
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Copy,
  ExternalLink,
  Share2,
  CheckCircle2,
  Cake,
  Calendar,
  Phone,
  User,
  ArrowRight
} from 'lucide-react';

interface GoogleFormsManagerProps {
  config: ShopConfig;
  onSelectFormOrderForBilling: (order: {
    customerName: string;
    customerMobile: string;
    productName: string;
    weight: string;
    cakeMessage: string;
    deliveryDate: string;
  }) => void;
}

export const GoogleFormsManager: React.FC<GoogleFormsManagerProps> = ({
  config,
  onSelectFormOrderForBilling
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [formDetails, setFormDetails] = useState<GoogleFormDetails | null>(() => {
    const saved = localStorage.getItem('dcc_google_form_details');
    return saved ? JSON.parse(saved) : null;
  });
  const [responses, setResponses] = useState<GoogleFormResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    getAccessToken().then((t) => {
      if (t) {
        setToken(t);
        if (formDetails?.formId) {
          fetchResponses(t, formDetails.formId);
        }
      }
    });
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        setToken(res.accessToken);
        setStatusMsg('Connected to Google Forms!');
        if (formDetails?.formId) {
          await fetchResponses(res.accessToken, formDetails.formId);
        }
      } else {
        setStatusMsg('Sign-in popup closed. Click Connect whenever you are ready.');
      }
    } catch (err: any) {
      setStatusMsg(`Sign in failed: ${err?.message || 'Try again'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateForm = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const details = await createBakeryOrderForm(token, config.shopName);
      setFormDetails(details);
      localStorage.setItem('dcc_google_form_details', JSON.stringify(details));
      setStatusMsg('Custom cake order form created on Google Forms!');
      await fetchResponses(token, details.formId);
    } catch (err: any) {
      setStatusMsg(`Failed to create form: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchResponses = async (accessToken: string, fId: string) => {
    setLoading(true);
    try {
      const list = await getGoogleFormResponses(accessToken, fId);
      setResponses(list);
    } catch (err: any) {
      console.warn('Could not fetch responses yet:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!formDetails?.responderUri) return;
    navigator.clipboard.writeText(formDetails.responderUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareOnWhatsApp = () => {
    if (!formDetails?.responderUri) return;
    const msg = `🎂 *${config.shopName}*\nBook your 100% Eggless Custom Cake online!\nClick here to choose flavor, size & message: ${formDetails.responderUri}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
        <div>
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-purple-600" />
            <span>Google Forms — Online Cake Booking & Custom Orders</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Collect customer cake flavor requests, party dates, and customized messages via Google Forms
          </p>
        </div>

        {!token ? (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{loading ? 'Connecting...' : 'Connect Google Forms'}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {!formDetails ? (
              <button
                onClick={handleCreateForm}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Cake Order Form</span>
              </button>
            ) : (
              <button
                onClick={() => fetchResponses(token, formDetails.formId)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Orders</span>
              </button>
            )}
          </div>
        )}
      </div>

      {statusMsg && (
        <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center justify-between">
          <span>{statusMsg}</span>
          <button onClick={() => setStatusMsg(null)} className="font-bold text-purple-600">×</button>
        </div>
      )}

      {/* Active Form Card */}
      {formDetails && (
        <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200/80 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
                Active Cake Order Form
              </span>
              <h4 className="font-bold text-slate-900 text-sm">{formDetails.title}</h4>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={formDetails.responderUri}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-white text-purple-900 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-purple-100/50"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Form</span>
              </a>

              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 hover:bg-slate-50"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Copied Link!' : 'Copy Form URL'}</span>
              </button>

              <button
                onClick={handleShareOnWhatsApp}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-emerald-700"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Responses List */}
      {token && formDetails && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Customer Submissions / Online Bookings ({responses.length}):
            </span>
            <span className="text-[11px] text-slate-400">100% Eggless Pure Veg</span>
          </div>

          {responses.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Cake className="w-8 h-8 text-slate-300 mx-auto mb-1 stroke-1" />
              <p>No customer submissions received yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Share your form link with customers to collect orders directly from WhatsApp or Instagram!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {responses.map((resp) => (
                <div
                  key={resp.responseId}
                  className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-sm">{resp.customerName}</span>
                      {resp.customerMobile && (
                        <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {resp.customerMobile}
                        </span>
                      )}
                    </div>
                    <div className="text-slate-700 flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-[#4b1d3f]">🎂 {resp.cakeFlavor}</span>
                      <span>·</span>
                      <span className="font-mono text-slate-600">Weight: {resp.weight}</span>
                      {resp.deliveryDate && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-700 font-semibold">📅 Date: {resp.deliveryDate}</span>
                        </>
                      )}
                    </div>
                    {resp.cakeMessage && (
                      <p className="text-[11px] text-amber-800 italic bg-amber-50 px-2 py-0.5 rounded inline-block">
                        Message: "{resp.cakeMessage}"
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      onSelectFormOrderForBilling({
                        customerName: resp.customerName || '',
                        customerMobile: resp.customerMobile || '',
                        productName: resp.cakeFlavor || '',
                        weight: resp.weight || '1.0 lb',
                        cakeMessage: resp.cakeMessage || '',
                        deliveryDate: resp.deliveryDate || ''
                      });
                    }}
                    className="px-3.5 py-2 bg-[#4b1d3f] hover:bg-[#38152e] text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0"
                  >
                    <span>Create Bill from Order</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

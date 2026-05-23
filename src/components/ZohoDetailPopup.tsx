import React, { useEffect, useState } from 'react';
import {
  X,
  Calendar,
  User,
  Clock,
  Activity,
  CheckSquare,
  Folder,
  AlertCircle,
  ExternalLink,
  Loader2
} from 'lucide-react';

interface ZohoDetailPopupProps {
  type: 'project' | 'task' | 'member';
  projectId: string;
  taskId?: string;
  token: string;
  onClose: () => void;
}

interface ZohoResourceData {
  id?: string;
  key?: string;
  name: string;
  status?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  owner_name?: string;
  owner_email?: string;
  percent_complete?: number;
  task_count?: {
    open: number;
    closed: number;
  };
  priority?: string;
  completed?: boolean;
  status_name?: string;
  duration?: string;
  duration_type?: string;
  assigned_to?: Array<{ name: string; work?: string }>;
  log_hours_billable?: string;
  log_hours_non_billable?: string;
  created_person?: string;
  link_web?: string;
  
  // Member specific fields
  zpuid?: string;
  email?: string;
  role?: string;
  portal_role_name?: string;
  portal_profile_name?: string;
  active?: boolean;
  profile_type?: string;
  is_resource?: boolean;
  chat_access?: boolean;
}

export const ZohoDetailPopup: React.FC<ZohoDetailPopupProps> = ({
  type,
  projectId,
  taskId,
  token,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ZohoResourceData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const baseUrl = import.meta.env.VITE_ZOHO_SERVICE_URL || 'http://localhost:8003';
      
      const endpoint = type === 'project'
        ? `${baseUrl}/zoho/projects/${projectId}`
        : type === 'task'
        ? `${baseUrl}/zoho/projects/${projectId}/tasks/${taskId}`
        : `${baseUrl}/zoho/projects/${projectId}/members/${taskId}`;

      try {
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || `Failed to fetch ${type} details (Status: ${response.status})`);
        }

        const resJson = await response.json();
        if (resJson.success) {
          setData(
            type === 'project' 
              ? resJson.project 
              : type === 'task' 
              ? resJson.task 
              : resJson.member
          );
        } else {
          throw new Error(resJson.error || `Request was unsuccessful.`);
        }
      } catch (err) {
        console.error(err);
        const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred while fetching details.';
        setError(errMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type, projectId, taskId, token]);



  // Prevent scroll propagation when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-all duration-300 animate-fade-in">
      {/* Modal Card */}
      <div 
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-800 bg-[#0d1220]/95 shadow-2xl backdrop-blur-xl transition-all duration-300 transform scale-100 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2">
            {type === 'project' ? (
              <Folder className="h-5 w-5 text-indigo-400" />
            ) : type === 'member' ? (
              <User className="h-5 w-5 text-sky-400" />
            ) : (
              <CheckSquare className="h-5 w-5 text-emerald-400" />
            )}
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
              Zoho {type} details
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/60 transition-all cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <span className="text-sm font-medium tracking-wide">Fetching from Zoho API...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-3">
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-rose-950/30 text-rose-400 border border-rose-900/30">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h4 className="text-slate-200 font-semibold">Failed to load details</h4>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">{error}</p>
            </div>
          ) : (
            <>
              {type === 'member' ? (
                <div className="space-y-6">
                  {/* Member profile header card */}
                  <div className="flex items-center gap-4 bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
                    <div className="h-16 w-16 rounded-full bg-linear-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white uppercase shadow-lg shadow-sky-950/20">
                      {data?.name ? data.name.slice(0, 2) : 'US'}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                          data?.active
                            ? 'bg-emerald-950/40 border border-emerald-900/30 text-emerald-400'
                            : 'bg-slate-800 border border-slate-700 text-slate-400'
                        }`}>
                          {data?.active ? 'Active Portal User' : 'Inactive'}
                        </span>
                        {data?.is_resource && (
                          <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full bg-indigo-950/40 border border-indigo-900/30 text-indigo-400">
                            Allocatable Resource
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-slate-100">{data?.name}</h3>
                      <p className="text-xs font-mono text-slate-400 mt-0.5">{data?.email}</p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Role Details */}
                    <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 flex gap-3 items-start">
                      <Activity className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono block">
                          Project Assignment & Role
                        </span>
                        <span className="text-sm text-slate-200 font-medium block mt-1">
                          {data?.role || 'Employee'}
                        </span>
                        {data?.portal_role_name && (
                          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                            Portal Profile: {data.portal_profile_name || 'N/A'} (ID: {data.profile_type || 'N/A'})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Access Settings */}
                    <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 flex gap-3 items-start">
                      <CheckSquare className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono block">
                          Workspace Chat Access
                        </span>
                        <span className={`text-sm font-semibold block mt-1 ${data?.chat_access ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {data?.chat_access ? 'Enabled (Full Access)' : 'Disabled'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                          ZPUID: <code className="font-mono text-slate-400">{data?.zpuid}</code>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Call to actions */}
                  <div className="pt-4 border-t border-slate-800/80 flex justify-end gap-3">
                    <a
                      href={`mailto:${data?.email}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-xs tracking-wide transition-all shadow-md shadow-indigo-950/20 cursor-pointer"
                    >
                      Send Email
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  {/* Main Title & Key */}
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider font-mono rounded bg-slate-800 border border-slate-700/80 text-slate-300 uppercase">
                        {data?.key || 'N/A'}
                      </span>
                      {type === 'task' && data?.priority && data.priority !== 'None' && (
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                          data.priority === 'High' 
                            ? 'bg-rose-950/40 border border-rose-900/30 text-rose-400'
                            : 'bg-amber-950/40 border border-amber-900/30 text-amber-400'
                        }`}>
                          {data.priority}
                        </span>
                      )}
                      {type === 'task' && (
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                          data?.completed
                            ? 'bg-emerald-950/40 border border-emerald-900/30 text-emerald-400'
                            : 'bg-indigo-950/40 border border-indigo-900/30 text-indigo-400'
                        }`}>
                          {data?.status_name || 'Open'}
                        </span>
                      )}
                      {type === 'project' && data?.status && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-950/40 border border-indigo-900/30 text-indigo-400">
                          {data.status}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-100 leading-snug">
                      {data?.name}
                    </h3>
                  </div>

                  {/* Description */}
                  {data?.description && (
                    <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono block mb-2">
                        Description
                      </span>
                      <div 
                        className="text-sm text-slate-300 leading-relaxed font-sans"
                        dangerouslySetInnerHTML={{ __html: data.description }}
                      />
                    </div>
                  )}

                  {/* Grid Metadata */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Dates */}
                    <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 flex gap-3 items-start">
                      <Calendar className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono block">
                          Timeline
                        </span>
                        <span className="text-sm text-slate-200 font-medium block mt-1">
                          {data?.start_date || 'N/A'} — {data?.end_date || 'N/A'}
                        </span>
                        {type === 'task' && data?.duration && (
                          <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                            Duration: {data.duration} {data.duration_type}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Team / Assignment */}
                    <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 flex gap-3 items-start">
                      <User className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                      <div className="w-full">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono block">
                          {type === 'project' ? 'Owner' : 'Assigned To'}
                        </span>
                        {type === 'project' ? (
                          <div className="mt-1">
                            <span className="text-sm text-slate-200 font-medium block">
                              {data?.owner_name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono block">
                              {data?.owner_email}
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1 space-y-1">
                            {data?.assigned_to && data.assigned_to.length > 0 ? (
                              data.assigned_to.map((person, idx: number) => (
                                <div key={idx} className="flex justify-between items-center">
                                  <span className="text-sm text-slate-200 font-medium">{person.name}</span>
                                  {person.work && <span className="text-[10px] font-mono text-slate-500">{person.work}% allocation</span>}
                                </div>
                              ))
                            ) : (
                              <span className="text-sm text-slate-500 italic block">Unassigned</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Task Stats (Projects) or Timesheet Logs (Tasks) */}
                    {type === 'project' ? (
                      <>
                        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 flex gap-3 items-start">
                          <Activity className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono block">
                              Project Progress
                            </span>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden w-28 sm:w-32">
                                <div 
                                  className="h-full bg-indigo-500 transition-all duration-500" 
                                  style={{ width: `${data?.percent_complete || 0}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold text-slate-200 font-mono">{data?.percent_complete || 0}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 flex gap-3 items-start">
                          <CheckSquare className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono block">
                              Tasks
                            </span>
                            <span className="text-sm text-slate-200 font-semibold block mt-1">
                              {data?.task_count?.open ?? 0} open · {data?.task_count?.closed ?? 0} closed
                            </span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 flex gap-3 items-start">
                          <Activity className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono block">
                              Task Progress
                            </span>
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden w-28 sm:w-32">
                                <div 
                                  className="h-full bg-emerald-500 transition-all duration-500" 
                                  style={{ width: `${data?.percent_complete || 0}%` }}
                                />
                              </div>
                              <span className="text-sm font-bold text-slate-200 font-mono">{data?.percent_complete || 0}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 flex gap-3 items-start col-span-1 sm:col-span-2">
                          <Clock className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                          <div className="w-full">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 font-mono block">
                              Timesheet Logged Hours
                            </span>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                              <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono block">Billable</span>
                                <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">
                                  {data?.log_hours_billable || '0.0'} hrs
                                </span>
                              </div>
                              <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono block">Non-Billable</span>
                                <span className="text-base font-bold text-slate-400 font-mono mt-0.5 block">
                                  {data?.log_hours_non_billable || '0.0'} hrs
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Created By & External Link */}
                  <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-indigo-400 uppercase">
                        {data?.created_person ? data.created_person.slice(0, 2) : 'CR'}
                      </div>
                      <span className="text-xs text-slate-400 font-medium">
                        Created by <span className="text-slate-200 font-semibold">{data?.created_person}</span>
                      </span>
                    </div>

                    {data?.link_web && (
                      <a
                        href={data.link_web}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-semibold text-xs tracking-wide transition-all shadow-md shadow-indigo-950/20 cursor-pointer"
                      >
                        Open in Zoho Projects
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ZohoDetailPopup;

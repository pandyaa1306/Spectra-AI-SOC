import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Filter,
  Download,
  Copy,
  Check,
  ExternalLink,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Bot,
  User,
  Sliders,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpDown,
  Building2,
  FileText,
} from 'lucide-react';
import { Alert, Analyst, Client, SecurityPlatform, SeverityLevel } from '../types/soc';
import { getAlertTicketNumber, getAlertCaseNumber } from '../utils/ticketUtils';

export interface DrilldownFilterContext {
  type: 'analyst' | 'user' | 'platform' | 'client' | 'severity' | 'status' | 'custom' | 'all' | 'sla-risk' | 'duplicate-suppressed';
  value: string;
  label: string;
  count?: number;
  subtitle?: string;
}

interface DrilldownResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterContext: DrilldownFilterContext | null;
  alerts: Alert[];
  analysts: Analyst[];
  clients: Client[];
  onSelectAlertForReport: (alert: Alert) => void;
  onClaimAlert: (alertId: string) => void;
  onSendToTuning?: (alertId: string, reason?: string) => void;
  onCloseAlert?: (alertId: string, reason: 'Benign' | 'False Positive' | 'True Positive', notes?: string) => void;
  onDrilldownAgain?: (context: DrilldownFilterContext) => void;
  currentAnalystName?: string;
}

export const DrilldownResultsModal: React.FC<DrilldownResultsModalProps> = ({
  isOpen,
  onClose,
  filterContext,
  alerts,
  analysts,
  clients,
  onSelectAlertForReport,
  onClaimAlert,
  onSendToTuning,
  onCloseAlert,
  onDrilldownAgain,
  currentAnalystName = 'David Sterling',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'severity' | 'timestamp' | 'ticket'>('severity');
  const [sortAsc, setSortAsc] = useState(false);
  const [copiedTickets, setCopiedTickets] = useState(false);

  if (!isOpen || !filterContext) return null;

  // Filter alerts based on the primary drilldown context
  const matchedAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const { type, value } = filterContext;

      if (type === 'analyst') {
        // Match analyst ID or name
        return (
          alert.assignedToId === value ||
          alert.assignedTo?.toLowerCase().includes(value.toLowerCase()) ||
          alert.claimedByAnalystId === value ||
          alert.claimedByAnalystName?.toLowerCase().includes(value.toLowerCase())
        );
      }

      if (type === 'user') {
        // Match entity user or email
        return (
          alert.entityUser?.toLowerCase().includes(value.toLowerCase()) ||
          alert.assignedTo?.toLowerCase().includes(value.toLowerCase())
        );
      }

      if (type === 'platform') {
        return alert.source_platform.toLowerCase() === value.toLowerCase();
      }

      if (type === 'client') {
        return (
          alert.clientId?.toLowerCase() === value.toLowerCase() ||
          alert.client?.toLowerCase().includes(value.toLowerCase())
        );
      }

      if (type === 'sla-risk' || value === 'sla-risk' || filterContext.label?.toLowerCase().includes('sla breach')) {
        if (value && value !== 'sla-risk' && value !== 'all') {
          return Boolean(alert.slaRisk) && (alert.clientId === value || alert.client?.toLowerCase().includes(value.toLowerCase()));
        }
        return Boolean(alert.slaRisk);
      }

      if (type === 'severity') {
        return alert.severity.toLowerCase() === value.toLowerCase();
      }

      if (type === 'status') {
        if (value === 'wip' || value === 'investigating') {
          return alert.status.includes('In Progress');
        }
        if (value === 'closed') {
          return alert.status === 'Closed';
        }
        if (value === 'claimed') {
          return alert.status.includes('Claimed');
        }
        if (value === 'unclaimed' || value === 'ai') {
          return alert.routedTo === 'FusionAI' && alert.status.includes('FusionAI Investigating');
        }
        return alert.status.toLowerCase().includes(value.toLowerCase());
      }

      // 'all' or 'custom'
      return true;
    });
  }, [alerts, filterContext]);

  // Apply secondary filters (search, severity, platform, status)
  const filteredAndSortedAlerts = useMemo(() => {
    return matchedAlerts
      .filter((alert) => {
        if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
        if (platformFilter !== 'all' && alert.source_platform !== platformFilter) return false;
        if (statusFilter !== 'all') {
          if (statusFilter === 'active' && alert.status === 'Closed') return false;
          if (statusFilter === 'closed' && alert.status !== 'Closed') return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTicket = getAlertTicketNumber(alert).toLowerCase().includes(q);
          const matchCase = getAlertCaseNumber(alert).toLowerCase().includes(q);
          const matchTitle = alert.title.toLowerCase().includes(q);
          const matchUser = alert.entityUser?.toLowerCase().includes(q);
          const matchHost = alert.entityHost?.toLowerCase().includes(q);
          const matchAnalyst = alert.assignedTo?.toLowerCase().includes(q);
          const matchClient = alert.client.toLowerCase().includes(q);
          return (
            matchTicket ||
            matchCase ||
            matchTitle ||
            matchUser ||
            matchHost ||
            matchAnalyst ||
            matchClient
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (sortField === 'severity') {
          const rank: Record<SeverityLevel, number> = {
            Critical: 4,
            High: 3,
            Medium: 2,
            Low: 1,
            Informational: 0,
          };
          const diff = rank[b.severity] - rank[a.severity];
          return sortAsc ? -diff : diff;
        }
        if (sortField === 'ticket') {
          return sortAsc
            ? a.id.localeCompare(b.id)
            : b.id.localeCompare(a.id);
        }
        return sortAsc
          ? a.timestamp.localeCompare(b.timestamp)
          : b.timestamp.localeCompare(a.timestamp);
      });
  }, [matchedAlerts, severityFilter, platformFilter, statusFilter, searchQuery, sortField, sortAsc]);

  // Stats calculation
  const critCount = matchedAlerts.filter((a) => a.severity === 'Critical').length;
  const highCount = matchedAlerts.filter((a) => a.severity === 'High').length;
  const medCount = matchedAlerts.filter((a) => a.severity === 'Medium').length;
  const closedCount = matchedAlerts.filter((a) => a.status === 'Closed').length;

  const handleCopyTicketList = () => {
    const list = filteredAndSortedAlerts
      .map(
        (a) =>
          `[${getAlertTicketNumber(a)} | ${getAlertCaseNumber(a)}] [${a.severity}] ${a.title} - ${a.client} (${a.source_platform}) - Assigned: ${a.assignedTo}`
      )
      .join('\n');
    navigator.clipboard.writeText(list);
    setCopiedTickets(true);
    setTimeout(() => setCopiedTickets(false), 2500);
  };

  const handleExportCSV = () => {
    const headers = 'Ticket Number,Case Number,Title,Severity,Status,Platform,Client,Assigned Analyst,User/Host,Timestamp\n';
    const rows = filteredAndSortedAlerts
      .map((a) =>
        `"${getAlertTicketNumber(a)}","${getAlertCaseNumber(a)}","${a.title.replace(/"/g, '""')}","${a.severity}","${a.status}","${a.source_platform}","${a.client}","${a.assignedTo}","${a.entityUser || a.entityHost || 'N/A'}","${a.timestamp}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `drilldown_cases_${filterContext.value.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSeverityBadgeClass = (severity: SeverityLevel) => {
    switch (severity) {
      case 'Critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/50';
      case 'High':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
      case 'Medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-4 md:p-5 border-b border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                  {filterContext.type} Drilldown
                </span>
                <h2 className="text-base md:text-lg font-bold text-white tracking-tight">
                  {filterContext.label}
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {filterContext.subtitle ||
                  `Showing ${filteredAndSortedAlerts.length} correlated cases & alerts matching this perspective`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyTicketList}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
              title="Copy list of matching tickets"
            >
              {copiedTickets ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTickets ? 'Copied!' : 'Copy Tickets'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download CSV report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Metrics KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-slate-950/60 border-b border-slate-800 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">Total Cases:</span>
            <span className="text-cyan-400 font-bold text-sm">{matchedAlerts.length}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <span className="text-rose-400">Critical:</span>
            <span className="text-rose-400 font-bold text-sm">{critCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <span className="text-amber-400">High:</span>
            <span className="text-amber-400 font-bold text-sm">{highCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <span className="text-yellow-400">Medium:</span>
            <span className="text-yellow-400 font-bold text-sm">{medCount}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <span className="text-emerald-400">Closed:</span>
            <span className="text-emerald-400 font-bold text-sm">{closedCount}</span>
          </div>
        </div>

        {/* Filter and Search Controls */}
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket #, case #, user, host, title, or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>

            {/* Platform Filter */}
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">All Platforms</option>
              <option value="CrowdStrike">CrowdStrike</option>
              <option value="Splunk">Splunk</option>
              <option value="Google SecOps">Google SecOps</option>
              <option value="Microsoft Defender">Microsoft Defender</option>
              <option value="Exabeam">Exabeam</option>
              <option value="Zscaler">Zscaler</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="closed">Closed Only</option>
            </select>

            {/* Sort Toggle */}
            <button
              type="button"
              onClick={() => {
                if (sortField === 'severity') setSortField('timestamp');
                else if (sortField === 'timestamp') setSortField('ticket');
                else setSortField('severity');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 cursor-pointer font-mono text-[11px]"
            >
              <ArrowUpDown className="w-3 h-3 text-cyan-400" />
              <span>Sort: {sortField.toUpperCase()}</span>
            </button>
          </div>
        </div>

        {/* Alerts Table */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredAndSortedAlerts.length > 0 ? (
            <div className="space-y-2">
              {filteredAndSortedAlerts.map((alert) => {
                const ticketNum = getAlertTicketNumber(alert);
                const caseNum = getAlertCaseNumber(alert);

                return (
                  <div
                    key={alert.id}
                    className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-cyan-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 group"
                  >
                    {/* Left: Ticket Numbers & Severity */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Ticket Number badge */}
                        <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/80 shadow-sm">
                          {ticketNum}
                        </span>

                        {/* Case Number badge */}
                        <span className="font-mono text-[11px] font-semibold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                          {caseNum}
                        </span>

                        {/* Severity */}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getSeverityBadgeClass(
                            alert.severity
                          )}`}
                        >
                          {alert.severity}
                        </span>

                        {/* Platform */}
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {alert.source_platform}
                        </span>

                        {/* Client (Clickable) */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onDrilldownAgain) {
                              onDrilldownAgain({
                                type: 'client',
                                value: alert.clientId,
                                label: alert.client,
                                subtitle: `Correlated cases for client ${alert.client}`,
                              });
                            }
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800 hover:bg-indigo-900 cursor-pointer flex items-center gap-1"
                        >
                          <Building2 className="w-3 h-3" />
                          <span>{alert.client}</span>
                        </button>

                        {/* Tuning Flagged badge */}
                        {alert.tuningFlagged && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            TUNING FLAGGED
                          </span>
                        )}

                        {/* Closure badge */}
                        {alert.status === 'Closed' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            CLOSED ({alert.closureReason || 'Resolved'})
                          </span>
                        )}
                      </div>

                      {/* Title & Preview */}
                      <div className="flex items-baseline gap-2">
                        <h4 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                          {alert.title}
                        </h4>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {alert.description}
                      </p>

                      {/* Entities & Analysts */}
                      <div className="flex items-center gap-3 flex-wrap text-[11px] font-mono text-slate-400 pt-1">
                        {alert.entityUser && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onDrilldownAgain) {
                                onDrilldownAgain({
                                  type: 'user',
                                  value: alert.entityUser || '',
                                  label: alert.entityUser || '',
                                  subtitle: `Cases involving user identity ${alert.entityUser}`,
                                });
                              }
                            }}
                            className="text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                            title="Drilldown into this user identity"
                          >
                            <User className="w-3 h-3 text-slate-500" />
                            <span>{alert.entityUser}</span>
                          </button>
                        )}

                        {alert.entityHost && (
                          <span className="text-slate-400 flex items-center gap-1">
                            <span>Host:</span>
                            <span className="text-slate-300">{alert.entityHost}</span>
                          </span>
                        )}

                        <span className="text-slate-500">•</span>

                        {/* Assigned Analyst (Clickable) */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">Assigned:</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (onDrilldownAgain && alert.assignedToId) {
                                onDrilldownAgain({
                                  type: 'analyst',
                                  value: alert.assignedToId,
                                  label: alert.assignedTo,
                                  subtitle: `Analyst workload & case history for ${alert.assignedTo}`,
                                });
                              }
                            }}
                            className="text-indigo-300 font-semibold hover:underline cursor-pointer flex items-center gap-1"
                            title="Drilldown into this analyst workload"
                          >
                            <span>{alert.assignedTo}</span>
                          </button>
                        </div>

                        <span className="text-slate-500">•</span>

                        <span className="text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{alert.timestamp}</span>
                        </span>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0 md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                      {/* AI Dossier / Report */}
                      <button
                        type="button"
                        onClick={() => onSelectAlertForReport(alert)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-950/40 transition-all"
                        title="View Executive AI Triage Dossier with root-cause analysis"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>AI Report</span>
                      </button>

                      {/* Claim Alert */}
                      {alert.status !== 'Closed' && !alert.status.includes('Claimed') && (
                        <button
                          type="button"
                          onClick={() => onClaimAlert(alert.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                          title="Claim case into your personal queue"
                        >
                          <Check className="w-3 h-3" />
                          <span>Claim</span>
                        </button>
                      )}

                      {/* Send to Tuning */}
                      {onSendToTuning && !alert.tuningFlagged && (
                        <button
                          type="button"
                          onClick={() => onSendToTuning(alert.id, `Flagged from ${filterContext.label} drilldown view`)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                          title="Flag to Alert Fatigue & Rule Tuning Engine"
                        >
                          <Sliders className="w-3 h-3" />
                          <span>Tuning</span>
                        </button>
                      )}

                      {/* Close Alert */}
                      {onCloseAlert && alert.status !== 'Closed' && (
                        <button
                          type="button"
                          onClick={() => onCloseAlert(alert.id, 'Benign', `Dispositioned during ${filterContext.label} drilldown audit`)}
                          className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer border border-slate-700"
                          title="Close as benign"
                        >
                          Close
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center space-y-3 bg-slate-950/40 rounded-xl border border-dashed border-slate-800">
              <Shield className="w-10 h-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-white uppercase font-mono">No Matching Cases Found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                No alerts or cases match the current filter criteria for &ldquo;{filterContext.label}&rdquo;.
                Try clearing search terms or selecting a different severity/platform filter.
              </p>
              {(searchQuery || severityFilter !== 'all' || platformFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSeverityFilter('all');
                    setPlatformFilter('all');
                    setStatusFilter('all');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold cursor-pointer"
                >
                  Reset Secondary Filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>
            Perspective: <strong className="text-white">{filterContext.label}</strong> ({filteredAndSortedAlerts.length} shown)
          </span>
          <div className="flex items-center gap-3">
            <span className="text-slate-500">Press ESC or click close to exit</span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer font-sans"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

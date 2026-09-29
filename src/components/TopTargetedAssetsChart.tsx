import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  Cell,
} from 'recharts';
import {
  Server,
  ShieldAlert,
  HardDrive,
  Cpu,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Download,
  Filter,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Flame,
  Activity,
  Layers,
  Wrench,
  Radio,
} from 'lucide-react';
import { Client, Alert } from '../types/soc';
import { DrilldownFilterContext } from './DrilldownResultsModal';

export interface TargetedAsset {
  id: string;
  name: string;
  fqdn: string;
  ip: string;
  client: string;
  clientId: string;
  role: string;
  environment: 'Active Directory / Identity' | 'Industrial SCADA / OT' | 'Healthcare DB / EHR' | 'Cloud Edge / Ingress' | 'Cloud IdP & SSO';
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  totalAlerts7d: number;
  hardeningUrgency: 'URGENT' | 'HIGH' | 'ELEVATED';
  riskScore: number;
  topVector: string;
  cves: string[];
  recommendedFix: string;
  blastRadius: string;
  dailyTimeline: { day: string; count: number }[];
}

interface TopTargetedAssetsChartProps {
  selectedClientId: string;
  clients: Client[];
  alerts?: Alert[];
  onOpenDrilldown?: (context: DrilldownFilterContext) => void;
  onShowToast?: (msg: string) => void;
}

const ALL_TARGETED_ASSETS: TargetedAsset[] = [
  {
    id: 'asset-dc-01',
    name: 'DC-APX-01',
    fqdn: 'dc-apx-01.apex.corp',
    ip: '10.100.4.12',
    client: 'Apex Financial Group',
    clientId: 'c1',
    role: 'Tier-0 Primary Active Directory Domain Controller & Kerberos KDC',
    environment: 'Active Directory / Identity',
    criticalAlerts: 48,
    highAlerts: 64,
    mediumAlerts: 24,
    lowAlerts: 6,
    totalAlerts7d: 142,
    hardeningUrgency: 'URGENT',
    riskScore: 98,
    topVector: 'Mimikatz DCSync credential dumping & Kerberoasting',
    cves: ['CVE-2022-26923', 'CVE-2021-42287'],
    recommendedFix: 'Enforce AES-256 Kerberos armoring, revoke unprivileged DRSUAPI replication permissions, deploy honeypot SPNs, and apply Microsoft KB5008380 PAC signature validation.',
    blastRadius: 'Complete Active Directory Forest Compromise (Tier-0 Domain Admins & 14,000 corporate identities)',
    dailyTimeline: [
      { day: 'Sep 22', count: 12 },
      { day: 'Sep 23', count: 18 },
      { day: 'Sep 24', count: 26 },
      { day: 'Sep 25', count: 22 },
      { day: 'Sep 26', count: 31 },
      { day: 'Sep 27', count: 21 },
      { day: 'Sep 28', count: 12 },
    ],
  },
  {
    id: 'asset-scada-04',
    name: 'AER-SCADA-PLC04',
    fqdn: 'aer-scada-plc04.aerotech.internal',
    ip: '192.168.40.18',
    client: 'AeroTech Defense Corp',
    clientId: 'c3',
    role: 'SCADA / OT Core Programmable Logic Controller (Turbine Unit 4)',
    environment: 'Industrial SCADA / OT',
    criticalAlerts: 39,
    highAlerts: 45,
    mediumAlerts: 18,
    lowAlerts: 6,
    totalAlerts7d: 108,
    hardeningUrgency: 'URGENT',
    riskScore: 95,
    topVector: 'Unauthorized Modbus function 16 writes & SCADA firmware tampering',
    cves: ['CVE-2023-38001', 'CVE-2022-29951'],
    recommendedFix: 'Isolate OT VLAN 40 via physical unidirectional data diodes, enable cryptographic firmware verification on PLC microcode, and restrict Modbus TCP port 502 to dedicated HMI jumphosts.',
    blastRadius: 'Turbine Governor Over-speed & Physical Plant Outage (Defense propulsion test line shutdown)',
    dailyTimeline: [
      { day: 'Sep 22', count: 8 },
      { day: 'Sep 23', count: 14 },
      { day: 'Sep 24', count: 19 },
      { day: 'Sep 25', count: 24 },
      { day: 'Sep 26', count: 20 },
      { day: 'Sep 27', count: 13 },
      { day: 'Sep 28', count: 10 },
    ],
  },
  {
    id: 'asset-ehr-02',
    name: 'NEX-EHR-DB02',
    fqdn: 'nex-ehr-db02.nexushealth.org',
    ip: '172.16.88.45',
    client: 'Nexus Health Systems',
    clientId: 'c2',
    role: 'Tier-1 HIPAA Clinical Records Production Database (MS SQL 2022)',
    environment: 'Healthcare DB / EHR',
    criticalAlerts: 22,
    highAlerts: 42,
    mediumAlerts: 16,
    lowAlerts: 4,
    totalAlerts7d: 84,
    hardeningUrgency: 'HIGH',
    riskScore: 91,
    topVector: 'Blind SQL injection & bulk EHR staging via service account',
    cves: ['CVE-2023-23397', 'CVE-2023-36884'],
    recommendedFix: 'Implement Transparent Data Encryption (TDE) with external HSM, mandate parameterized stored procedures, and enable Guardium database activity monitoring on SELECT queries exceeding 500 rows.',
    blastRadius: 'HIPAA Protected Health Information Breach (840,000 patient records exposed to exfiltration)',
    dailyTimeline: [
      { day: 'Sep 22', count: 6 },
      { day: 'Sep 23', count: 9 },
      { day: 'Sep 24', count: 14 },
      { day: 'Sep 25', count: 18 },
      { day: 'Sep 26', count: 16 },
      { day: 'Sep 27', count: 12 },
      { day: 'Sep 28', count: 9 },
    ],
  },
  {
    id: 'asset-k8s-ingress',
    name: 'AER-K8S-INGRESS',
    fqdn: 'aer-k8s-ingress.aerotech.internal',
    ip: '34.120.91.205',
    client: 'AeroTech Defense Corp',
    clientId: 'c3',
    role: 'Edge Kubernetes Ingress Controller & Public Envoy Proxy',
    environment: 'Cloud Edge / Ingress',
    criticalAlerts: 15,
    highAlerts: 31,
    mediumAlerts: 17,
    lowAlerts: 4,
    totalAlerts7d: 67,
    hardeningUrgency: 'HIGH',
    riskScore: 84,
    topVector: 'HTTP/2 Rapid Reset DoS & Directory Traversal Fuzzing',
    cves: ['CVE-2023-44487', 'CVE-2023-48795'],
    recommendedFix: 'Enforce Cloud Armor rate-limiting filters on HTTP/2 RST stream frames, restrict Envoy debug endpoints to internal cluster IPs, and mandate mutual TLS (mTLS) for backend microservice pods.',
    blastRadius: 'Supply-Chain Logistics API Outage & Container Cluster Lateral Movement',
    dailyTimeline: [
      { day: 'Sep 22', count: 7 },
      { day: 'Sep 23', count: 8 },
      { day: 'Sep 24', count: 11 },
      { day: 'Sep 25', count: 14 },
      { day: 'Sep 26', count: 12 },
      { day: 'Sep 27', count: 9 },
      { day: 'Sep 28', count: 6 },
    ],
  },
  {
    id: 'asset-iam-broker',
    name: 'APX-IAM-BROKER',
    fqdn: 'apx-iam-broker.apexfin.com',
    ip: '52.188.74.19',
    client: 'Nexus Health Systems',
    clientId: 'c1',
    role: 'Identity & Access Broker (Entra ID / Okta Federation Bridge)',
    environment: 'Cloud IdP & SSO',
    criticalAlerts: 12,
    highAlerts: 23,
    mediumAlerts: 14,
    lowAlerts: 4,
    totalAlerts7d: 53,
    hardeningUrgency: 'ELEVATED',
    riskScore: 78,
    topVector: 'Distributed Password Spraying & Refresh Token Session Hijacking',
    cves: ['CVE-2024-21413', 'CVE-2023-38545'],
    recommendedFix: 'Deploy Conditional Access strict location fencing, require Phishing-Resistant FIDO2 WebAuthn keys for administrative roles, and shorten OAuth refresh token lifespans to 60 minutes.',
    blastRadius: 'Multi-Tenant Cloud Workspace Takeover (Administrative impersonation across 12 SaaS suites)',
    dailyTimeline: [
      { day: 'Sep 22', count: 5 },
      { day: 'Sep 23', count: 7 },
      { day: 'Sep 24', count: 9 },
      { day: 'Sep 25', count: 11 },
      { day: 'Sep 26', count: 10 },
      { day: 'Sep 27', count: 7 },
      { day: 'Sep 28', count: 4 },
    ],
  },
];

export const TopTargetedAssetsChart: React.FC<TopTargetedAssetsChartProps> = ({
  selectedClientId,
  clients,
  alerts,
  onOpenDrilldown,
  onShowToast,
}) => {
  const [viewMode, setViewMode] = useState<'stacked-bars' | 'trend-lines' | 'summary-table'>('stacked-bars');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('asset-dc-01');
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'urgent' | 'high'>('all');

  // Filter assets based on selected client scope
  const filteredAssets = useMemo(() => {
    let list = ALL_TARGETED_ASSETS;
    if (selectedClientId !== 'all') {
      const match = list.filter((a) => a.clientId === selectedClientId);
      list = match.length > 0 ? match : list.slice(0, 3);
    }
    if (urgencyFilter === 'urgent') {
      list = list.filter((a) => a.hardeningUrgency === 'URGENT');
    } else if (urgencyFilter === 'high') {
      list = list.filter((a) => a.hardeningUrgency === 'URGENT' || a.hardeningUrgency === 'HIGH');
    }
    return list.slice(0, 5);
  }, [selectedClientId, urgencyFilter]);

  const selectedAsset = useMemo(() => {
    return (
      filteredAssets.find((a) => a.id === selectedAssetId) ||
      filteredAssets[0] ||
      ALL_TARGETED_ASSETS[0]
    );
  }, [filteredAssets, selectedAssetId]);

  // Aggregate 7-day stats
  const aggregateMetrics = useMemo(() => {
    const totalAttacks = filteredAssets.reduce((acc, a) => acc + a.totalAlerts7d, 0);
    const criticalAttacks = filteredAssets.reduce((acc, a) => acc + a.criticalAlerts, 0);
    const highAttacks = filteredAssets.reduce((acc, a) => acc + a.highAlerts, 0);
    const highestRisk = filteredAssets[0];
    return {
      totalAttacks,
      criticalAttacks,
      highAttacks,
      highestRisk,
    };
  }, [filteredAssets]);

  // Daily timeline combined for line chart view
  const combinedTimeline = useMemo(() => {
    const days = ['Sep 22', 'Sep 23', 'Sep 24', 'Sep 25', 'Sep 26', 'Sep 27', 'Sep 28'];
    return days.map((day) => {
      const entry: any = { day };
      filteredAssets.forEach((asset) => {
        const point = asset.dailyTimeline.find((t) => t.day === day);
        entry[asset.name] = point ? point.count : 0;
      });
      return entry;
    });
  }, [filteredAssets]);

  const clientScopeLabel =
    selectedClientId === 'all'
      ? 'All Enterprise Clients'
      : clients.find((c) => c.id === selectedClientId)?.name || selectedClientId;

  // Export Hardening Dossier CSV
  const handleExportCsv = () => {
    const headers = [
      'Rank',
      'Asset Name',
      'FQDN',
      'IP Address',
      'Client',
      'Environment Role',
      'Hardening Urgency',
      'Risk Score',
      '7-Day Total Attacks',
      'Critical Alerts',
      'High Alerts',
      'Medium Alerts',
      'Top Threat Vector',
      'Targeted CVEs',
      'Recommended Hardening Directive',
      'Breach Blast Radius',
    ];

    const rows = filteredAssets.map((a, i) => [
      i + 1,
      `"${a.name}"`,
      `"${a.fqdn}"`,
      `"${a.ip}"`,
      `"${a.client}"`,
      `"${a.role}"`,
      a.hardeningUrgency,
      a.riskScore,
      a.totalAlerts7d,
      a.criticalAlerts,
      a.highAlerts,
      a.mediumAlerts,
      `"${a.topVector}"`,
      `"${a.cves.join('; ')}"`,
      `"${a.recommendedFix}"`,
      `"${a.blastRadius}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `top_targeted_assets_hardening_7d_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowToast) {
      onShowToast('Top 5 targeted assets hardening dossier successfully exported to CSV.');
    }
  };

  // Custom Tooltip for Stacked Bar Chart
  const CustomBarTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const assetData: TargetedAsset = payload[0].payload;

    return (
      <div className="bg-slate-950/95 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl backdrop-blur-md font-mono text-xs max-w-sm z-50">
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
          <div className="flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-bold text-white">{assetData.name}</span>
          </div>
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
              assetData.hardeningUrgency === 'URGENT'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
          >
            {assetData.hardeningUrgency} PRIORITY
          </span>
        </div>

        <div className="mt-2 space-y-1 text-[11px]">
          <div className="text-slate-300">
            <span className="text-slate-500">Role:</span> {assetData.role}
          </div>
          <div className="text-slate-400">
            <span className="text-slate-500">Client:</span> {assetData.client}
          </div>
          <div className="text-cyan-300">
            <span className="text-slate-500">IP / FQDN:</span> {assetData.ip} ({assetData.fqdn})
          </div>
        </div>

        <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-1 text-[11px]">
          <div className="text-white font-bold flex justify-between">
            <span>7-Day Influx:</span>
            <span className="text-cyan-400">{assetData.totalAlerts7d} Attacks</span>
          </div>
          <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] text-center">
            <div className="bg-rose-950/40 border border-rose-800/40 text-rose-300 rounded p-1">
              Crit: {assetData.criticalAlerts}
            </div>
            <div className="bg-orange-950/40 border border-orange-800/40 text-orange-300 rounded p-1">
              High: {assetData.highAlerts}
            </div>
            <div className="bg-yellow-950/40 border border-yellow-800/40 text-yellow-300 rounded p-1">
              Med: {assetData.mediumAlerts}
            </div>
          </div>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
          <span className="text-emerald-400 font-semibold">Priority Fix:</span> {assetData.recommendedFix.slice(0, 110)}...
        </div>
      </div>
    );
  };

  const assetLineColors = ['#ef4444', '#f97316', '#10b981', '#06b6d4', '#8b5cf6'];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl relative overflow-hidden space-y-5">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-10 w-96 h-40 bg-gradient-to-l from-rose-500/10 via-amber-500/5 to-transparent blur-3xl pointer-events-none" />

      {/* Header and Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-950 to-amber-950 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-950/40">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base md:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Top 5 Most Targeted Assets</span>
                <span className="text-slate-400 font-normal text-xs md:text-sm">(Last 7 Days)</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-400 animate-pulse" />
                <span>HARDENING DIRECTIVE</span>
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                RECHARTS TELEMETRY
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-vector correlation identifying high-value infrastructure under concentrated adversary pressure across <strong className="text-slate-200">{clientScopeLabel}</strong>.
            </p>
          </div>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Urgency Filter */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setUrgencyFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                urgencyFilter === 'all'
                  ? 'bg-rose-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ALL (5)
            </button>
            <button
              type="button"
              onClick={() => setUrgencyFilter('urgent')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                urgencyFilter === 'urgent'
                  ? 'bg-rose-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              URGENT ONLY
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setViewMode('stacked-bars')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                viewMode === 'stacked-bars'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Stacked severity distribution by asset"
            >
              SEVERITY BARS
            </button>
            <button
              type="button"
              onClick={() => setViewMode('trend-lines')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                viewMode === 'trend-lines'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="7-day daily attack surge curves"
            >
              SURGE CURVES
            </button>
            <button
              type="button"
              onClick={() => setViewMode('summary-table')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-bold ${
                viewMode === 'summary-table'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Tabular hardening scorecard view"
            >
              HARDENING DOSSIER
            </button>
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            title="Download Top 5 Assets Hardening Checklist as CSV"
          >
            <Download className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Export Plan</span>
          </button>
        </div>
      </div>

      {/* Quick Telemetry KPI Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-mono uppercase font-semibold">7-Day Concentrated Influx</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{aggregateMetrics.totalAttacks} Attacks</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Flame className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-mono uppercase font-semibold">Critical Threat Surge</div>
            <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">{aggregateMetrics.criticalAttacks} Criticals</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-mono uppercase font-semibold">Highest Exposure Node</div>
            <div className="text-sm font-bold font-mono text-cyan-300 mt-0.5 truncate">{aggregateMetrics.highestRisk?.name || 'DC-APX-01'}</div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
            {aggregateMetrics.highestRisk?.riskScore || 98}/100
          </span>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] text-slate-400 font-mono uppercase font-semibold">Dominant Exploit Vector</div>
            <div className="text-xs font-bold font-mono text-amber-300 mt-0.5 truncate">DCSync &amp; Modbus Write</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Wrench className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Visualization Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Recharts Chart Area (7 Columns on large screens) */}
        <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-2xl p-4 shadow-inner space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-slate-800/80">
            <span className="flex items-center gap-1.5 font-bold text-white">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {viewMode === 'stacked-bars'
                  ? '7-Day Attack Volume Categorized by Severity'
                  : viewMode === 'trend-lines'
                  ? '7-Day Daily Attack Influx Surge Trajectory'
                  : 'Targeted Infrastructure Scorecard'}
              </span>
            </span>

            <span className="text-[10px] text-slate-500">Click asset bar to inspect hardening directive</span>
          </div>

          {viewMode === 'stacked-bars' && (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredAssets}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 35, bottom: 5 }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload.length) {
                      setSelectedAssetId(state.activePayload[0].payload.id);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#64748b"
                    tick={{ fill: '#e2e8f0', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }}
                    tickLine={false}
                    axisLine={false}
                    width={110}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                    iconType="circle"
                  />
                  <Bar
                    dataKey="criticalAlerts"
                    name="Critical Tier"
                    stackId="severity"
                    fill="#ef4444"
                    radius={[0, 0, 0, 0]}
                    cursor="pointer"
                  >
                    {filteredAssets.map((entry) => (
                      <Cell
                        key={`crit-${entry.id}`}
                        fill={entry.id === selectedAsset.id ? '#ff4d4d' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="highAlerts"
                    name="High Tier"
                    stackId="severity"
                    fill="#f97316"
                    radius={[0, 0, 0, 0]}
                    cursor="pointer"
                  />
                  <Bar
                    dataKey="mediumAlerts"
                    name="Medium Tier"
                    stackId="severity"
                    fill="#eab308"
                    radius={[0, 0, 0, 0]}
                    cursor="pointer"
                  />
                  <Bar
                    dataKey="lowAlerts"
                    name="Low Tier"
                    stackId="severity"
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                    cursor="pointer"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {viewMode === 'trend-lines' && (
            <div className="w-full h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combinedTimeline} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="day"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                    iconType="plainline"
                  />
                  {filteredAssets.map((asset, index) => (
                    <Line
                      key={asset.id}
                      type="monotone"
                      dataKey={asset.name}
                      name={asset.name}
                      stroke={assetLineColors[index % assetLineColors.length]}
                      strokeWidth={asset.id === selectedAsset.id ? 3 : 1.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {viewMode === 'summary-table' && (
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/90 text-slate-400 text-[10px] uppercase border-b border-slate-800 sticky top-0">
                  <tr>
                    <th className="p-2.5">Asset</th>
                    <th className="p-2.5">Environment</th>
                    <th className="p-2.5 text-center">7D Influx</th>
                    <th className="p-2.5">Urgency</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredAssets.map((asset) => (
                    <tr
                      key={asset.id}
                      onClick={() => setSelectedAssetId(asset.id)}
                      className={`hover:bg-slate-900/80 transition-colors cursor-pointer ${
                        asset.id === selectedAsset.id ? 'bg-cyan-950/30' : ''
                      }`}
                    >
                      <td className="p-2.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5 text-cyan-400" />
                          <span>{asset.name}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{asset.ip}</div>
                      </td>
                      <td className="p-2.5 text-slate-300 text-[11px]">{asset.environment}</td>
                      <td className="p-2.5 text-center">
                        <span className="font-bold text-cyan-300">{asset.totalAlerts7d}</span>
                        <div className="text-[9px] text-rose-400 font-semibold">{asset.criticalAlerts} crit</div>
                      </td>
                      <td className="p-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            asset.hardeningUrgency === 'URGENT'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {asset.hardeningUrgency}
                        </span>
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAssetId(asset.id);
                          }}
                          className="text-cyan-400 hover:text-cyan-300 text-[11px] underline"
                        >
                          Hardening Plan →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Quick asset pill selector below chart */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800/80 flex-wrap">
            <span className="text-[10px] font-mono text-slate-500 mr-1">Select Asset:</span>
            {filteredAssets.map((asset) => (
              <button
                key={asset.id}
                type="button"
                onClick={() => setSelectedAssetId(asset.id)}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
                  asset.id === selectedAsset.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    asset.hardeningUrgency === 'URGENT' ? 'bg-rose-500' : 'bg-amber-400'
                  }`}
                />
                <span>{asset.name}</span>
                <span className="text-[9px] text-slate-500">({asset.totalAlerts7d})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Priority Hardening Action Dossier (5 Columns) */}
        <div className="lg:col-span-5 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 md:p-5 shadow-lg space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold border ${
                    selectedAsset.hardeningUrgency === 'URGENT'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  }`}
                >
                  {selectedAsset.hardeningUrgency} HARDENING
                </span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                  Risk: {selectedAsset.riskScore}/100
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1.5 flex items-center gap-1.5">
                <Server className="w-4 h-4 text-cyan-400" />
                <span>{selectedAsset.name}</span>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {selectedAsset.fqdn} • {selectedAsset.ip}
              </p>
            </div>

            <div className="text-right">
              <span className="text-2xl font-bold font-mono text-rose-400">{selectedAsset.totalAlerts7d}</span>
              <span className="text-[10px] text-slate-400 block font-mono">7D Influx</span>
            </div>
          </div>

          {/* Asset Role & Environment */}
          <div className="space-y-1 text-xs">
            <span className="text-[10px] uppercase font-mono text-slate-500 font-semibold">Infrastructure Role</span>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-medium">
              {selectedAsset.role}
            </div>
          </div>

          {/* Primary Adversary Exploit Vector */}
          <div className="space-y-1 text-xs">
            <span className="text-[10px] uppercase font-mono text-rose-400 font-semibold flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              <span>Active Adversary Vector</span>
            </span>
            <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-rose-200 text-xs">
              {selectedAsset.topVector}
            </div>
          </div>

          {/* Targeted CVE Vulnerabilities */}
          <div className="space-y-1 text-xs">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-semibold">Exploited CVEs</span>
            <div className="flex flex-wrap gap-1.5">
              {selectedAsset.cves.map((cve) => (
                <span
                  key={cve}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-[11px] font-semibold"
                >
                  {cve}
                </span>
              ))}
            </div>
          </div>

          {/* Actionable Hardening Directive */}
          <div className="space-y-1.5 text-xs">
            <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Recommended Priority Hardening</span>
            </span>
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 text-emerald-200 leading-relaxed text-xs">
              {selectedAsset.recommendedFix}
            </div>
          </div>

          {/* Blast Radius Warning */}
          <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-[11px] text-amber-300 space-y-0.5">
            <div className="font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Potential Breach Blast Radius:</span>
            </div>
            <p className="text-slate-300 text-[11px]">{selectedAsset.blastRadius}</p>
          </div>

          {/* CTAs */}
          <div className="pt-2 flex items-center gap-2">
            {onOpenDrilldown && (
              <button
                type="button"
                onClick={() =>
                  onOpenDrilldown({
                    type: 'custom',
                    value: selectedAsset.name,
                    label: `Correlated Attacks on ${selectedAsset.name}`,
                    subtitle: `7-Day attack chain telemetry for ${selectedAsset.fqdn}`,
                    count: selectedAsset.totalAlerts7d,
                  })
                }
                className="flex-1 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-cyan-950/50"
              >
                <span>Drilldown Asset ({selectedAsset.totalAlerts7d})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs font-mono flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
              title="Download Hardening Spec"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Plan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

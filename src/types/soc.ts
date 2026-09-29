export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';

export type AlertStatus =
  | 'New'
  | 'Acknowledged'
  | 'In Progress (FusionAI Investigating)'
  | 'In Progress (Analyst Claimed)'
  | 'In Progress (SLA Breach Risk)'
  | 'Pending Review'
  | 'Escalated'
  | 'Closed';

export type AnalystTier = 'Tier 1 Triage' | 'Tier 2 Incident Responder' | 'Tier 3 Threat Hunter';

export type SecurityPlatform =
  | 'Google SecOps'
  | 'Splunk'
  | 'Exabeam'
  | 'CrowdStrike'
  | 'Microsoft Defender'
  | 'Entra ID'
  | 'Zscaler'
  | 'ServiceNow'
  | 'Swimlane';

export interface Client {
  id: string;
  name: string;
  code: string;
  industry: string;
  criticality: 'Critical' | 'High' | 'Medium';
  activeAlerts: number;
  openIncidents: number;
  activeWip: number;
  slaBreachRisk: number;
  assignedAnalystsCount: number;
  logoColor: string;
}

export interface AnalystAging {
  lessThan2h: number;
  twoToFourH: number;
  fourToEightH: number;
  eightToTwentyFourH: number;
  moreThan24h: number;
}

export interface ClientAlertDistribution {
  clientId: string;
  clientName: string;
  shortName: string;
  alertsPicked: number;
  critical: number;
  high: number;
  medium?: number;
  low?: number;
  color: string;
}

export interface AssignedClientInfo {
  id: string;
  name: string;
  shortName: string;
  code: string;
  color: string;
}

export interface Analyst {
  id: string;
  name: string;
  email: string;
  avatar: string;
  client: string;
  clientId: string;
  clientIds?: string[];
  assignedClients?: AssignedClientInfo[];
  clientAlertLoads?: ClientAlertDistribution[];
  tier: AnalystTier;
  shift: string;
  status: 'Active' | 'Investigating' | 'Standby';
  totalAlerts: number;
  wip: number;
  assigned: number;
  pending: number;
  escalated: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  slaRisk: number;
  aging: AnalystAging;
  skills: string[];
  avgResolutionTimeMin: number;
  isAiInvestigator?: boolean;
  currentFocus?: string;
  activeInProgressCases?: {
    id: string;
    ticketNumber?: string;
    caseNumber?: string;
    title: string;
    severity: SeverityLevel;
    durationMinutes: number;
    slaDeadlineMin: number;
    platform: SecurityPlatform;
    client?: string;
    clientId?: string;
    clientShort?: string;
  }[];
}

export interface SocShift {
  id: string;
  name: string;
  code: string;
  hours: string;
  status: 'Active' | 'Upcoming' | 'Completed';
  analystsCount: number;
  analystsPerClient: number;
  totalClients: number;
  leadSupervisor: string;
}

/**
 * Normalized Common Security Event Model (CEM)
 * Standardized across Google SecOps, Splunk, Exabeam, EDR, Network, ITSM
 */
export interface CommonSecurityEvent {
  event_id: string;
  timestamp: string;
  source_platform: SecurityPlatform;
  event_type: string;
  severity: SeverityLevel;
  user: string;
  user_email: string;
  hostname: string;
  source_ip: string;
  destination_ip: string;
  domain: string;
  file_hash: string;
  application: string;
  action: string;
  client: string;
  asset_criticality: 'Tier 0 (Domain Controller)' | 'Tier 1 (PCI/Database)' | 'Tier 2 (Workstation)' | 'Tier 3 (Cloud Edge)';
  raw_event: string;
}

export interface VirusTotalAnalysis {
  sha256: string;
  md5?: string;
  detectionRatio: string;
  maliciousCount: number;
  totalVendors: number;
  verdict: 'Malicious' | 'Suspicious' | 'Clean' | 'Unknown';
  malwareFamily: string;
  firstSeen?: string;
  sandboxVerdict?: string;
}

export interface DomainReputationAnalysis {
  domain: string;
  reputationVerdict: 'Malicious' | 'Suspicious' | 'Clean' | 'Newly Registered';
  threatScore: number;
  registrar: string;
  creationAge: string;
  dnsDetails: string;
  threatCategory: string;
}

export interface IpReputationAnalysis {
  ip: string;
  reputationVerdict: 'High Risk' | 'Suspicious' | 'Clean' | 'Known Tor Exit';
  asn: string;
  country: string;
  city?: string;
  abuseConfidenceScore: number;
  threatCategory: string;
}

export interface SymantecSiteReviewAnalysis {
  targetUrlOrDomain: string;
  primaryCategory: string;
  secondaryCategory?: string;
  securityRisk: 'High Risk' | 'Suspicious' | 'Benign' | 'Uncategorized';
  threatClassification: string;
  filteringPolicy: string;
}

export interface AnalysisResultSection {
  hashAnalysis: VirusTotalAnalysis;
  domainReputation: DomainReputationAnalysis;
  ipAnalysis: IpReputationAnalysis;
  symantecSiteReview: SymantecSiteReviewAnalysis;
  technicalDetails?: string;
}

export interface HistoricalAlertMatch {
  alertId: string;
  title: string;
  timestamp: string;
  relativeTime?: string;
  severity: SeverityLevel;
  client: string;
  source_platform: SecurityPlatform;
  isHistoricalClosed: boolean;
  status: string;
  closureResult: 'Benign' | 'True Positive' | 'False Positive' | 'Open / In-Progress';
  closureCategory?: string;
  closedBy?: string;
  closureTimestamp?: string;
  resolutionNotes: string;
  matchedBy: {
    type: 'Same User' | 'Key Indicator (IP)' | 'Key Indicator (Domain)' | 'Key Indicator (Hash)' | 'Key Indicator (Host)' | 'Correlated Incident';
    value: string;
    details?: string;
  }[];
  actionsTaken?: string[];
  incidentId?: string;
}

export interface HistoricalAlertCorrelationSection {
  hasMatches: boolean;
  totalMatches: number;
  truePositiveCount: number;
  benignCount: number;
  activeCount: number;
  summaryVerdict: string;
  matchedAlerts: HistoricalAlertMatch[];
}

export interface ExecutiveTriageReport {
  when: {
    trigger: string;
    scope: string;
    timestamp: string;
    affectedAssets: string[];
    affectedUsers: string[];
  };
  keyIndicators: {
    iocSummary: string;
    indicators: { type: 'Hash' | 'IP' | 'Domain' | 'Command' | 'Identity'; value: string; note: string }[];
    mitreTechniques: { id: string; name: string; tactic: string }[];
  };
  impactAssessment: {
    criticalityTier: string;
    businessImpact: string;
    dataAtRisk: string;
    blastRadius: string;
    riskLevel: SeverityLevel;
  };
  analysisResult: AnalysisResultSection;
  conclusionAndAction: {
    verdict: string;
    conclusion: string;
    immediateActions: string[];
    containmentStatus: string;
  };
  historicalCorrelation?: HistoricalAlertCorrelationSection;
}

export interface AiAnalysisReport {
  summary: string;
  triageReport?: ExecutiveTriageReport;
  riskScore: number;
  confidence: number;
  correlatedPlatforms: SecurityPlatform[];
  contributingFactors: { label: string; points: number }[];
  correlationReason: string;
  attackTechniques: { id: string; name: string; tactic: string }[];
  suggestedPlaybooks: string[];
  isClaimableByAnalyst: boolean;
  generatedAt: string;
}

export interface Alert {
  id: string;
  ticketNumber?: string;
  caseNumber?: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  status: AlertStatus;
  timestamp: string;
  client: string;
  clientId: string;
  source_platform: SecurityPlatform;
  assignedTo: string;
  assignedToId: string;
  assignedAnalyst?: string;
  routedTo: 'FusionAI' | 'Human Analyst';
  initialAckBy: 'FusionAI' | 'Human Analyst' | 'Unacknowledged';
  initialAckTimestamp?: string;
  aiReport?: AiAnalysisReport;
  claimedByAnalystId?: string;
  claimedByAnalystName?: string;
  claimedTimestamp?: string;
  slaDeadline: string;
  slaRisk: boolean;
  agingHours: number;
  mitreTactic: string;
  entityUser?: string;
  entityHost?: string;
  entityIp?: string;
  correlatedIncidentId?: string;
  tuningFlagged?: boolean;
  tuningReason?: string;
  closureReason?: 'Benign' | 'False Positive' | 'True Positive';
  resolutionNotes?: string;
  escalatedTo?: 'Client Team' | 'T3 / SME' | string;
  escalationTarget?: string;
  escalationReason?: string;
  escalationUrgency?: 'Standard' | 'High' | 'Emergency';
  escalationActionRequired?: string;
  escalationTimestamp?: string;
  handoverNotes?: string;
  handoverPriority?: 'P1 - Immediate Review' | 'P2 - Active Monitoring' | 'P3 - Routine';
  incomingActionRequired?: string;
  outgoingAnalystComments?: string;
}

export interface AttackStoryStep {
  time: string;
  event: string;
  platform: SecurityPlatform;
  isAiAssessment: boolean;
  tactic: string;
  techniqueId: string;
}

export interface SimilarIncident {
  id: string;
  title: string;
  date: string;
  similarity: number;
  matchedFactors: string[];
  pastDisposition: 'True Positive - Contained' | 'False Positive - Tuned' | 'Benign Activity';
  resolutionTimeMin: number;
  pastActions: string[];
  client: string;
}

export interface Incident {
  id: string;
  title: string;
  client: string;
  clientId: string;
  severity: SeverityLevel;
  status: 'Open' | 'In Progress' | 'Pending SOAR Execution' | 'Resolved';
  riskScore: number;
  confidence: number;
  contributingFactors: { label: string; points: number }[];
  correlationExplanation: string;
  attackStoryNarrative: AttackStoryStep[];
  mitreChain: { phase: string; techniqueId: string; name: string }[];
  events: CommonSecurityEvent[];
  affectedEntities: {
    users: string[];
    ips: string[];
    devices: string[];
    processes: string[];
    domains: string[];
    hashes: string[];
  };
  similarIncidents: SimilarIncident[];
  assignedAnalyst: string;
  assignedAnalystTier: string;
  servicenowCaseId?: string;
  swimlaneExecutionStatus?: 'Ready' | 'Pending Approval' | 'Executing' | 'Completed';
}

export interface AttackGraphNode {
  id: string;
  type: 'user' | 'ip' | 'device' | 'process' | 'network' | 'application' | 'incident';
  label: string;
  sublabel: string;
  platform: SecurityPlatform;
  risk: 'critical' | 'high' | 'medium' | 'low' | 'neutral';
  x: number;
  y: number;
  evidenceCount: number;
  evidenceData: any[];
}

export interface AttackGraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  isSuspicious: boolean;
}

export interface DetectionRuleFatigue {
  id: string;
  ruleName: string;
  name?: string;
  ruleId: string;
  platform: SecurityPlatform;
  totalAlerts24h: number;
  benignClosed: number;
  duplicates: number;
  truePositives: number;
  noiseRatio: number;
  aiRecommendation: string;
  suggestedTuning: string;
  tuningApplied: boolean;
  category?: string;
  severity?: SeverityLevel;
  triggerCount7d?: number;
  falsePositiveRate?: number;
  noiseScore?: number;
  tuningRecommendation?: string;
  flaggedCount?: number;
}

export interface ServiceNowCaseDraft {
  ticketNumber?: string;
  title: string;
  description: string;
  client: string;
  severity: string;
  priority: string;
  affectedUser: string;
  affectedDevice: string;
  cmdbAssetId: string;
  assignedGroup: string;
  mitreTags: string[];
  aiInvestigationSummary: string;
  recommendedActions: string[];
  status: 'Draft' | 'Submitted' | 'Synchronized';
}

export interface SwimlaneAction {
  id: string;
  actionName: string;
  playbookName: string;
  targetEntity: string;
  targetType: 'User' | 'Host' | 'IP' | 'Session';
  impactLevel: 'High' | 'Medium' | 'Low';
  description: string;
  status: 'Awaiting Approval' | 'Approved' | 'Executing' | 'Completed' | 'Rejected';
  executionResult?: string;
  executedAt?: string;
}

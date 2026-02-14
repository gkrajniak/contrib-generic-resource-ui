// Known acronyms that should stay uppercase
const KNOWN_ACRONYMS = ['OIDC', 'URL', 'ID', 'CA', 'DNS', 'API', 'UI', 'UID', 'FGA', 'SSO', 'SAML', 'JWT', 'TLS', 'SSL', 'HTTP', 'HTTPS'];

export function humanizeFieldName(fieldName: string): string {
  const withSpaces = fieldName.replace(/([A-Z])/g, ' $1').trim();

  const withoutUnderscores = withSpaces.replace(/_/g, ' ');

  let result = withoutUnderscores
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // Fix known acronyms
  for (const acronym of KNOWN_ACRONYMS) {
    const regex = new RegExp(`\\b${acronym}\\b`, 'gi');
    result = result.replace(regex, acronym);
  }

  return result;
}

export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatTimestamp(timestamp: string | undefined): string {
  if (!timestamp) {
    return '-';
  }

  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch {
    return timestamp;
  }
}

export function formatRelativeTime(timestamp: string | undefined): string {
  if (!timestamp) {
    return '-';
  }

  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 0) {
      return `${diffDay}d ago`;
    }
    if (diffHour > 0) {
      return `${diffHour}h ago`;
    }
    if (diffMin > 0) {
      return `${diffMin}m ago`;
    }
    return 'Just now';
  } catch {
    return timestamp;
  }
}

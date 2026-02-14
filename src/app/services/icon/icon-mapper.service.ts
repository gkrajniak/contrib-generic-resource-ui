import { Injectable } from '@angular/core';

interface IconRule {
  keywords: string[];
  icon: string;
}

@Injectable({
  providedIn: 'root',
})
export class IconMapperService {
  private readonly DEFAULT_ICON = 'puzzle';

  // Rules are matched in order - more specific rules should come first
  private readonly ICON_RULES: IconRule[] = [
    // Authentication & Security (specific, check before generic terms)
    { keywords: ['oidc', 'oauth', 'sso', 'saml'], icon: 'locked' },
    { keywords: ['fga', 'openfga'], icon: 'shield' },
    { keywords: ['credential', 'secret', 'password', 'apikey'], icon: 'key' },
    { keywords: ['permission', 'rbac', 'acl', 'access', 'policy'], icon: 'shield' },
    { keywords: ['role', 'privilege'], icon: 'role' },

    // Infrastructure (specific terms)
    { keywords: ['clusterinfo', 'cluster'], icon: 'it-host' },
    { keywords: ['kubernetes', 'k8s', 'kcp'], icon: 'it-host' },
    { keywords: ['node', 'instance', 'vm', 'machine', 'server'], icon: 'it-instance' },
    { keywords: ['database', 'db', 'storage'], icon: 'database' },
    { keywords: ['network', 'dns', 'endpoint'], icon: 'world' },
    { keywords: ['cloud', 'provider', 'aws', 'azure', 'gcp'], icon: 'cloud' },

    // Relationships (check before generic "parent" could match elsewhere)
    { keywords: ['parentaccount', 'parent'], icon: 'navigation-up-arrow' },
    { keywords: ['child', 'children', 'nested', 'sub'], icon: 'navigation-down-arrow' },
    { keywords: ['reference', 'ref', 'link', 'relation'], icon: 'chain-link' },

    // Organization (check before account since org is more specific)
    { keywords: ['organization', 'org', 'company', 'enterprise', 'business'], icon: 'org-chart' },
    { keywords: ['team', 'group', 'members', 'users'], icon: 'group' },
    { keywords: ['tenant', 'workspace', 'space'], icon: 'building' },

    // Identity & Users (generic - checked later)
    { keywords: ['account', 'user', 'profile', 'member', 'customer', 'person'], icon: 'customer' },
    { keywords: ['auth', 'login', 'identity', 'token'], icon: 'locked' },

    // Configuration
    { keywords: ['config', 'configuration', 'setting', 'preference', 'option'], icon: 'settings' },
    { keywords: ['spec', 'specification', 'definition'], icon: 'document' },
    { keywords: ['status', 'state', 'health', 'condition'], icon: 'status-positive' },
    { keywords: ['metadata', 'meta', 'info', 'information'], icon: 'hint' },

    // Actions & Lifecycle
    { keywords: ['create', 'add', 'new'], icon: 'add' },
    { keywords: ['delete', 'remove'], icon: 'delete' },
    { keywords: ['update', 'edit', 'modify'], icon: 'edit' },
    { keywords: ['sync', 'reconcile', 'refresh'], icon: 'synchronize' },

    // Common objects
    { keywords: ['label', 'tag', 'annotation'], icon: 'tag' },
    { keywords: ['namespace', 'ns', 'scope'], icon: 'folder' },
    { keywords: ['resource', 'object', 'item'], icon: 'document' },
    { keywords: ['list', 'array', 'collection'], icon: 'list' },
    { keywords: ['client', 'application', 'app'], icon: 'sys-monitor' },
    { keywords: ['url', 'host'], icon: 'world' },
    { keywords: ['data'], icon: 'database' },
  ];

  getIconForField(fieldName: string, typeName?: string, description?: string): string {
    const searchText = [fieldName, typeName, description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    for (const rule of this.ICON_RULES) {
      if (rule.keywords.some((kw) => searchText.includes(kw))) {
        return rule.icon;
      }
    }

    return this.DEFAULT_ICON;
  }
}

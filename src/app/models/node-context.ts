import { ResourceDefinition } from './resource';

export interface PortalContext {
  crdGatewayApiUrl: string;
  kcpWorkspaceUrl?: string;
}

export interface ResourceNodeContext {
  token: string;
  resourceDefinition: ResourceDefinition;
  portalContext: PortalContext;
  namespaceId?: string;
  accountId?: string;
  resourceId?: string;
  entityType?: string;
  entityName?: string;
}

export interface NodeContext extends Record<string, any> {
  token: string;
  accountId?: string;
  userId?: string;
  tenantId?: string;
  portalContext: PortalContext;
  resourceDefinition?: ResourceDefinition;
  namespaceId?: string;
  entityType?: string;
  entityName?: string;
}

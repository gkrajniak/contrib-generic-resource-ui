export interface Resource {
  apiVersion?: string;
  kind?: string;
  metadata: ResourceMetadata;
  spec?: Record<string, any>;
  status?: Record<string, any>;
}

export interface ResourceMetadata {
  name: string;
  namespace?: string;
  uid?: string;
  resourceVersion?: string;
  creationTimestamp?: string;
  deletionTimestamp?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  finalizers?: string[];
  ownerReferences?: OwnerReference[];
  generation?: number;
}

export interface OwnerReference {
  apiVersion: string;
  kind: string;
  name: string;
  uid: string;
  controller?: boolean;
  blockOwnerDeletion?: boolean;
}

export interface ResourceDefinition {
  group: string;
  version: string;
  kind: string;
  plural: string;
  singular: string;
  scope: 'Cluster' | 'Namespaced';
}

export interface ResourceListResult {
  resourceVersion: string;
  items: Resource[];
}

export interface ResourceSubscriptionResult {
  type: ResourceOperationType;
  object: Resource;
}

export type ResourceOperationType = 'ADDED' | 'MODIFIED' | 'DELETED';

export const ResourceOperationTypeMap = {
  ADDED: 'ADDED' as ResourceOperationType,
  MODIFIED: 'MODIFIED' as ResourceOperationType,
  DELETED: 'DELETED' as ResourceOperationType,
};

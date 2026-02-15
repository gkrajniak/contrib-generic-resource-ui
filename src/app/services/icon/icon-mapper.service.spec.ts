import { IconMapperService } from './icon-mapper.service';

describe('IconMapperService', () => {
  let service: IconMapperService;

  beforeEach(() => {
    service = new IconMapperService();
  });

  describe('getIconForField', () => {
    describe('authentication and security icons', () => {
      it('should return locked icon for OIDC fields', () => {
        expect(service.getIconForField('oidcProvider')).toBe('locked');
        expect(service.getIconForField('oidcConfig')).toBe('locked');
      });

      it('should return locked icon for OAuth fields', () => {
        expect(service.getIconForField('oauthClient')).toBe('locked');
      });

      it('should return shield icon for FGA fields', () => {
        expect(service.getIconForField('fgaStore')).toBe('shield');
        expect(service.getIconForField('openfgaModel')).toBe('shield');
      });

      it('should return key icon for credential/secret fields', () => {
        expect(service.getIconForField('credential')).toBe('key');
        expect(service.getIconForField('secretRef')).toBe('key');
        expect(service.getIconForField('password')).toBe('key');
        expect(service.getIconForField('apikey')).toBe('key');
      });

      it('should return shield icon for permission/policy fields', () => {
        expect(service.getIconForField('permission')).toBe('shield');
        expect(service.getIconForField('rbacConfig')).toBe('shield');
        expect(service.getIconForField('accessPolicy')).toBe('shield');
      });

      it('should return role icon for role fields', () => {
        expect(service.getIconForField('role')).toBe('role');
        expect(service.getIconForField('roleBinding')).toBe('role');
      });
    });

    describe('infrastructure icons', () => {
      it('should return it-host icon for cluster fields', () => {
        expect(service.getIconForField('cluster')).toBe('it-host');
        expect(service.getIconForField('clusterInfo')).toBe('it-host');
      });

      it('should return it-host icon for kubernetes fields', () => {
        expect(service.getIconForField('kubernetesCluster')).toBe('it-host');
        expect(service.getIconForField('k8sConfig')).toBe('it-host');
      });

      it('should return it-instance icon for node/instance fields', () => {
        expect(service.getIconForField('node')).toBe('it-instance');
        expect(service.getIconForField('vmInstance')).toBe('it-instance');
        expect(service.getIconForField('server')).toBe('it-instance');
      });

      it('should return database icon for database fields', () => {
        expect(service.getIconForField('database')).toBe('database');
        expect(service.getIconForField('dbConfig')).toBe('database');
        expect(service.getIconForField('storage')).toBe('database');
      });

      it('should return world icon for network fields', () => {
        expect(service.getIconForField('network')).toBe('world');
        expect(service.getIconForField('dnsConfig')).toBe('world');
        expect(service.getIconForField('endpoint')).toBe('world');
      });

      it('should return cloud icon for cloud provider fields', () => {
        expect(service.getIconForField('cloudProvider')).toBe('cloud');
        expect(service.getIconForField('awsConfig')).toBe('cloud');
        expect(service.getIconForField('azureRegion')).toBe('cloud');
      });
    });

    describe('relationship icons', () => {
      it('should return navigation-up-arrow for parent fields', () => {
        expect(service.getIconForField('parentAccount')).toBe('navigation-up-arrow');
        expect(service.getIconForField('parent')).toBe('navigation-up-arrow');
      });

      it('should return navigation-down-arrow for child fields', () => {
        expect(service.getIconForField('children')).toBe('navigation-down-arrow');
        expect(service.getIconForField('nestedItems')).toBe('navigation-down-arrow');
      });

      it('should return chain-link for reference fields', () => {
        expect(service.getIconForField('reference')).toBe('chain-link');
        expect(service.getIconForField('ownerRef')).toBe('chain-link');
      });
    });

    describe('organization icons', () => {
      it('should return org-chart icon for organization fields', () => {
        expect(service.getIconForField('organization')).toBe('org-chart');
        expect(service.getIconForField('orgUnit')).toBe('org-chart');
      });

      it('should return group icon for team fields', () => {
        expect(service.getIconForField('team')).toBe('group');
        expect(service.getIconForField('groupMembers')).toBe('group');
      });

      it('should return building icon for tenant/workspace fields', () => {
        expect(service.getIconForField('tenant')).toBe('building');
        expect(service.getIconForField('workspace')).toBe('building');
      });

      it('should return customer icon for account/user fields', () => {
        expect(service.getIconForField('account')).toBe('customer');
        expect(service.getIconForField('userProfile')).toBe('customer');
      });
    });

    describe('configuration icons', () => {
      it('should return settings icon for config fields', () => {
        expect(service.getIconForField('config')).toBe('settings');
        expect(service.getIconForField('configuration')).toBe('settings');
        expect(service.getIconForField('settings')).toBe('settings');
      });

      it('should return document icon for spec fields', () => {
        expect(service.getIconForField('spec')).toBe('document');
        expect(service.getIconForField('specification')).toBe('document');
      });

      it('should return status-positive icon for status fields', () => {
        expect(service.getIconForField('status')).toBe('status-positive');
        expect(service.getIconForField('healthStatus')).toBe('status-positive');
      });

      it('should return hint icon for metadata fields', () => {
        expect(service.getIconForField('metadata')).toBe('hint');
        expect(service.getIconForField('metaInfo')).toBe('hint');
      });
    });

    describe('action icons', () => {
      it('should return add icon for create fields', () => {
        expect(service.getIconForField('create')).toBe('add');
        expect(service.getIconForField('addItem')).toBe('add');
      });

      it('should return delete icon for delete fields', () => {
        expect(service.getIconForField('delete')).toBe('delete');
        expect(service.getIconForField('removeItem')).toBe('delete');
      });

      it('should return edit icon for update fields', () => {
        expect(service.getIconForField('update')).toBe('edit');
        expect(service.getIconForField('editMode')).toBe('edit');
      });

      it('should return synchronize icon for sync fields', () => {
        expect(service.getIconForField('sync')).toBe('synchronize');
        expect(service.getIconForField('reconcile')).toBe('synchronize');
      });
    });

    describe('common object icons', () => {
      it('should return tag icon for label fields', () => {
        expect(service.getIconForField('labels')).toBe('tag');
        expect(service.getIconForField('annotations')).toBe('tag');
      });

      it('should return building icon for namespace fields (matches workspace rule)', () => {
        // 'namespace' contains 'space' which matches tenant/workspace rule
        expect(service.getIconForField('namespace')).toBe('building');
      });

      it('should return document icon for list fields (matches resource rule)', () => {
        // 'itemList' matches 'item' in resource rule, 'arrayItems' also matches
        expect(service.getIconForField('itemList')).toBe('document');
        expect(service.getIconForField('arrayItems')).toBe('document');
      });
    });

    describe('default icon', () => {
      it('should return puzzle icon for unknown fields', () => {
        expect(service.getIconForField('unknownField')).toBe('puzzle');
        expect(service.getIconForField('xyz123')).toBe('puzzle');
      });
    });

    describe('typeName and description matching', () => {
      it('should match based on typeName', () => {
        expect(service.getIconForField('myField', 'ClusterInfo')).toBe('it-host');
      });

      it('should match based on description', () => {
        expect(service.getIconForField('myField', undefined, 'The database connection string')).toBe('database');
      });

      it('should prioritize earlier rules (more specific)', () => {
        // 'parentaccount' should match parentAccount rule, not account rule
        expect(service.getIconForField('parentAccount')).toBe('navigation-up-arrow');
      });
    });

    describe('case insensitivity', () => {
      it('should match regardless of case in fieldName', () => {
        expect(service.getIconForField('DATABASE')).toBe('database');
        expect(service.getIconForField('DataBase')).toBe('database');
      });

      it('should match regardless of case in typeName', () => {
        expect(service.getIconForField('field', 'DATABASE')).toBe('database');
      });
    });
  });
});

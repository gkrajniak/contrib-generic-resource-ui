import { ListColumnGeneratorService } from './list-column-generator.service';
import { FieldAnalysis, ListColumnConfig, SchemaField } from 'models/index';

describe('ListColumnGeneratorService', () => {
  let service: ListColumnGeneratorService;

  beforeEach(() => {
    service = new ListColumnGeneratorService();
  });

  function createField(name: string, typeName = 'String', isScalar = true): SchemaField {
    return {
      name,
      typeName,
      kind: 'SCALAR',
      isNonNull: false,
      isList: false,
      isScalar,
      description: '',
    };
  }

  function createFieldAnalysis(overrides: Partial<FieldAnalysis> = {}): FieldAnalysis {
    return {
      coreFields: [],
      scalarSpecFields: [],
      complexSpecFields: [],
      statusFields: [],
      requiredInputFields: [],
      allSpecFields: [],
      allStatusFields: [],
      nestedSpecFields: [],
      nestedStatusFields: [],
      rootLevelFields: [],
      nestedRootLevelFields: [],
      ...overrides,
    };
  }

  describe('generateColumns', () => {
    it('should always include name column first', () => {
      const analysis = createFieldAnalysis();
      const columns = service.generateColumns(analysis);

      expect(columns.length).toBeGreaterThan(0);
      const nameColumn = columns.find((c) => c.key === 'name');
      expect(nameColumn).toBeDefined();
      expect(nameColumn?.path).toBe('metadata.name');
      expect(nameColumn?.type).toBe('link');
      expect(nameColumn?.priority).toBe(0);
    });

    it('should include creationTimestamp when includeMetadata is true', () => {
      const analysis = createFieldAnalysis();
      const config: ListColumnConfig = { includeMetadata: true, includeStatus: false, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const tsColumn = columns.find((c) => c.key === 'creationTimestamp');
      expect(tsColumn).toBeDefined();
      expect(tsColumn?.path).toBe('metadata.creationTimestamp');
      expect(tsColumn?.type).toBe('date');
    });

    it('should not include creationTimestamp when includeMetadata is false', () => {
      const analysis = createFieldAnalysis();
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: false, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const tsColumn = columns.find((c) => c.key === 'creationTimestamp');
      expect(tsColumn).toBeUndefined();
    });

    it('should generate columns for scalar spec fields', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [
          createField('displayName'),
          createField('version'),
        ],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: false, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      expect(columns.find((c) => c.key === 'displayName')).toBeDefined();
      expect(columns.find((c) => c.key === 'version')).toBeDefined();
    });

    it('should respect maxColumns limit', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [
          createField('field1'),
          createField('field2'),
          createField('field3'),
          createField('field4'),
          createField('field5'),
        ],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: false, maxColumns: 3 };
      const columns = service.generateColumns(analysis, config);

      // name + 2 spec fields = 3 total
      expect(columns.length).toBe(3);
    });

    it('should include status column when includeStatus is true and statusFields exist', () => {
      const analysis = createFieldAnalysis({
        statusFields: [createField('phase')],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: true, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const statusColumn = columns.find((c) => c.key === 'phase');
      expect(statusColumn).toBeDefined();
      expect(statusColumn?.type).toBe('status');
    });

    it('should not include status column when includeStatus is false', () => {
      const analysis = createFieldAnalysis({
        statusFields: [createField('phase')],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: false, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const statusColumn = columns.find((c) => c.path?.startsWith('status.'));
      expect(statusColumn).toBeUndefined();
    });

    it('should sort columns by priority', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('displayName')],
        statusFields: [createField('phase')],
      });
      const config: ListColumnConfig = { includeMetadata: true, includeStatus: true, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      // Verify sorted by priority
      for (let i = 1; i < columns.length; i++) {
        expect(columns[i].priority).toBeGreaterThanOrEqual(columns[i - 1].priority);
      }
    });
  });

  describe('column type detection', () => {
    it('should detect date type for timestamp fields', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('lastUpdatedTime')],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: false, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const dateColumn = columns.find((c) => c.key === 'lastUpdatedTime');
      expect(dateColumn?.type).toBe('date');
    });

    it('should detect boolean type', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('enabled', 'Boolean')],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: false, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const boolColumn = columns.find((c) => c.key === 'enabled');
      expect(boolColumn?.type).toBe('boolean');
    });

    it('should detect number type for Int fields', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('replicas', 'Int')],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: false, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const numColumn = columns.find((c) => c.key === 'replicas');
      expect(numColumn?.type).toBe('number');
    });

    it('should detect number type for Float fields', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('ratio', 'Float')],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: false, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const numColumn = columns.find((c) => c.key === 'ratio');
      expect(numColumn?.type).toBe('number');
    });

    it('should detect status type for phase/state fields', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('phase'), createField('state')],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: false, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      expect(columns.find((c) => c.key === 'phase')?.type).toBe('status');
      expect(columns.find((c) => c.key === 'state')?.type).toBe('status');
    });

    it('should default to text type for String fields', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('description')],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: false, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const textColumn = columns.find((c) => c.key === 'description');
      expect(textColumn?.type).toBe('text');
    });
  });

  describe('field prioritization', () => {
    it('should prioritize displayName over other fields', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [
          createField('zzz'),
          createField('displayName'),
          createField('aaa'),
        ],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: false, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const specColumns = columns.filter((c) => c.path?.startsWith('spec.'));
      expect(specColumns[0].key).toBe('displayName');
    });

    it('should prioritize type, status, phase fields', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [
          createField('zzz'),
          createField('type'),
          createField('aaa'),
        ],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: false, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const specColumns = columns.filter((c) => c.path?.startsWith('spec.'));
      expect(specColumns[0].key).toBe('type');
    });
  });

  describe('status column generation', () => {
    it('should prefer phase field for status column', () => {
      const analysis = createFieldAnalysis({
        statusFields: [
          createField('message'),
          createField('phase'),
          createField('observedGeneration'),
        ],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: true, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const statusColumn = columns.find((c) => c.path?.startsWith('status.'));
      expect(statusColumn?.key).toBe('phase');
    });

    it('should prefer state field if no phase', () => {
      const analysis = createFieldAnalysis({
        statusFields: [
          createField('message'),
          createField('state'),
        ],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: true, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const statusColumn = columns.find((c) => c.path?.startsWith('status.'));
      expect(statusColumn?.key).toBe('state');
    });

    it('should prefer ready field', () => {
      const analysis = createFieldAnalysis({
        statusFields: [
          createField('message'),
          createField('ready'),
        ],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: true, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const statusColumn = columns.find((c) => c.path?.startsWith('status.'));
      expect(statusColumn?.key).toBe('ready');
    });

    it('should use first status field if no priority fields found', () => {
      const analysis = createFieldAnalysis({
        statusFields: [
          createField('observedGeneration'),
          createField('message'),
        ],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: true, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const statusColumn = columns.find((c) => c.path?.startsWith('status.'));
      expect(statusColumn?.key).toBe('observedGeneration');
    });

    it('should not add status column if no status fields exist', () => {
      const analysis = createFieldAnalysis({
        statusFields: [],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: true, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const statusColumn = columns.find((c) => c.path?.startsWith('status.'));
      expect(statusColumn).toBeUndefined();
    });
  });

  describe('column labels', () => {
    it('should humanize field names for labels', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('displayName')],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: false, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const column = columns.find((c) => c.key === 'displayName');
      expect(column?.label).toBe('Display Name');
    });
  });

  describe('sortability', () => {
    it('should mark scalar fields as sortable', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('name', 'String', true)],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: false, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const column = columns.find((c) => c.key === 'name' && c.path?.startsWith('spec.'));
      expect(column?.sortable).toBe(true);
    });

    it('should mark non-scalar fields as not sortable', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('labels', 'Object', false)],
      });
      const config: ListColumnConfig = { includeMetadata: false, includeStatus: false, maxColumns: 10 };
      const columns = service.generateColumns(analysis, config);

      const column = columns.find((c) => c.key === 'labels');
      expect(column?.sortable).toBe(false);
    });
  });
});

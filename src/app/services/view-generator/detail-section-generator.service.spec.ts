import { DetailSectionGeneratorService } from './detail-section-generator.service';
import { FieldAnalysis, SchemaField } from 'models/index';

describe('DetailSectionGeneratorService', () => {
  let service: DetailSectionGeneratorService;

  beforeEach(() => {
    service = new DetailSectionGeneratorService();
  });

  function createField(name: string, typeName = 'String', options: Partial<SchemaField> = {}): SchemaField {
    return {
      name,
      typeName,
      kind: 'SCALAR',
      isNonNull: false,
      isList: false,
      isScalar: true,
      description: '',
      ...options,
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

  describe('generateSections', () => {
    it('should always include metadata section', () => {
      const analysis = createFieldAnalysis();
      const sections = service.generateSections(analysis);

      const metadataSection = sections.find((s) => s.id === 'metadata');
      expect(metadataSection).toBeDefined();
      expect(metadataSection?.title).toBe('Metadata');
      expect(metadataSection?.type).toBe('metadata');
      expect(metadataSection?.order).toBe(0);
    });

    it('should include standard metadata fields', () => {
      const analysis = createFieldAnalysis();
      const sections = service.generateSections(analysis);

      const metadataSection = sections.find((s) => s.id === 'metadata');
      const fieldKeys = metadataSection?.fields.map((f) => f.key);

      expect(fieldKeys).toContain('name');
      expect(fieldKeys).toContain('namespace');
      expect(fieldKeys).toContain('uid');
      expect(fieldKeys).toContain('creationTimestamp');
      expect(fieldKeys).toContain('labels');
      expect(fieldKeys).toContain('annotations');
    });

    it('should generate spec section when scalarSpecFields exist', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('displayName'), createField('replicas', 'Int')],
      });
      const sections = service.generateSections(analysis);

      const specSection = sections.find((s) => s.id === 'spec');
      expect(specSection).toBeDefined();
      expect(specSection?.title).toBe('Spec');
      expect(specSection?.fields.length).toBe(2);
    });

    it('should not include spec section when no spec fields', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [],
        complexSpecFields: [],
      });
      const sections = service.generateSections(analysis);

      const specSection = sections.find((s) => s.id === 'spec');
      expect(specSection).toBeUndefined();
    });

    it('should generate status section when statusFields exist', () => {
      const analysis = createFieldAnalysis({
        statusFields: [createField('phase'), createField('message')],
      });
      const sections = service.generateSections(analysis);

      const statusSection = sections.find((s) => s.id === 'status');
      expect(statusSection).toBeDefined();
      expect(statusSection?.title).toBe('Status');
      expect(statusSection?.fields.length).toBe(2);
    });

    it('should generate conditions section when conditionsField exists', () => {
      const analysis = createFieldAnalysis({
        conditionsField: createField('conditions', 'Condition', { isList: true, isScalar: false }),
      });
      const sections = service.generateSections(analysis);

      const conditionsSection = sections.find((s) => s.id === 'conditions');
      expect(conditionsSection).toBeDefined();
      expect(conditionsSection?.title).toBe('Conditions');
      expect(conditionsSection?.type).toBe('conditions');
    });

    it('should not include conditions section when no conditionsField', () => {
      const analysis = createFieldAnalysis();
      const sections = service.generateSections(analysis);

      const conditionsSection = sections.find((s) => s.id === 'conditions');
      expect(conditionsSection).toBeUndefined();
    });

    it('should order sections correctly', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('displayName')],
        statusFields: [createField('phase')],
        conditionsField: createField('conditions'),
      });
      const sections = service.generateSections(analysis);

      expect(sections[0].id).toBe('metadata');
      expect(sections[0].order).toBe(0);

      const specSection = sections.find((s) => s.id === 'spec');
      expect(specSection?.order).toBe(1);

      const statusSection = sections.find((s) => s.id === 'status');
      expect(statusSection?.order).toBe(2);

      const conditionsSection = sections.find((s) => s.id === 'conditions');
      expect(conditionsSection?.order).toBe(3);
    });
  });

  describe('field type mapping', () => {
    it('should map Boolean fields correctly', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('enabled', 'Boolean')],
      });
      const sections = service.generateSections(analysis);

      const specSection = sections.find((s) => s.id === 'spec');
      const enabledField = specSection?.fields.find((f) => f.key === 'enabled');
      expect(enabledField?.type).toBe('boolean');
    });

    it('should map Int fields to number', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('replicas', 'Int')],
      });
      const sections = service.generateSections(analysis);

      const specSection = sections.find((s) => s.id === 'spec');
      const replicasField = specSection?.fields.find((f) => f.key === 'replicas');
      expect(replicasField?.type).toBe('number');
    });

    it('should map Float fields to number', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('ratio', 'Float')],
      });
      const sections = service.generateSections(analysis);

      const specSection = sections.find((s) => s.id === 'spec');
      const ratioField = specSection?.fields.find((f) => f.key === 'ratio');
      expect(ratioField?.type).toBe('number');
    });

    it('should map list fields to array', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('items', 'String', { isList: true })],
      });
      const sections = service.generateSections(analysis);

      const specSection = sections.find((s) => s.id === 'spec');
      const itemsField = specSection?.fields.find((f) => f.key === 'items');
      expect(itemsField?.type).toBe('array');
    });

    it('should map String fields to text', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('description', 'String')],
      });
      const sections = service.generateSections(analysis);

      const specSection = sections.find((s) => s.id === 'spec');
      const descField = specSection?.fields.find((f) => f.key === 'description');
      expect(descField?.type).toBe('text');
    });

    it('should map complex fields to object', () => {
      const analysis = createFieldAnalysis({
        complexSpecFields: [
          createField('config', 'ConfigSpec', { kind: 'OBJECT', isScalar: false }),
        ],
      });
      const sections = service.generateSections(analysis);

      const specSection = sections.find((s) => s.id === 'spec');
      const configField = specSection?.fields.find((f) => f.key === 'config');
      expect(configField?.type).toBe('object');
    });

    it('should map complex list fields to array', () => {
      const analysis = createFieldAnalysis({
        complexSpecFields: [
          createField('items', 'Item', { kind: 'OBJECT', isScalar: false, isList: true }),
        ],
      });
      const sections = service.generateSections(analysis);

      const specSection = sections.find((s) => s.id === 'spec');
      const itemsField = specSection?.fields.find((f) => f.key === 'items');
      expect(itemsField?.type).toBe('array');
    });
  });

  describe('field path generation', () => {
    it('should generate correct paths for spec fields', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('displayName')],
      });
      const sections = service.generateSections(analysis);

      const specSection = sections.find((s) => s.id === 'spec');
      const field = specSection?.fields.find((f) => f.key === 'displayName');
      expect(field?.path).toBe('spec.displayName');
    });

    it('should generate correct paths for status fields', () => {
      const analysis = createFieldAnalysis({
        statusFields: [createField('phase')],
      });
      const sections = service.generateSections(analysis);

      const statusSection = sections.find((s) => s.id === 'status');
      const field = statusSection?.fields.find((f) => f.key === 'phase');
      expect(field?.path).toBe('status.phase');
    });

    it('should generate correct paths for metadata fields', () => {
      const analysis = createFieldAnalysis();
      const sections = service.generateSections(analysis);

      const metadataSection = sections.find((s) => s.id === 'metadata');
      const nameField = metadataSection?.fields.find((f) => f.key === 'name');
      expect(nameField?.path).toBe('metadata.name');
    });
  });

  describe('label generation', () => {
    it('should humanize field names for labels', () => {
      const analysis = createFieldAnalysis({
        scalarSpecFields: [createField('displayName')],
      });
      const sections = service.generateSections(analysis);

      const specSection = sections.find((s) => s.id === 'spec');
      const field = specSection?.fields.find((f) => f.key === 'displayName');
      expect(field?.label).toBe('Display Name');
    });
  });
});

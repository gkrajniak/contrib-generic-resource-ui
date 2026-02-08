import { ReadyStatusDetectorService } from './ready-status-detector.service';
import { Resource } from 'models/index';

describe('ReadyStatusDetectorService', () => {
  let service: ReadyStatusDetectorService;

  beforeEach(() => {
    service = new ReadyStatusDetectorService();
  });

  describe('detectReadyStatus', () => {
    it('should return unknown when resource has no status', () => {
      const resource: Resource = {
        metadata: { name: 'test' },
      };

      const result = service.detectReadyStatus(resource);

      expect(result.status).toBe('unknown');
      expect(result.isReady).toBe(false);
    });

    it('should detect ready from conditions with Ready type', () => {
      const resource: Resource = {
        metadata: { name: 'test' },
        status: {
          conditions: [
            {
              type: 'Ready',
              status: 'True',
              message: 'Resource is ready',
            },
          ],
        },
      };

      const result = service.detectReadyStatus(resource);

      expect(result.status).toBe('ready');
      expect(result.isReady).toBe(true);
      expect(result.message).toBe('Resource is ready');
    });

    it('should detect not-ready from conditions with Ready type', () => {
      const resource: Resource = {
        metadata: { name: 'test' },
        status: {
          conditions: [
            {
              type: 'Ready',
              status: 'False',
              reason: 'ConfigurationError',
            },
          ],
        },
      };

      const result = service.detectReadyStatus(resource);

      expect(result.status).toBe('not-ready');
      expect(result.isReady).toBe(false);
    });

    it('should detect ready from phase field', () => {
      const resource: Resource = {
        metadata: { name: 'test' },
        status: {
          phase: 'Running',
        },
      };

      const result = service.detectReadyStatus(resource);

      expect(result.status).toBe('ready');
      expect(result.isReady).toBe(true);
    });

    it('should detect not-ready from phase field', () => {
      const resource: Resource = {
        metadata: { name: 'test' },
        status: {
          phase: 'Failed',
        },
      };

      const result = service.detectReadyStatus(resource);

      expect(result.status).toBe('not-ready');
      expect(result.isReady).toBe(false);
    });

    it('should detect in-progress from phase field', () => {
      const resource: Resource = {
        metadata: { name: 'test' },
        status: {
          phase: 'Creating',
        },
      };

      const result = service.detectReadyStatus(resource);

      expect(result.status).toBe('in-progress');
      expect(result.isReady).toBe(false);
    });

    it('should detect ready from ready field', () => {
      const resource: Resource = {
        metadata: { name: 'test' },
        status: {
          ready: true,
        },
      };

      const result = service.detectReadyStatus(resource);

      expect(result.status).toBe('ready');
      expect(result.isReady).toBe(true);
    });

    it('should detect not-ready from ready field', () => {
      const resource: Resource = {
        metadata: { name: 'test' },
        status: {
          ready: false,
        },
      };

      const result = service.detectReadyStatus(resource);

      expect(result.status).toBe('not-ready');
      expect(result.isReady).toBe(false);
    });

    it('should detect ready from state field', () => {
      const resource: Resource = {
        metadata: { name: 'test' },
        status: {
          state: 'active',
        },
      };

      const result = service.detectReadyStatus(resource);

      expect(result.status).toBe('ready');
      expect(result.isReady).toBe(true);
    });

    it('should prioritize conditions over phase', () => {
      const resource: Resource = {
        metadata: { name: 'test' },
        status: {
          conditions: [
            {
              type: 'Ready',
              status: 'False',
            },
          ],
          phase: 'Running',
        },
      };

      const result = service.detectReadyStatus(resource);

      expect(result.status).toBe('not-ready');
    });
  });
});

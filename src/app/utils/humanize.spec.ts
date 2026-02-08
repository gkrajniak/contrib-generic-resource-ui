import { humanizeFieldName, formatRelativeTime } from './humanize';

describe('humanize utilities', () => {
  describe('humanizeFieldName', () => {
    it('should convert camelCase to title case', () => {
      expect(humanizeFieldName('displayName')).toBe('Display Name');
      expect(humanizeFieldName('creationTimestamp')).toBe('Creation Timestamp');
    });

    it('should handle underscores', () => {
      expect(humanizeFieldName('resource_version')).toBe('Resource Version');
    });

    it('should handle single words', () => {
      expect(humanizeFieldName('name')).toBe('Name');
      expect(humanizeFieldName('status')).toBe('Status');
    });

    it('should handle abbreviations', () => {
      expect(humanizeFieldName('apiVersion')).toBe('Api Version');
      expect(humanizeFieldName('uid')).toBe('Uid');
    });
  });

  describe('formatRelativeTime', () => {
    it('should return "-" for undefined', () => {
      expect(formatRelativeTime(undefined)).toBe('-');
    });

    it('should return "Just now" for recent timestamps', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe('Just now');
    });

    it('should return minutes ago for recent past', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinutesAgo)).toBe('5m ago');
    });

    it('should return hours ago', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
    });

    it('should return days ago', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago');
    });
  });
});

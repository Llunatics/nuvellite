import { describe, it, expect } from 'vitest';
import { normalizeStatus } from '../src/lib/catalog-service';

describe('Status Mapping Logic (§5.1)', () => {
  it('maps ongoing status case-insensitively', () => {
    expect(normalizeStatus('Ongoing')).toBe('ONGOING');
    expect(normalizeStatus('ongoing')).toBe('ONGOING');
    expect(normalizeStatus('ONGOING')).toBe('ONGOING');
    expect(normalizeStatus('Berjalan')).toBe('ONGOING');
  });

  it('maps completed and tamat status case-insensitively', () => {
    expect(normalizeStatus('Completed')).toBe('COMPLETED');
    expect(normalizeStatus('completed')).toBe('COMPLETED');
    expect(normalizeStatus('COMPLETED')).toBe('COMPLETED');
    expect(normalizeStatus('Tamat')).toBe('COMPLETED');
    expect(normalizeStatus('tamat')).toBe('COMPLETED');
    expect(normalizeStatus('Complete')).toBe('COMPLETED');
  });

  it('maps hiatus and dropped status properly', () => {
    expect(normalizeStatus('Hiatus')).toBe('HIATUS');
    expect(normalizeStatus('hiatus')).toBe('HIATUS');
    expect(normalizeStatus('Dropped')).toBe('DROPPED');
    expect(normalizeStatus('dropped')).toBe('DROPPED');
  });

  it('handles unreleased status without misclassifying ongoing books', () => {
    expect(normalizeStatus('Unreleased')).toBe('UNRELEASED');
    expect(normalizeStatus('unreleased')).toBe('UNRELEASED');
    expect(normalizeStatus('Ongoing')).not.toBe('UNRELEASED');
    expect(normalizeStatus('Completed')).not.toBe('UNRELEASED');
  });

  it('defaults gracefully on empty or unknown status to ONGOING instead of unreleased/archived', () => {
    expect(normalizeStatus('')).toBe('ONGOING');
    expect(normalizeStatus(null)).toBe('ONGOING');
    expect(normalizeStatus(undefined)).toBe('ONGOING');
  });
});

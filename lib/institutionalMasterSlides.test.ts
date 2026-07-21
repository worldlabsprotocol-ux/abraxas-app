import { describe, expect, it } from 'vitest';
import {
  INSTITUTIONAL_CHAPTERS,
  INSTITUTIONAL_MASTER_SLIDES,
  getChapterStartIndex,
  getSlideChapterIndex,
} from '@/lib/institutionalMasterSlides';

describe('institutionalMasterSlides', () => {
  it('defines six chapters', () => {
    expect(INSTITUTIONAL_CHAPTERS).toHaveLength(6);
    expect(INSTITUTIONAL_CHAPTERS.map((c) => c.id)).toEqual([
      'market',
      'problem',
      'abraxas',
      'live',
      'ecosystem',
      'build',
    ]);
  });

  it('includes Medium thesis market slides plus product chapters', () => {
    expect(INSTITUTIONAL_MASTER_SLIDES.length).toBeGreaterThanOrEqual(14);
    expect(INSTITUTIONAL_MASTER_SLIDES[0].chapter).toBe('market');
    expect(INSTITUTIONAL_MASTER_SLIDES[0].eyebrow).toContain('Medium');
    expect(INSTITUTIONAL_MASTER_SLIDES.some((s) => s.visual === 'steps')).toBe(true);
    expect(INSTITUTIONAL_MASTER_SLIDES.some((s) => s.visual === 'audience-map')).toBe(true);
    expect(INSTITUTIONAL_MASTER_SLIDES.some((s) => s.visual === 'verify-loop')).toBe(true);
  });

  it('maps chapter start indices', () => {
    expect(getChapterStartIndex('market')).toBe(0);
    expect(getChapterStartIndex('build')).toBeGreaterThan(getChapterStartIndex('ecosystem'));
    expect(getSlideChapterIndex(getChapterStartIndex('problem'))).toBe(1);
  });

  it('every slide has a visual type', () => {
    for (const slide of INSTITUTIONAL_MASTER_SLIDES) {
      expect(slide.visual).toBeTruthy();
      expect(slide.title.length).toBeGreaterThan(10);
    }
  });
});

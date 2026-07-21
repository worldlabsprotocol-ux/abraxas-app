import { describe, expect, it } from 'vitest';
import {
  INSTITUTIONAL_CHAPTERS,
  INSTITUTIONAL_MASTER_SLIDES,
  getChapterStartIndex,
  getSlideChapterIndex,
} from '@/lib/institutionalMasterSlides';

describe('institutionalMasterSlides', () => {
  it('defines five product-focused chapters (no market — article owns thesis)', () => {
    expect(INSTITUTIONAL_CHAPTERS).toHaveLength(5);
    expect(INSTITUTIONAL_CHAPTERS.map((c) => c.id)).toEqual([
      'problem',
      'abraxas',
      'live',
      'ecosystem',
      'build',
    ]);
  });

  it('does not duplicate article visuals (stats, steps, market slides)', () => {
    const visuals = INSTITUTIONAL_MASTER_SLIDES.map((s) => s.visual);
    expect(visuals).not.toContain('market');
    expect(visuals).not.toContain('steps');
    expect(visuals).not.toContain('gap');
    expect(visuals).not.toContain('examples');
    expect(visuals).not.toContain('abraxas');
    expect(visuals).toContain('proof-flow');
    expect(visuals).toContain('embed-passport');
    expect(visuals).toContain('trust-silo');
  });

  it('maps chapter start indices', () => {
    expect(getChapterStartIndex('problem')).toBe(0);
    expect(getChapterStartIndex('build')).toBeGreaterThan(getChapterStartIndex('ecosystem'));
    expect(getSlideChapterIndex(getChapterStartIndex('abraxas'))).toBe(1);
  });

  it('every slide has a visual type', () => {
    for (const slide of INSTITUTIONAL_MASTER_SLIDES) {
      expect(slide.visual).toBeTruthy();
      expect(slide.title.length).toBeGreaterThan(10);
    }
  });
});

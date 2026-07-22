import { describe, expect, it } from 'vitest';
import {
  INSTITUTIONAL_CHAPTERS,
  INSTITUTIONAL_MASTER_SLIDES,
  getChapterStartIndex,
  getSlideChapterIndex,
} from '@/lib/institutionalMasterSlides';

describe('institutionalMasterSlides', () => {
  it('defines five pick-your-path chapters', () => {
    expect(INSTITUTIONAL_CHAPTERS).toHaveLength(5);
    expect(INSTITUTIONAL_CHAPTERS.map((c) => c.id)).toEqual([
      'problem',
      'product',
      'thesis',
      'build',
      'pulse',
    ]);
  });

  it('includes thesis article slides and pulse readiness slides', () => {
    const visuals = INSTITUTIONAL_MASTER_SLIDES.map((s) => s.visual);
    expect(visuals).toContain('market');
    expect(visuals).toContain('steps');
    expect(visuals).toContain('readiness-gates');
    expect(visuals).toContain('blog-featured');
    expect(visuals).toContain('proof-flow');
  });

  it('maps chapter start indices', () => {
    expect(getChapterStartIndex('problem')).toBe(0);
    expect(getChapterStartIndex('thesis')).toBeGreaterThan(getChapterStartIndex('product'));
    expect(getSlideChapterIndex(getChapterStartIndex('pulse'))).toBe(4);
  });

  it('every slide has a visual type', () => {
    for (const slide of INSTITUTIONAL_MASTER_SLIDES) {
      expect(slide.visual).toBeTruthy();
      expect(slide.title.length).toBeGreaterThan(10);
    }
  });
});

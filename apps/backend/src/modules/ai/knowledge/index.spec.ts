import {
  getTopKeywordKnowledgeScore,
  hasStrongKeywordKnowledgeMatch,
  searchKnowledgeByKeyword,
} from './index';

describe('knowledge keyword search', () => {
  it('matches liên hệ casso with strong score (fast path)', () => {
    expect(hasStrongKeywordKnowledgeMatch('liên hệ casso')).toBe(true);
    expect(getTopKeywordKnowledgeScore('liên hệ casso')).toBeGreaterThanOrEqual(10);

    const result = searchKnowledgeByKeyword('liên hệ casso');
    expect(result.totalFound).toBeGreaterThan(0);
    expect(result.sections[0]?.id).toBe('casso_contact');
  });

  it('matches copilot capabilities query (fast path)', () => {
    const result = searchKnowledgeByKeyword('ai copilot làm được gì');
    expect(result.sections.some((s) => s.id === 'xcash_copilot')).toBe(true);
  });
});

import {
  isQuotaOrBillingError,
  isTransientProviderError,
  shouldFallbackProvider,
} from './llm-error.util';

describe('llm-error.util', () => {
  it('detects quota status codes', () => {
    expect(isQuotaOrBillingError({ status: 402 })).toBe(true);
    expect(isQuotaOrBillingError({ status: 429 })).toBe(true);
    expect(isQuotaOrBillingError({ status: 500 })).toBe(false);
  });

  it('detects insufficient_quota message', () => {
    const err = new Error('429 You exceeded your current quota');
    Object.assign(err, { code: 'insufficient_quota' });
    expect(isQuotaOrBillingError(err)).toBe(true);
  });

  it('detects transient 5xx', () => {
    expect(isTransientProviderError({ status: 503 })).toBe(true);
    expect(isTransientProviderError(new Error('read ETIMEDOUT'))).toBe(true);
  });

  it('falls back on quota without treating as retriable OpenAI call', () => {
    expect(shouldFallbackProvider({ status: 402 })).toBe(true);
    expect(shouldFallbackProvider({ status: 503 })).toBe(true);
    expect(shouldFallbackProvider(new Error('invalid api key'))).toBe(false);
  });
});

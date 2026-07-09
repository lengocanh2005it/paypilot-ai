export function isQuotaOrBillingError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: number }).status;
    if (status === 402 || status === 429) return true;
  }

  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    const code =
      'code' in err && typeof (err as { code: unknown }).code === 'string'
        ? (err as { code: string }).code.toLowerCase()
        : '';

    if (code === 'insufficient_quota') return true;

    return (
      msg.includes('insufficient_quota') ||
      msg.includes('exceeded your current quota') ||
      msg.includes('credit balance') ||
      msg.includes('out of credits') ||
      msg.includes('billing hard limit') ||
      msg.includes('quota')
    );
  }

  return false;
}

export function isTransientProviderError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: number }).status;
    if (status >= 500 && status <= 503) return true;
  }

  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg.includes('econnreset') || msg.includes('etimedout');
  }

  return false;
}

/** OpenAI fail → fallback provider (MiniMax/Jina), không retry lại OpenAI. */
export function shouldFallbackProvider(err: unknown): boolean {
  return isQuotaOrBillingError(err) || isTransientProviderError(err);
}

const CAS_LINK_BASE_URL = 'https://link.bankhub.dev';

export function buildCasLinkUrl(grantToken: string, redirectUri: string) {
  const params = new URLSearchParams({
    grantToken,
    redirectUri,
  });
  return `${CAS_LINK_BASE_URL}?${params.toString()}`;
}

export function openCasLinkPopup(grantToken: string, redirectUri: string) {
  const url = buildCasLinkUrl(grantToken, redirectUri);
  return window.open(url, 'cas-link', 'width=480,height=720,scrollbars=yes,resizable=yes');
}

export function extractPublicToken(search: string): string | null {
  const params = new URLSearchParams(search);
  return params.get('publicToken') ?? params.get('token');
}

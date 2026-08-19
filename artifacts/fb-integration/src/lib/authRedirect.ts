const POST_SIGN_IN_RETURN_TO_KEY = "addlaunch:return-to-after-sign-in";
const PROTECTED_PATHS = new Set(["/campaigns", "/campaign/new", "/connect", "/profile"]);

/**
 * Accept only known in-app destinations, preventing open redirects from a
 * crafted `returnTo` query parameter or stale browser storage.
 */
export function getSafeReturnPath(value: string | null | undefined): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin || !PROTECTED_PATHS.has(parsed.pathname)) {
      return null;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function rememberPostSignInReturnTo(returnTo: string | null): void {
  if (returnTo) {
    window.sessionStorage.setItem(POST_SIGN_IN_RETURN_TO_KEY, returnTo);
  } else {
    window.sessionStorage.removeItem(POST_SIGN_IN_RETURN_TO_KEY);
  }
}

export function takePostSignInReturnTo(): string | null {
  const returnTo = getSafeReturnPath(
    window.sessionStorage.getItem(POST_SIGN_IN_RETURN_TO_KEY),
  );
  window.sessionStorage.removeItem(POST_SIGN_IN_RETURN_TO_KEY);
  return returnTo;
}
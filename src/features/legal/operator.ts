/** Operator details for imprint and privacy policy, from build-time env so they stay out of git. */
const env = import.meta.env;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export const OPERATOR = {
  name: str(env.VITE_LEGAL_NAME),
  /** Address lines, separated by "|" in the env value. */
  address: str(env.VITE_LEGAL_ADDRESS)
    .split('|')
    .map((l) => l.trim())
    .filter(Boolean),
  email: str(env.VITE_LEGAL_EMAIL),
};

export const OPERATOR_COMPLETE = !!(OPERATOR.name && OPERATOR.address.length && OPERATOR.email);

/** Bump when the legal texts change. */
export const LEGAL_UPDATED = '2026-10-03';

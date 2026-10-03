/** Auth-flow messages shared by the auth store (non-React) and the Settings account panel. */
export const auth = {
  linked: {
    title: 'Google account linked',
    description: 'Your data now follows your Google sign-in.',
  },
  linkedEmail: {
    title: 'Account created',
    description: 'Your data now follows your email sign-in.',
  },
  linkFailed: {
    title: 'Could not link account',
  },
  notSignedIn: 'Not signed in yet — try again in a moment.',
} as const;

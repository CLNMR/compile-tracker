import { create } from 'zustand';

/** `null` = not asked yet (banner shows). Stored per device; storing the choice itself needs no consent. */
export type ConsentChoice = 'granted' | 'denied' | null;

const KEY = 'compile.analyticsConsent';

function read(): ConsentChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

function write(v: Exclude<ConsentChoice, null>) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* private mode: the choice lasts for this page load only */
  }
}

interface ConsentState {
  choice: ConsentChoice;
  grant: () => void;
  deny: () => void;
}

export const useConsentStore = create<ConsentState>((set) => ({
  choice: read(),
  grant: () => {
    write('granted');
    set({ choice: 'granted' });
  },
  deny: () => {
    write('denied');
    set({ choice: 'denied' });
  },
}));

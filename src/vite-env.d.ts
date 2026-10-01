/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_FB_API_KEY: string;
  readonly VITE_FB_AUTH_DOMAIN: string;
  readonly VITE_FB_PROJECT_ID: string;
  readonly VITE_FB_STORAGE_BUCKET?: string;
  readonly VITE_FB_MESSAGING_SENDER_ID?: string;
  readonly VITE_FB_APP_ID: string;
  readonly VITE_ADMIN_UIDS?: string;
  readonly VITE_USE_EMULATORS?: string;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

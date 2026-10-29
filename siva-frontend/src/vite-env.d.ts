/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API do SIVA. Ex.: http://localhost:3000/api */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

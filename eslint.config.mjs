import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  // Keep the starter on the flat config export that actually runs under the pinned ESLint/Next toolchain.
  ...nextCoreWebVitals,
  {
    rules: {
      // Data-loading effects intentionally update state after an async fetch.
      // This React 19 rule currently reports the function call itself as
      // synchronous even when the update happens after the awaited request.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // Admin previews accept runtime user-uploaded and externally hosted image
    // URLs. next/image cannot safely optimize that unbounded source list;
    // these previews validate uploads and handle load failures themselves.
    files: ["src/app/admin/**/*.tsx"],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

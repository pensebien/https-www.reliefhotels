import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Same `files` scope eslint-config-next itself uses for the rule below,
    // so this override only applies where the react-hooks plugin is already
    // registered (a bare rules-only block with no `files` would otherwise
    // apply the rule to every file ESLint visits, including ones outside
    // that plugin's scope, and error with "could not find plugin react-hooks").
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    rules: {
      // react-hooks/set-state-in-effect is a React Compiler adoption-readiness
      // check (part of eslint-plugin-react-hooks' compiler rule family), not a
      // general correctness rule — this project doesn't use React Compiler.
      // Downgraded to warn so it stays visible without blocking CI on patterns
      // (reset-on-open, derive-from-URL, clamp-to-bounds) that are safe without
      // it. Revisit as "error" if/when this project adopts React Compiler.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;

import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/static-components": "off",
      "react-hooks/refs": "off",
      "react/no-unescaped-entities": "off",
      "@next/next/no-img-element": "warn"
    }
  },
  {
    ignores: [
      "**/coverage/**",
      "**/.next/**",
      "**/out/**"
    ]
  }
];

export default eslintConfig;

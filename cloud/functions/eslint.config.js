module.exports = [
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
    plugins: {
      "@typescript-eslint": require("@typescript-eslint/eslint-plugin"),
      "import": require("eslint-plugin-import"),
    },
    rules: {
      "quotes": ["error", "double"],
      "import/no-unresolved": 0,
      "indent": ["error", 2],
      "max-len": ["warn", { "code": 160, "tabWidth": 2, "ignoreComments": true }],
    },
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        project: ["tsconfig.json", "tsconfig.dev.json"],
      },
    },
    rules: {
      ...require("@typescript-eslint/eslint-plugin").configs.recommended.rules,
    },
  },
  {
    ignores: [
      "/lib/**/*", // Ignore built files.
      "/generated/**/*", // Ignore generated files.
      "node_modules/**/*",
      "eslint.config.js",
    ],
  },
];
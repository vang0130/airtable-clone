/** @type {import("eslint").Linter.Config} */
const config = {
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": true
  },
  "plugins": [
    "@typescript-eslint"
  ],
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked"
  ],
  "rules": {
    "@typescript-eslint/array-type": "off",
    "@typescript-eslint/consistent-type-definitions": "off",
    "@typescript-eslint/consistent-type-imports": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/no-misused-promises": "off",
    "@typescript-eslint/no-floating-promises": "off",
    "react-hooks/exhaustive-deps": "off",
    "@typescript-eslint/prefer-nullish-coalescing": "off",
    "prefer-const": "off",
    "@typescript-eslint/no-unsafe-return": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/no-unsafe-member-access": "off",
    "@typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint/no-unsafe-argument": "off",
    "@typescript-eslint/restrict-template-expressions": "off",
    "@typescript-eslint/unbound-method": "off",
    // "@typescript-eslint/no-unsafe-assignment": "off",  // Turn off unsafe assignment check
    // "@typescript-eslint/no-unsafe-member-access": "off",  // Turn off unsafe member access check
    // "@typescript-eslint/no-unsafe-return": "off",  // Turn off unsafe return type check
    // "@typescript-eslint/no-explicit-any": "off",  // Turn off any type restriction
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint-disable-next-line @typescript-eslint/no-unsafe-call": "off",
    "@typescript-eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents": "off",
    // "@typescript-eslint-disable-next-line @typescript-eslint/no-unsafe-call": "off",
    // "@typescript-eslint/array-type": "off",
    // "@typescript-eslint/consistent-type-definitions": "off",
    // "@typescript-eslint/consistent-type-imports": [
    //   "warn",
    //   {
    //     "prefer": "type-imports",
    //     "fixStyle": "inline-type-imports"
    //   }
    // ],
    // "@typescript-eslint/no-unused-vars": [
    //   "warn",
    //   {
    //     "argsIgnorePattern": "^_"
    //   }
    // ],
    // "@typescript-eslint/require-await": "off",
    // "@typescript-eslint/no-misused-promises": [
    //   "error",
    //   {
    //     "checksVoidReturn": {
    //       "attributes": false
    //     }
    //   }
    // ]
  }
}
module.exports = config;

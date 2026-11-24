import firebaseRulesPlugin from "@firebase/eslint-plugin-security-rules";

export default [
  {
    ignores: ["dist/**/*", "android/**/*", "node_modules/**/*", "npm run start/**/*"]
  },
  firebaseRulesPlugin.configs["flat/recommended"]
];

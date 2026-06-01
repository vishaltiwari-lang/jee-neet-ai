// Vitest global setup. Add any global mocks or polyfills here.
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "sk-test";
process.env.OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
process.env.OPENAI_CLASSIFIER_MODEL = process.env.OPENAI_CLASSIFIER_MODEL ?? "gpt-4o-mini";

import { existsSync, readFileSync } from "node:fs";

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;
  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    process.env[key] = process.env[key] ?? value;
  }
}

function fail(message: string): never {
  console.error(`OpenRouter health check failed: ${message}`);
  process.exit(1);
}

async function main() {
  loadLocalEnv();

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const baseUrl = (process.env.OPENAI_BASE_URL?.trim() || "https://openrouter.ai/api/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_CLASSIFIER_MODEL?.trim() || "openai/gpt-4.1-mini";

  if (!apiKey) fail("OPENAI_API_KEY is missing.");
  if (!apiKey.startsWith("sk-or-")) {
    fail("OPENAI_API_KEY does not look like an OpenRouter key. Expected prefix sk-or-.");
  }
  if (new URL(baseUrl).hostname !== "openrouter.ai") {
    fail(`OPENAI_BASE_URL must point to openrouter.ai for this deployment. Current value: ${baseUrl}`);
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "X-Title": process.env.OPENAI_APP_NAME || "PrepPilot",
  };

  const auth = await fetch(`${baseUrl}/auth/key`, { headers });
  if (!auth.ok) {
    const body = await auth.text();
    fail(`auth endpoint returned ${auth.status}: ${body.slice(0, 300)}`);
  }

  const chat = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Reply with OK." }],
      max_tokens: 4,
      temperature: 0,
    }),
  });

  if (!chat.ok) {
    const body = await chat.text();
    fail(`chat completion failed for ${model} with ${chat.status}: ${body.slice(0, 300)}`);
  }

  console.log(`OpenRouter health check passed for ${model}.`);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));

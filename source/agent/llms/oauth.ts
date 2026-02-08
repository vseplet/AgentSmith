import { setConfigValue } from "#config";
import { ConfigKey } from "#types";

const OPENAI_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const OPENAI_AUTH_URL = "https://auth.openai.com/oauth/authorize";
const OPENAI_TOKEN_URL = "https://auth.openai.com/oauth/token";
const CALLBACK_PORT = 1455;
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/auth/callback`;

function generateCodeVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64url(new Uint8Array(hash));
}

function base64url(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(binString)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function openBrowser(url: string): Promise<void> {
  const cmd = Deno.build.os === "darwin"
    ? ["open", url]
    : Deno.build.os === "windows"
      ? ["cmd", "/c", "start", url]
      : ["xdg-open", url];

  const process = new Deno.Command(cmd[0], { args: cmd.slice(1) });
  const child = process.spawn();
  await child.status;
}

interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
}

async function exchangeCode(
  code: string,
  codeVerifier: string,
): Promise<OAuthTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: OPENAI_CLIENT_ID,
    code,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const res = await fetch(OPENAI_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${err}`);
  }

  return await res.json() as OAuthTokens;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: OPENAI_CLIENT_ID,
    refresh_token: refreshToken,
  });

  const res = await fetch(OPENAI_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${res.status} ${err}`);
  }

  const data = await res.json() as OAuthTokens;

  await setConfigValue(ConfigKey.OPENAI_API_KEY, data.access_token);
  if (data.refresh_token) {
    await setConfigValue(ConfigKey.CHATGPT_REFRESH_TOKEN, data.refresh_token);
  }

  return data.access_token;
}

function generateState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export async function performOAuthFlow(): Promise<OAuthTokens> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateState();

  const authUrl = new URL(OPENAI_AUTH_URL);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", OPENAI_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", "openid profile email offline_access");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("id_token_add_organizations", "true");
  authUrl.searchParams.set("codex_cli_simplified_flow", "true");

  const { promise: codePromise, resolve: resolveCode, reject: rejectCode } =
    Promise.withResolvers<string>();

  const server = Deno.serve(
    { port: CALLBACK_PORT, hostname: "127.0.0.1" },
    (req) => {
      const url = new URL(req.url);
      if (url.pathname === "/auth/callback") {
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        const returnedState = url.searchParams.get("state");

        if (error) {
          rejectCode(new Error(`OAuth error: ${error}`));
          return new Response(
            "<html><body><h2>Authentication failed</h2><p>You can close this tab.</p></body></html>",
            { headers: { "Content-Type": "text/html" } },
          );
        }

        if (returnedState !== state) {
          rejectCode(new Error("OAuth state mismatch"));
          return new Response(
            "<html><body><h2>Authentication failed</h2><p>State mismatch. You can close this tab.</p></body></html>",
            { headers: { "Content-Type": "text/html" } },
          );
        }

        if (code) {
          resolveCode(code);
          return new Response(
            "<html><body><h2>Authentication successful!</h2><p>You can close this tab.</p></body></html>",
            { headers: { "Content-Type": "text/html" } },
          );
        }
      }

      return new Response("Not found", { status: 404 });
    },
  );

  console.log("  Opening browser for OpenAI authentication...");
  await openBrowser(authUrl.toString());
  console.log("  Waiting for authorization...");

  try {
    const code = await codePromise;
    const tokens = await exchangeCode(code, codeVerifier);

    await setConfigValue(ConfigKey.OPENAI_API_KEY, tokens.access_token);
    if (tokens.refresh_token) {
      await setConfigValue(ConfigKey.CHATGPT_REFRESH_TOKEN, tokens.refresh_token);
    }

    return tokens;
  } finally {
    await server.shutdown();
  }
}

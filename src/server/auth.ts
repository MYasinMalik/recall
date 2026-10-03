// Sign in with ChatGPT: Authorization Code + PKCE against auth.openai.com, with a loopback redirect.
// Tokens stay on the server, encrypted at rest. The browser only ever holds an opaque session cookie.
import { createHash } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { randomToken, seal, sha256, unseal } from "./crypto";
import { get, getMeta, now, run, setMeta, transaction, uid } from "./db";
import { ORIGIN } from "./env";

const ISSUER = "https://auth.openai.com";
const AUTHORIZE_URL = `${ISSUER}/api/accounts/authorize`;
const TOKEN_URL = `${ISSUER}/api/accounts/oauth/token`;
const JWKS = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));
const RESOURCE = "https://api.openai.com/v1";
const REDIRECT_URI = `${ORIGIN}/auth/callback`;
const SCOPES = "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
const PLAN_SCOPE = "chatgpt.tokens.use.direct";
const DYNAMIC_CLIENT = "dynamic_agent_client";

export const SESSION_COOKIE = "recall_session";
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const PENDING_MS = 10 * 60 * 1000;

interface Pending {
  verifier: string;
  nonce: string;
  createdAt: number;
}
const globals = globalThis as unknown as {
  __recallPending?: Map<string, Pending>;
  __recallRefresh?: Map<string, Promise<string>>;
};
const pending: Map<string, Pending> = (globals.__recallPending ??= new Map());
const refreshing: Map<string, Promise<string>> = (globals.__recallRefresh ??= new Map());

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

function hostId(): string {
  let id = getMeta("host_id");
  if (!id) {
    id = `urn:uuid:${uid()}`;
    setMeta("host_id", id);
  }
  return id;
}

/** Builds the URL to send the browser to. State, nonce and the PKCE verifier are kept for ten minutes. */
export function beginSignIn(): string {
  for (const [state, p] of pending) if (now() - p.createdAt > PENDING_MS) pending.delete(state);
  const state = randomToken();
  const verifier = randomToken(48);
  const nonce = randomToken();
  pending.set(state, { verifier, nonce, createdAt: now() });

  const clientId = getMeta("client_id");
  const url = new URL(AUTHORIZE_URL);
  const params: Record<string, string> = {
    client_id: clientId ?? DYNAMIC_CLIENT,
    ext_agent_host_id: hostId(),
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    resource: RESOURCE,
    state,
    nonce,
    code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
  };
  if (!clientId) params.agent_name_hint = "Recall";
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  scope?: string;
}

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const code = typeof json.error === "string" ? json.error : `http_${res.status}`;
    throw new AuthError(code, `Token request failed (${code})`);
  }
  return json as unknown as TokenResponse;
}

function saveCredentials(userId: string, clientId: string, tokens: TokenResponse, keepRefresh?: string) {
  const refresh = tokens.refresh_token ?? keepRefresh;
  if (!refresh) throw new AuthError("no_refresh_token", "OpenAI did not return a refresh token");
  const scope = tokens.scope ?? SCOPES;
  const t = now();
  run(
    `insert into credentials (user_id, host_id, client_id, access_token_enc, refresh_token_enc, scopes, expires_at, plan_usage, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     on conflict(user_id) do update set client_id = excluded.client_id, access_token_enc = excluded.access_token_enc,
       refresh_token_enc = excluded.refresh_token_enc, scopes = excluded.scopes, expires_at = excluded.expires_at,
       plan_usage = excluded.plan_usage, updated_at = excluded.updated_at`,
    userId,
    hostId(),
    clientId,
    seal(tokens.access_token),
    seal(refresh),
    scope,
    t + tokens.expires_in * 1000,
    scope.split(" ").includes(PLAN_SCOPE) ? 1 : 0,
    t,
    t,
  );
}

/** Handles the redirect back from OpenAI. Returns a new session token to set as a cookie. */
export async function finishSignIn(query: URLSearchParams): Promise<string> {
  const error = query.get("error");
  if (error) throw new AuthError(error, query.get("error_description") ?? "Sign-in was not completed");

  const state = query.get("state") ?? "";
  const attempt = pending.get(state);
  pending.delete(state);
  if (!attempt || now() - attempt.createdAt > PENDING_MS) {
    throw new AuthError("state_mismatch", "This sign-in attempt expired or did not start here");
  }
  const code = query.get("code");
  if (!code) throw new AuthError("missing_code", "OpenAI did not return an authorisation code");

  // A first sign-in registers this install; the issued client id arrives on the callback.
  const issued = query.get("client_id");
  if (issued && issued !== DYNAMIC_CLIENT) setMeta("client_id", issued);
  const clientId = getMeta("client_id");
  if (!clientId) throw new AuthError("missing_client_id", "OpenAI did not issue a client id for this install");

  const tokens = await tokenRequest({
    grant_type: "authorization_code",
    client_id: clientId,
    code,
    code_verifier: attempt.verifier,
    redirect_uri: REDIRECT_URI,
    resource: RESOURCE,
  });
  if (!tokens.id_token) throw new AuthError("missing_id_token", "OpenAI did not return an ID token");

  const { payload } = await jwtVerify(tokens.id_token, JWKS, {
    issuer: ISSUER,
    audience: clientId,
    clockTolerance: 5,
  });
  if (payload.nonce !== attempt.nonce) throw new AuthError("nonce_mismatch", "The ID token does not match this attempt");
  if (!payload.sub) throw new AuthError("missing_subject", "The ID token has no subject");

  const t = now();
  const sessionToken = randomToken();
  transaction(() => {
    const existing = get<{ id: string }>(
      "select id from users where issuer = ? and client_id = ? and subject = ?",
      ISSUER,
      clientId,
      payload.sub as string,
    );
    const userId = existing?.id ?? uid();
    const profile = [
      typeof payload.email === "string" ? payload.email : null,
      typeof payload.name === "string" ? payload.name : null,
      typeof payload.picture === "string" ? payload.picture : null,
    ];
    if (existing) {
      run("update users set email = ?, name = ?, picture_url = ?, updated_at = ? where id = ?", ...profile, t, userId);
    } else {
      run(
        "insert into users (id, issuer, client_id, subject, email, name, picture_url, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        userId,
        ISSUER,
        clientId,
        payload.sub as string,
        ...profile,
        t,
        t,
      );
    }
    saveCredentials(userId, clientId, tokens);
    run(
      "insert into sessions (id, user_id, expires_at, created_at) values (?, ?, ?, ?)",
      sha256(sessionToken),
      userId,
      t + SESSION_MS,
      t,
    );
  });
  return sessionToken;
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  // The app is served over http on 127.0.0.1, where browsers do not accept Secure cookies.
  secure: false,
  path: "/",
  maxAge: SESSION_MS / 1000,
};

export interface SessionUser {
  id: string;
  name: string | null;
  email: string | null;
}

export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = get<SessionUser>(
    `select u.id, u.name, u.email from sessions s join users u on u.id = s.user_id
     where s.id = ? and s.expires_at > ?`,
    sha256(token),
    now(),
  );
  return row ?? null;
}

export async function signOut(forget: boolean) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return;
  const session = get<{ user_id: string }>("select user_id from sessions where id = ?", sha256(token));
  run("delete from sessions where id = ?", sha256(token));
  if (forget && session) {
    run("delete from sessions where user_id = ?", session.user_id);
    run("delete from credentials where user_id = ?", session.user_id);
  }
}

export function hasPlanUsage(userId: string): boolean {
  return get<{ plan_usage: number }>("select plan_usage from credentials where user_id = ?", userId)?.plan_usage === 1;
}

const DEAD_REFRESH = new Set([
  "invalid_grant",
  "invalid_refresh_token",
  "token_expired",
  "refresh_token_expired",
  "refresh_token_invalidated",
  "refresh_token_reused",
]);

/** A valid access token for the user, refreshed when it is close to expiry. One refresh runs at a time. */
export async function accessToken(userId: string, forceRefresh = false): Promise<string> {
  const row = get<{ client_id: string; access_token_enc: Uint8Array; refresh_token_enc: Uint8Array; expires_at: number }>(
    "select client_id, access_token_enc, refresh_token_enc, expires_at from credentials where user_id = ?",
    userId,
  );
  if (!row) throw new AuthError("signed_out", "Sign in with ChatGPT to continue");
  if (!forceRefresh && row.expires_at - now() > 5 * 60 * 1000) return unseal(row.access_token_enc);

  const inFlight = refreshing.get(userId);
  if (inFlight) return inFlight;

  const task = (async () => {
    const refreshToken = unseal(row.refresh_token_enc);
    try {
      const tokens = await tokenRequest({
        grant_type: "refresh_token",
        client_id: row.client_id,
        refresh_token: refreshToken,
        resource: RESOURCE,
      });
      saveCredentials(userId, row.client_id, tokens, refreshToken);
      return tokens.access_token;
    } catch (error) {
      if (error instanceof AuthError && DEAD_REFRESH.has(error.code)) {
        // The grant is gone for good: drop the tokens so the next request asks the user to sign in again.
        run("delete from credentials where user_id = ?", userId);
        throw new AuthError("signed_out", "Your ChatGPT sign-in has expired. Sign in again to continue");
      }
      throw error;
    } finally {
      refreshing.delete(userId);
    }
  })();
  refreshing.set(userId, task);
  return task;
}

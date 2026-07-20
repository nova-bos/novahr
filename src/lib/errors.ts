/**
 * Turns raw errors (especially Supabase auth failures and network hiccups) into
 * calm, plain-language messages for end users. We never want to show internal
 * hostnames, stack traces, or developer noise like "Failed to fetch" on screen.
 *
 * Works on both the client and the server, so the same wording is used
 * everywhere: sign in, sign up, password reset, and invite acceptance.
 */

interface ErrorLike {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
}

function asErrorLike(error: unknown): ErrorLike {
  if (typeof error === "string") return { message: error };
  if (error && typeof error === "object") return error as ErrorLike;
  return {};
}

/** True when the failure is a network/connectivity problem rather than a real auth response. */
function isNetworkError(e: ErrorLike): boolean {
  const m = (e.message ?? "").toLowerCase();
  return (
    e.name === "TypeError" ||
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("load failed") ||
    m.includes("fetch failed") ||
    m.includes("network request failed")
  );
}

/**
 * Maps an authentication error to a friendly message. Falls back to a safe,
 * generic line so nothing raw ever reaches the user.
 */
export function friendlyAuthError(error: unknown): string {
  const e = asErrorLike(error);
  const code = (e.code ?? "").toLowerCase();
  const msg = (e.message ?? "").toLowerCase();

  // Connectivity first: this is the "Failed to fetch (…supabase.co)" case.
  if (isNetworkError(e)) {
    return "We couldn't reach our servers. Check your internet connection and try again.";
  }

  // Wrong email or password. Kept deliberately vague so we don't reveal which
  // field was wrong (a small but real security nicety).
  if (
    code === "invalid_credentials" ||
    msg.includes("invalid login credentials") ||
    msg.includes("invalid email or password")
  ) {
    return "The email or password you entered is incorrect. Please try again.";
  }

  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return "Please confirm your email first. Check your inbox for the verification link we sent.";
  }

  if (
    code === "user_already_exists" ||
    msg.includes("already registered") ||
    msg.includes("already exists")
  ) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    e.status === 429 ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("for security purposes")
  ) {
    return "Too many attempts. Please wait a minute and try again.";
  }

  if (code === "weak_password" || msg.includes("password should be at least") || msg.includes("weak password")) {
    return "Please choose a stronger password (at least 8 characters).";
  }

  if (code === "same_password" || msg.includes("should be different from the old")) {
    return "Your new password must be different from your current one.";
  }

  if (
    code === "otp_expired" ||
    msg.includes("token has expired") ||
    msg.includes("invalid or has expired") ||
    msg.includes("expired or is invalid")
  ) {
    return "This link has expired or already been used. Please request a new one.";
  }

  if (msg.includes("email address is invalid") || msg.includes("unable to validate email")) {
    return "That email address doesn't look right. Please check it and try again.";
  }

  // Anything else: a calm, generic fallback. Never the raw message.
  return "Something went wrong. Please try again, and contact support if it keeps happening.";
}

/**
 * Picks a visual tone for a friendly message. Only genuine failures (wrong
 * credentials, an unexplained error) read as red "error". Everything else is a
 * calm amber "warning": rate limits, "check your email", expired links and the
 * like are next-step or wait-a-moment states, not alarms.
 */
export function authMessageTone(message: string): "error" | "warning" {
  const m = message.toLowerCase();
  if (m.includes("incorrect") || m.includes("something went wrong")) return "error";
  return "warning";
}

/**
 * Generic version for non-auth flows: prefers a caller-supplied fallback and
 * still shields the user from raw network noise.
 */
export function friendlyError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const e = asErrorLike(error);
  if (isNetworkError(e)) {
    return "We couldn't reach our servers. Check your internet connection and try again.";
  }
  return fallback;
}

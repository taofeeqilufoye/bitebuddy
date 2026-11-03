import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./index.css";

type User = {
  id: number;
  email: string;
};

type FieldErrors = {
  email?: string;
  password?: string;
};

type ApiPayload = {
  user?: User;
  csrfToken?: string;
  message?: string;
  error?: string;
  errors?: FieldErrors;
};

type AuthMode = "signup" | "login";
type AppStatus = "loading" | "signed-out" | "signed-in" | "error";

const requestOptions: RequestCredentials = "same-origin";

async function readPayload(response: Response): Promise<ApiPayload> {
  try {
    return (await response.json()) as ApiPayload;
  } catch {
    return {};
  }
}

function Brand() {
  return (
    <div className="brand" aria-label="BiteBuddy">
      <span className="brand-mark" aria-hidden="true" />
      <span>BiteBuddy</span>
    </div>
  );
}

function AuthPage({
  mode,
  onModeChange,
  csrfToken,
  onAuthenticated,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  csrfToken: string;
  onAuthenticated: (user: User, token: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === "signup";

  function switchMode(nextMode: AuthMode) {
    setFieldErrors({});
    setFormError("");
    setPassword("");
    onModeChange(nextMode);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const nextErrors: FieldErrors = {};
    const normalizedEmail = email.trim();
    if (!normalizedEmail) nextErrors.email = "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Enter an email address in the format name@example.com.";
    }
    if (!password) nextErrors.password = "Enter your password.";
    else if (isSignup && password.length < 12) {
      nextErrors.password = "Use at least 12 characters for your password.";
    } else if (isSignup && new TextEncoder().encode(password).length > 72) {
      nextErrors.password = "Use no more than 72 UTF-8 bytes for your password.";
    }
    setFieldErrors(nextErrors);
    setFormError("");
    if (Object.keys(nextErrors).length > 0) return;

    if (!csrfToken) {
      setFormError("Your secure session is not ready yet. Please try again.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        credentials: requestOptions,
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      const payload = await readPayload(response);
      if (!response.ok) {
        const apiFieldErrors = payload.errors ?? {};
        setFieldErrors({
          email: apiFieldErrors.email,
          password: apiFieldErrors.password,
        });
        setFormError(
          payload.message ||
            payload.error ||
            (response.status === 409
              ? "An account with this email already exists. Try signing in instead."
              : "We couldn't complete that request. Check your details and try again."),
        );
        return;
      }
      if (!payload.user || !payload.csrfToken) {
        setFormError("We received an incomplete response. Please try again.");
        return;
      }
      onAuthenticated(payload.user, payload.csrfToken);
    } catch {
      setFormError("We couldn't reach BiteBuddy. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="form-side" aria-labelledby="auth-heading">
        <Brand />
        <div className="form-wrap">
          <p className="eyebrow">{isSignup ? "A place of your own" : "Welcome back"}</p>
          <h1 id="auth-heading">{isSignup ? "Start your own story." : "Good to see you again."}</h1>
          <p className="intro">
            {isSignup
              ? "Make a private account for the meals, places, and little moments you want to remember."
              : "Sign in to return to your personal restaurant journal."}
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input
                autoComplete="email"
                id="email"
                name="email"
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldErrors((current) => ({ ...current, email: undefined }));
                  setFormError("");
                }}
                disabled={submitting}
                required
              />
              {fieldErrors.email && (
                <p className="field-error" id="email-error">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                autoComplete={isSignup ? "new-password" : "current-password"}
                id="password"
                name="password"
                type="password"
                placeholder={isSignup ? "At least 12 characters" : "Your password"}
                maxLength={72}
                value={password}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFieldErrors((current) => ({ ...current, password: undefined }));
                  setFormError("");
                }}
                disabled={submitting}
                required
              />
              {fieldErrors.password && (
                <p className="field-error" id="password-error">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}

            <button className="primary-button" type="submit" disabled={submitting || !csrfToken}>
              {submitting ? (
                <span>{isSignup ? "Creating your account…" : "Signing you in…"}</span>
              ) : (
                <>
                  <span>{isSignup ? "Create private account" : "Sign in"}</span>
                  <span className="button-arrow" aria-hidden="true">
                    →
                  </span>
                </>
              )}
            </button>
          </form>

          <p className="switch-prompt">
            {isSignup ? "Already have an account?" : "New to BiteBuddy?"}{" "}
            <button
              className="text-button"
              type="button"
              onClick={() => switchMode(isSignup ? "login" : "signup")}
              disabled={submitting}
            >
              {isSignup ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
        <footer className="form-footer">Your account is yours alone.</footer>
      </section>

      <aside className="story-side" aria-label="About your personal restaurant journal">
        <div className="story-kicker">A journal for the good things</div>
        <div className="story-copy">
          <h2>
            Keep the
            <br />
            feeling.
            <br />
            <em>Not just</em>
            <br />
            the check.
          </h2>
          <p>
            A private space for the meals worth remembering, the details worth keeping, and the
            stories that stay with you.
          </p>
        </div>
        <div className="ornament" aria-hidden="true">
          <span>Made for your memories</span>
        </div>
        <div className="story-foot">
          <span>BITEBUDDY PERSONAL</span>
          <span>01 / YOUR OWN TABLE</span>
        </div>
      </aside>
    </main>
  );
}

function WelcomePage({
  user,
  onLogout,
  loggingOut,
  logoutError,
}: {
  user: User;
  onLogout: () => void;
  loggingOut: boolean;
  logoutError: string;
}) {
  return (
    <main className="welcome-layout">
      <header className="welcome-top">
        <Brand />
        <button className="logout-button" type="button" onClick={onLogout} disabled={loggingOut}>
          {loggingOut ? "Signing out…" : "Log out"}
        </button>
      </header>
      <section className="welcome-main" aria-labelledby="welcome-heading">
        <div className="welcome-copy">
          <p className="eyebrow">Your account is ready</p>
          <h1 id="welcome-heading">Welcome to your own little corner.</h1>
          <p>
            This is your private BiteBuddy account. Whenever you’re ready, your food memories will
            have a place to call home.
          </p>
          <span className="welcome-email">{user.email}</span>
          {logoutError && (
            <p className="form-error" role="alert" style={{ marginTop: 22 }}>
              {logoutError}
            </p>
          )}
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="welcome-art-inner">b.</div>
        </div>
      </section>
      <footer className="welcome-bottom">
        <span>BITEBUDDY PERSONAL</span>
        <span>A private account, just for you.</span>
      </footer>
    </main>
  );
}

function App() {
  const [status, setStatus] = useState<AppStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [mode, setMode] = useState<AuthMode>("signup");
  const [initialError, setInitialError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function initialize() {
      setStatus("loading");
      setInitialError("");
      try {
        const csrfResponse = await fetch("/api/csrf", {
          method: "GET",
          credentials: requestOptions,
        });
        if (!csrfResponse.ok) throw new Error("Could not start a secure session.");
        const csrfPayload = await readPayload(csrfResponse);
        if (!csrfPayload.csrfToken) throw new Error("A security token was not returned.");
        if (active) setCsrfToken(csrfPayload.csrfToken);

        const meResponse = await fetch("/api/me", {
          method: "GET",
          credentials: requestOptions,
        });
        if (meResponse.status === 401) {
          if (active) {
            setUser(null);
            setStatus("signed-out");
          }
          return;
        }
        if (!meResponse.ok) throw new Error("We couldn't check your account right now.");
        const mePayload = await readPayload(meResponse);
        if (!mePayload.user) throw new Error("Your account details could not be loaded.");
        if (active) {
          setUser(mePayload.user);
          setStatus("signed-in");
        }
      } catch (error) {
        if (active) {
          setInitialError(
            error instanceof Error ? error.message : "Something went wrong. Please try again.",
          );
          setStatus("error");
        }
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, [retryKey]);

  async function handleLogout() {
    if (!csrfToken || loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: requestOptions,
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({}),
      });
      const payload = await readPayload(response);
      if (!response.ok) {
        setLogoutError(
          payload.message || payload.error || "We couldn't log you out. Please try again.",
        );
        return;
      }

      let nextToken = payload.csrfToken;
      if (!nextToken) {
        const csrfResponse = await fetch("/api/csrf", {
          method: "GET",
          credentials: requestOptions,
        });
        const csrfPayload = await readPayload(csrfResponse);
        if (!csrfResponse.ok || !csrfPayload.csrfToken) {
          setLogoutError("You have been signed out, but we couldn't refresh your secure session.");
          setUser(null);
          setStatus("signed-out");
          return;
        }
        nextToken = csrfPayload.csrfToken;
      }
      setCsrfToken(nextToken);
      setUser(null);
      setStatus("signed-out");
      setMode("signup");
    } catch {
      setLogoutError("We couldn't reach BiteBuddy. Check your connection and try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  if (status === "loading") {
    return (
      <main className="initial-loading" aria-live="polite" aria-busy="true">
        <Brand />
        <div className="loading-mark" aria-hidden="true" />
        <p>Getting your private space ready…</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="initial-error">
        <Brand />
        <p role="alert">{initialError}</p>
        <button
          className="primary-button"
          type="button"
          onClick={() => setRetryKey((key) => key + 1)}
        >
          Try again
        </button>
      </main>
    );
  }

  if (status === "signed-in" && user) {
    return (
      <WelcomePage
        user={user}
        onLogout={handleLogout}
        loggingOut={loggingOut}
        logoutError={logoutError}
      />
    );
  }

  return (
    <div className="app-shell">
      <AuthPage
        mode={mode}
        onModeChange={setMode}
        csrfToken={csrfToken}
        onAuthenticated={(nextUser, nextToken) => {
          setCsrfToken(nextToken);
          setUser(nextUser);
          setStatus("signed-in");
        }}
      />
    </div>
  );
}

export default App;

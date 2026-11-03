import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import RestaurantJournal from "./RestaurantJournal";
import ThemeToggle from "./ThemeToggle";
import "./index.css";
import {
  readThemePreference,
  resolveThemePreference,
  saveThemePreference,
} from "./themePreference";
import type { Theme, ThemePreference, ThemeStorage } from "./themePreference";
import {
  ACCOUNT_LIMITS,
  loginSchema,
  signupSchema,
} from "../../server/validation";

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

function getThemeStorage(): ThemeStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

function AuthPage({
  mode,
  onModeChange,
  csrfToken,
  onAuthenticated,
  theme,
  onToggleTheme,
}: {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  csrfToken: string;
  onAuthenticated: (user: User, token: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [focusFirstError, setFocusFirstError] = useState(false);
  const fieldRefs = {
    email: useRef<HTMLInputElement>(null),
    password: useRef<HTMLInputElement>(null),
  };

  const isSignup = mode === "signup";

  useEffect(() => {
    if (!focusFirstError) return;
    const firstField = (["email", "password"] as const).find(
      (field) => Boolean(fieldErrors[field]),
    );
    if (firstField) fieldRefs[firstField].current?.focus();
    setFocusFirstError(false);
  }, [fieldErrors, focusFirstError]);

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setFormError("");
  }

  function switchMode(nextMode: AuthMode) {
    setFieldErrors({});
    setFormError("");
    setFocusFirstError(false);
    setPassword("");
    onModeChange(nextMode);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const parsed = (isSignup ? signupSchema : loginSchema).safeParse({
      email,
      password,
    });
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (
          (field === "email" || field === "password") &&
          !nextErrors[field]
        ) {
          nextErrors[field] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      setFormError("Please correct the highlighted account details.");
      setFocusFirstError(Object.keys(nextErrors).length > 0);
      return;
    }
    setFieldErrors({});
    setFormError("");
    setFocusFirstError(false);

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
        body: JSON.stringify(parsed.data),
      });
      const payload = await readPayload(response);
      if (!response.ok) {
        const apiFieldErrors = payload.errors ?? {};
        setFieldErrors({
          email: apiFieldErrors.email,
          password: apiFieldErrors.password,
        });
        setFocusFirstError(
          Boolean(apiFieldErrors.email || apiFieldErrors.password),
        );
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
        <div className="auth-topbar">
          <Brand />
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
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
                maxLength={ACCOUNT_LIMITS.emailCharacters}
                placeholder="you@example.com"
                value={email}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearFieldError("email");
                }}
                ref={fieldRefs.email}
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
                maxLength={ACCOUNT_LIMITS.passwordCharacters}
                value={password}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearFieldError("password");
                }}
                ref={fieldRefs.password}
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

function App() {
  const [status, setStatus] = useState<AppStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [csrfToken, setCsrfToken] = useState("");
  const [mode, setMode] = useState<AuthMode>("signup");
  const [initialError, setInitialError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [themePreference, setThemePreference] = useState<ThemePreference>(() =>
    readThemePreference(getThemeStorage(), systemPrefersDark()),
  );
  const theme = themePreference.theme;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (themePreference.explicit) return;
    if (typeof window === "undefined") return;

    let mediaQuery: MediaQueryList;
    try {
      mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    } catch {
      return;
    }

    const followDevicePreference = (event: MediaQueryListEvent) => {
      setThemePreference(resolveThemePreference(null, event.matches));
    };
    mediaQuery.addEventListener("change", followDevicePreference);
    return () =>
      mediaQuery.removeEventListener("change", followDevicePreference);
  }, [themePreference.explicit]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setThemePreference({ theme: nextTheme, explicit: true });
    saveThemePreference(getThemeStorage(), nextTheme);
  }

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
      <RestaurantJournal
        csrfToken={csrfToken}
        onLogout={handleLogout}
        loggingOut={loggingOut}
        logoutError={logoutError}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <div className="app-shell">
      <AuthPage
        mode={mode}
        onModeChange={setMode}
        csrfToken={csrfToken}
        theme={theme}
        onToggleTheme={toggleTheme}
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

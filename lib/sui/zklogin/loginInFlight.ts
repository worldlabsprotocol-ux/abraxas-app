// FILE: lib/sui/zklogin/loginInFlight.ts
// Guards duplicate OAuth starts; must clear on callback success AND failure.
// Prevents duplicate OAuth starts; auto-clears stale locks after abandoned redirects.

const LOGIN_IN_FLIGHT_KEY = "abraxas_zklogin_login_in_flight";
const LOGIN_IN_FLIGHT_TS_KEY = "abraxas_zklogin_login_in_flight_ts";
const STALE_MS = 90_000;

export function isLoginInFlight(): boolean {
  if (typeof window === "undefined") return false;
  clearStaleLoginInFlight();
  return sessionStorage.getItem(LOGIN_IN_FLIGHT_KEY) === "1";
}

export function setLoginInFlight(active: boolean): void {
  if (typeof window === "undefined") return;
  if (active) {
    sessionStorage.setItem(LOGIN_IN_FLIGHT_KEY, "1");
    sessionStorage.setItem(LOGIN_IN_FLIGHT_TS_KEY, String(Date.now()));
  } else {
    sessionStorage.removeItem(LOGIN_IN_FLIGHT_KEY);
    sessionStorage.removeItem(LOGIN_IN_FLIGHT_TS_KEY);
  }
  // Lazy import avoids circular deps when logging from session.ts
  void import("./authDebug").then(({ logAuthEvent }) => {
    logAuthEvent(active ? "login_in_flight_set" : "login_in_flight_cleared", {
      loginInFlight: active,
    });
  });
}

export function clearStaleLoginInFlight(): void {
  if (typeof window === "undefined") return;
  const ts = Number(sessionStorage.getItem(LOGIN_IN_FLIGHT_TS_KEY) ?? "0");
  if (!sessionStorage.getItem(LOGIN_IN_FLIGHT_KEY)) return;
  if (!ts || Date.now() - ts > STALE_MS) {
    setLoginInFlight(false);
  }
}

export function clearLoginInFlight(): void {
  setLoginInFlight(false);
}

# Sprint T — capture spike (T1, O6): go/no-go

**Date:** 2026-10-16 · **Timebox:** 2 h (used about 45 min) · **Verdict: GO, with one design change (below), flagged for the owner's confirmation.**

## What was built

The smallest declarative capture: `plugins/ow-tools/lib/cdp.mjs` (a DevTools-protocol client over `--remote-debugging-pipe`, fixed method allowlist) and a throwaway driver (not committed) that runs **navigate, click, fill (test data), wait for a selector, shot** against a local fixture server on 127.0.0.1. The fixture serves a sign-in page (a password field and a one-time-code field), a page that sets two cookies (one session-only, one with `Max-Age`), an app page, a form, a result page and a redirect to another origin. The profile is a dedicated folder under a temp `capture/<workstream>/`, with the password manager and autofill switched off in its `Preferences` before launch, `First Run` written, and sync, extensions, background networking and the component updater off on the command line. Every navigation goes through the Fetch domain, and anything outside the allowed origin is failed with `BlockedByClient`.

## Environment

Google Chrome 154.0.8037.99 at the standard macOS path · Node 24.19.0 (Node 20 is not installed on this Mac; the pipe uses only `child_process` stdio fds 3 and 4, which Node 20 has, but the spike did not run on Node 20) · macOS on Apple Silicon. Four runs, one per mode pairing.

## Evidence, against the contract's spike questions (Technical approach, step 3)

| Question | Result | Evidence |
|---|---|---|
| CDP over the pipe with the installed Chrome | **Yes** | `Browser.getVersion` answered over fds 3/4; no port opened (the argv has `--remote-debugging-pipe` and no `--remote-debugging-port`). Start to first reply: 0.4–1.1 s |
| Sign-in headed, then capture headless on the same profile | **Partly.** A cookie with an expiry carries over; a **session-only cookie does not** | Fixture server log after the relaunch: cookie names `keep` only, never `sid`. Same result in all four pairings (headed→headless, headed→headed, headless→headless, with and without a start URL), and with `session.restore_on_startup: 1` set in the profile |
| The password-manager and autofill prefs hold | **Yes** | After a headed and then a headless run, `Preferences` still has `credentials_enable_service: false`, `profile.password_manager_enabled: false`, `autofill.profile_enabled: false`, `autofill.credit_card_enabled: false` |
| Chrome with `--headless` and an existing profile | **Works** | Starts in about 0.4 s on the profile the headed run left; clean exit on `Browser.close` (code 0); `pgrep -f <profile>` finds 0 processes afterwards |
| Fixed viewport | **Yes** | `Emulation.setDeviceMetricsOverride` 1280×800, scale 1: every PNG's IHDR is exactly 1280×800, headless and headed (on a Retina display) |
| Navigate, click, fill, wait, shot without evaluating JavaScript | **Yes** | Click: `DOM.querySelector` → `DOM.getBoxModel` → `Input.dispatchMouseEvent` (the server logged `/form`). Fill: `DOM.focus` → `Input.insertText` (the form submitted `customer=Test+Customer+01`). Wait: polling `DOM.querySelector`. No `Runtime.*` method is sent; `Runtime.evaluate` is refused locally by the allowlist before it reaches the pipe |
| Secret fields detectable before typing | **Yes** | `DOM.describeNode` returns `type="password"`, `autocomplete="current-password"`, and `autocomplete="one-time-code"` with `name="otp"` |
| A redirect to another origin is stopped | **Yes** | `Fetch.requestPaused` fires for the redirect hop with `resourceType: Document` and `redirectedRequestId` set; failing it gives `net::ERR_BLOCKED_BY_CLIENT` and the frame shows `chrome-error://`, so no page from the other origin is ever rendered |

## The call, and why

The contract's go criterion is that sign-in happens headed and capture then runs headless on the same profile. That holds only for test environments that keep the sign-in in a cookie with an expiry ("remember me"). **Many keep it in a session-only cookie, and Chrome drops those on every restart.** ow-tools can't carry them over itself: that needs a cookie read (`Network.getCookies`), which C17 forbids, and rightly.

Everything else worked, so this is a narrow fix, not a failure of the approach:

- **`--sign-in` with a plan's steps runs them in the same browser session** after the user has signed in. The plan names a `sign_in.done_selector`; ow-tools opens the headed window at `sign_in.url`, waits (up to `--timeout`, default 300 s) until that selector appears on an allowed origin, then runs the steps in the same window at the fixed viewport and closes it. The session never has to survive a restart. No interactive input is needed, so it runs from Claude Code's Bash tool.
- **Headless `capture` on the stored profile** stays for environments with a persistent sign-in cookie. When the stored session has expired, the first step whose selector isn't there stops the run with the reason `selector-not-found` and the next step says to run `--sign-in`.
- No new CDP method, no cookie or storage read, no JavaScript evaluation; C16–C21 are unchanged.

**Ambiguity, recorded for the owner:** the contract says capture "runs a capture plan headless". With this change, a run that starts with `--sign-in` captures in the visible window instead. I read that as within O1 (b) and O6, because the plan, guards and outputs are identical and only the window is visible. **If the owner wants headless-only capture, 1.1.0 can still ship it, limited to persistent-cookie environments, by dropping the steps from `--sign-in`.**

## Residuals the spike found (for the security review)

- **The profile's cookies are protected by folder permissions only.** `--use-mock-keychain` keeps Chrome from adding a "Chrome Safe Storage" item to the user's login keychain and from prompting for it during a headless run, but the cookie store is then encrypted with a fixed key. The profile folder is 0700 under the ow-tools data folder; the design must say so, and the profile is on ow-handoff's access-removal list (H3).
- **The browser's own background traffic** (not the page's) is reduced by flags (`--disable-background-networking`, `--disable-component-update`, `--disable-sync`, `--no-proxy-server`, and a `--host-resolver-rules` map that resolves only the allowed hosts), not by the Fetch guard, which sees only the page's requests. The design states it as reduced, not as none.
- **Workers:** the Fetch guard is attached to the page target. The host-resolver map covers worker requests to other hosts; a worker request to an allowed host on another port or scheme is not intercepted. Low: the host is one the plan allows.

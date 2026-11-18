# Firebase Authentication — Step 2

## Files changed
- `index.html`: loads Firebase Auth compat SDK 10.12.0; login identifier now accepts admin email or legacy customer username.
- `js/firebase/init.js`: initializes `auth` and `db` once; configures Firestore long polling once; sets Auth local persistence.
- `js/config/constants.js`: sets admin UID to `MiiCu1YFHKOwhVcB48OAxR8ImRg2` and admin email to `thanhminhcacchu@thanhminhcacchu.com`.
- `js/features/auth.js`: admin sign-in uses Firebase email/password and verifies exact UID; other Firebase UIDs are signed out; customer legacy passwordHash login is retained unchanged; logout signs out Firebase Auth.
- `js/app.js`: never restores admin privilege from localStorage; restores admin only from Firebase Auth current session matching the configured UID.
- `firebaserulev1.rules`: admin UID constant updated to the supplied UID. NOT published.

## Data preservation
No Firestore collection/document is deleted, renamed, rewritten, or migrated by these changes. Existing customer records and `passwordHash` login flow remain unchanged. This is intentional; customer migration to Firebase Auth is a separate step and must be planned without bulk deletion.

## Important limitations / deployment warning
1. These changes have passed JavaScript syntax checks only. They have not been tested against the user's live Firebase project or real credentials.
2. Do NOT publish `firebaserulev1.rules` yet. The existing application has legacy customer reads/writes that may not satisfy UID-based rules. Publishing prematurely can interrupt the shop.
3. Firebase Authentication admin login succeeds only if the account at the supplied email actually has UID `MiiCu1YFHKOwhVcB48OAxR8ImRg2` in the same Firebase project configured in `init.js`.
4. If the login fails, inspect the exact Firebase Auth error in DevTools Console. Never share the password.
5. Deploy all changed files together. Do not upload only `index.html`; the scripts must be version-consistent.

## Test
- Deploy to a test branch/site first.
- Hard refresh (Ctrl+Shift+R).
- DevTools Console should not show Firebase initialization or syntax errors.
- Sign in using the admin email and password.
- The app checks `auth.currentUser.uid` against the configured UID before rendering admin UI.
- Refresh: admin session should restore from Firebase Auth.
- Logout: Firebase Auth session should end.
- Verify customer legacy login still works and customer Firestore data is unchanged.


## Step 2.1 — Admin email correction
- Corrected `ADMIN_EMAIL` to the exact Firebase Authentication email supplied by the owner: `thanhminhcacchu@thanhminhcacchu.com`.
- Kept the verified UID `MiiCu1YFHKOwhVcB48OAxR8ImRg2` unchanged.
- Added a specific user-facing explanation for `auth/configuration-not-found`. This error is not fixed by changing the password or UID; if it persists, verify that Authentication has been initialized for the same Firebase project and that the Web API key belongs to that project and allows Identity Toolkit API access.
- No Firestore data is read-modified-written, deleted, migrated, or renamed by this patch.

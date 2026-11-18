# Firebase Authentication — Step 2

## Files changed
- `index.html`: loads Firebase Auth compat SDK 10.12.0; login identifier now accepts admin email or legacy customer username.
- `js/firebase/init.js`: initializes `auth` and `db` once; configures Firestore long polling once; sets Auth local persistence.
- `js/config/constants.js`: sets admin UID to `MiiCu1YFHKOwhVcB48OAxR8ImRg2` and admin email to `thanhminhcacchu@thanhminhcacchu`.
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

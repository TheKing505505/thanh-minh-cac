# Firebase diagnostic + source patch 3.1

## What this patch fixes

1. `js/admin/dashboard.js`: users and orders are loaded independently. An Orders permission error will no longer prevent the customer list from rendering.
2. `js/data/cards.js`: card submission errors are separated into profile lookup vs card document creation. Console logs include only project ID, UID, document ID, error code and field names; they do not log card serial/code values.
3. `js/features/auth.js`: after successful customer registration/login, customer listeners are started explicitly. This covers the case where the Auth observer intentionally ignored the create-user event during registration.

## Important

This patch does not loosen Firestore Security Rules. `Missing or insufficient permissions` means the deployed Rules rejected a request. Do not replace Rules with `allow read, write: if true`.

The provided v3 Rules expect:
- Auth UID in `users/{usernameLower}.uid`.
- Document ID `users/{usernameLower}` where `usernameLower` is the trimmed lowercase username.
- Card request fields: `id`, `uid`, `username`, `usernameLower`, `type`, `denom`, `serial`, `code`, `time`, `timestamp`, `status`, `note`.

## Read-only diagnostic in Chrome DevTools

Run this while signed in as the affected customer. It only reads data; it does not create, update, or delete anything.

```javascript
(async () => {
  const app = firebase.app();
  const fbUser = firebase.auth().currentUser;
  const fs = firebase.firestore();

  console.log('PROJECT:', app.options.projectId);
  console.log('AUTH:', fbUser ? { uid: fbUser.uid, email: fbUser.email } : null);
  if (!fbUser) return console.error('No Firebase Auth session.');

  try {
    const query = await fs.collection('users')
      .where('uid', '==', fbUser.uid).limit(2).get();
    console.log('OWN PROFILE QUERY:', query.size, 'document(s)');
    if (query.empty) return console.error('No users profile is linked to this Auth UID.');

    const doc = query.docs[0];
    const profile = doc.data();
    const expectedId = String(profile.username || '').trim().toLowerCase();
    console.log('PROFILE CHECK:', {
      documentId: doc.id,
      expectedDocumentId: expectedId,
      usernameLower: profile.usernameLower,
      uidMatches: profile.uid === fbUser.uid,
      disabled: profile.disabled === true
    });

    try {
      const exact = await fs.collection('users').doc(expectedId).get();
      console.log('EXPECTED PROFILE PATH:', exact.exists ? 'exists' : 'MISSING');
    } catch (e) {
      console.error('EXPECTED PROFILE PATH READ:', e.code, e.message);
    }

    try {
      const cards = await fs.collection('cards')
        .where('uid', '==', fbUser.uid).limit(2).get();
      console.log('OWN CARDS QUERY: OK,', cards.size, 'document(s)');
    } catch (e) {
      console.error('OWN CARDS QUERY:', e.code, e.message);
    }
  } catch (e) {
    console.error('OWN PROFILE QUERY:', e.code, e.message);
  }
})();
```

Then sign in as admin and run this separate read-only check:

```javascript
(async () => {
  const app = firebase.app();
  const fbUser = firebase.auth().currentUser;
  const fs = firebase.firestore();
  console.log('PROJECT:', app.options.projectId);
  console.log('ADMIN UID:', fbUser && fbUser.uid);
  for (const name of ['users', 'orders', 'cards', 'titlepurchases']) {
    try {
      const snap = await fs.collection(name).limit(5).get();
      console.log(name + ': OK,', snap.size, 'document(s) in sample');
    } catch (e) {
      console.error(name + ':', e.code, e.message);
    }
  }
})();
```

## What must be checked in Firebase Console

Open the project `thanh-minh-cac-41666` → Firestore Database → Rules. Confirm the currently published Rules contain the `match /cards/{cardId}` block and `match /users/{usernameLower}` block from the matched v3 Rules, and that `isAdmin()` uses the confirmed admin UID `MiiCu1YFHKOwhVcB48OAxR8ImRg2`.

If the customer profile query succeeds but the card write is denied, test the card create rule using the exact field names above in Rules Playground. Do not expose the card serial or code in screenshots or chat.

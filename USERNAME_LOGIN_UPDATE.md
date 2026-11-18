# Username-only customer login update

## New customer accounts
- Register with a username containing 2–32 ASCII letters, digits, dots, underscores, or hyphens.
- Firebase Authentication email is generated as `<username-lowercase>@thanhminhcacuser.com`.
- The real Gmail field is optional and is stored as the contact `email` in Firestore.
- Firestore also stores `authEmail` so the internal login identity is explicit.

## Login
- Customers enter only their username and password. The website appends `@thanhminhcacuser.com`.
- Admin continues entering the existing admin email and password; an input containing `@` is passed through unchanged.
- Existing customers created before this change are not automatically migrated. They can continue using their previous Firebase Auth email and password. Do not delete or recreate their accounts.

## Deployment
1. Back up the current GitHub repository.
2. Upload the complete contents of this ZIP.
3. Publish the bundled `firebaserulev3.rules` to the same Firebase project. The `users` create rule must allow `authEmail` and validate it as a string.
4. Test with a new username and a test password. Verify Authentication shows `<username>@thanhminhcacuser.com` and Firestore `users/<username-lowercase>` contains the same UID.
5. Verify admin login still works with the admin's existing email.

The suffix is an internal Firebase Authentication alias, not a real mailbox. Customers cannot receive email at it. They should provide a real Gmail if they want the shop to contact them by email or if future account recovery uses email.

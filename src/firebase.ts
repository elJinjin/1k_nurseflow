// Local fallback for Firebase when running in a purely local/offline mode.
// We keep the `db`, `auth`, and `signInAnonymous` exports so the rest of
// the app can remain mostly unchanged while using the local shim.

export const db: any = {}; // placeholder — localFirestore functions ignore this arg

export const auth: any = {
  currentUser: undefined
};

export const signInAnonymous = async () => {
  if (!auth.currentUser) {
    auth.currentUser = {
      uid: 'local-anon',
      email: null,
      emailVerified: undefined,
      isAnonymous: true,
      tenantId: null,
      providerData: [],
    };
    console.log('Signed in anonymously (local)');
  }
};

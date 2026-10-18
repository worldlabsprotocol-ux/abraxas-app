// FILE: lib/auth/nativeAccount/storeErrors.ts

export class NativeAccountStoreUnavailableError extends Error {
  constructor() {
    super("native_account_store_unavailable");
  }
}

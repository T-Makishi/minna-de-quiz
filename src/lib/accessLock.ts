const ACCESS_KEY = 'minna_quiz_access_granted';

export function isAccessLockEnabled(accessPassphraseHash: string) {
  return accessPassphraseHash.length > 0;
}

export function hasAccessGrant(accessPassphraseHash: string) {
  if (!isAccessLockEnabled(accessPassphraseHash)) return true;
  return sessionStorage.getItem(ACCESS_KEY) === accessPassphraseHash;
}

export function grantAccess(accessPassphraseHash: string) {
  if (!isAccessLockEnabled(accessPassphraseHash)) return;
  sessionStorage.setItem(ACCESS_KEY, accessPassphraseHash);
}

export function revokeAccess() {
  sessionStorage.removeItem(ACCESS_KEY);
}

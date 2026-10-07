#!/usr/bin/env bash
# Build Abraxas holder Android APK artifacts (debug + optional release).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"

echo "==> Sync Capacitor Android project"
npm run android:sync

echo "==> Build debug APK"
(cd android && ./gradlew assembleDebug --no-daemon)

DEBUG_APK="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
if [[ -f "$DEBUG_APK" ]]; then
  echo "DEBUG_APK=$DEBUG_APK"
  echo "DEBUG_SHA256=$(sha256sum "$DEBUG_APK" | awk '{print $1}')"
  echo "DEBUG_SIZE=$(stat -c%s "$DEBUG_APK") bytes"
fi

KEYSTORE_PROPS="$ROOT/android/keystore.properties"
if [[ -f "$KEYSTORE_PROPS" ]]; then
  echo "==> Build signed release APK"
  (cd android && ./gradlew assembleRelease --no-daemon)
  RELEASE_APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
  if [[ -f "$RELEASE_APK" ]]; then
    echo "RELEASE_APK=$RELEASE_APK"
    echo "RELEASE_SHA256=$(sha256sum "$RELEASE_APK" | awk '{print $1}')"
    echo "RELEASE_SIZE=$(stat -c%s "$RELEASE_APK") bytes"
  fi
else
  echo "RELEASE_SIGNING=APK_BUILD_READY_SIGNING_REQUIRED (no android/keystore.properties)"
fi

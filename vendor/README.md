# Vendored native dependencies

## `react-native-pdfium/`

- Source repository: `https://github.com/NorbertKlockiewicz/react-native-pdfium`
- Source application: Software Mansion Private Mind, reviewed at commit `ec8fe0974659f5b743abade7946a6e3a25b4aa7f`
- Package license: MIT
- Original tarball SHA-256: `578c1614b857d2be4aff6a3c32adcf3c2f1c2ef65313b2b8161b56771df2333a`
- Local compatibility patch: removed two unused legacy React Native JNI includes that no
  longer exist in React Native 0.86.
- Local compatibility patch: disabled Prefab publishing. The module is loaded through its
  Kotlin/JSI bridge and its generated TurboModule spec; publishing its internal native
  library as an app-level Prefab package creates an invalid dependency edge under AGP 9.

This unpublished package is included only for the Expo 57 compatibility spike. Do not treat PDF support as shipped until text extraction passes on the supported native targets.

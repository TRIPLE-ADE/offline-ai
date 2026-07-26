# Offline Study Coach

An Expo 57 development-build project for a local-first study coach. Stages 0–3
establish the product boundary, the native AI/document dependency set, local
SQLite persistence, material import, deterministic chunking, on-device MiniLM
embeddings, persistent vector search, and grounded source retrieval.

The app uses native modules such as React Native ExecuTorch, OP-SQLite, and
PDFium. It therefore requires a development build and does not run in Expo Go.

## SQLite responsibility boundary

The two SQLite integrations are intentional and must remain separate:

- **Expo SQLite** owns relational product metadata, migrations, materials,
  chunks, progress, artifacts, and chat records.
- **OP-SQLite with LibSQL** owns the specialized embedding/vector index used by
  offline semantic retrieval.

On iOS both upstream libraries inherit SQLite's common `SQLITE3_H` include
guard. The local Expo config plugin isolates the Expo SQLite umbrella import
during CocoaPods installation so both engines can coexist without merging
their responsibilities.

## Current Stage 3 flow

```text
Import TXT or clean PDF
→ extract selectable text
→ build deterministic overlapping passages
→ generate MiniLM embeddings on-device
→ persist vectors in OP-SQLite
→ search the material locally
→ inspect the retrieved source passages
```

TXT is the guaranteed format. PDF extraction is available as a compatibility
candidate, but the current PDFium bridge does not preserve page-level
provenance. Topic generation, lessons, quizzes, and generated chat answers
remain later stages.

## Requirements

- Node.js 24
- pnpm 11
- Xcode with an iOS 17+ simulator runtime
- Android Studio, Android SDK, and Java 17

## Install and verify

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm dlx expo-doctor@latest
```

## Generate native projects

The `ios/` and `android/` directories are generated from `app.json` and the
installed Expo config plugins.

```bash
pnpm prebuild
```

Use a clean prebuild after changing native dependencies or config plugins:

```bash
pnpm prebuild:clean
```

The clean command replaces generated native directories, so do not keep
handwritten native changes there.

## Development server

```bash
pnpm start:dev-client
```

## iOS simulator

Build, install, and launch on a selected simulator:

```bash
pnpm exec expo run:ios --device
```

To compile without launching a simulator:

```bash
xcodebuild \
  -workspace ios/OfflineStudyCoach.xcworkspace \
  -scheme OfflineStudyCoach \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO \
  build
```

The project uses an iOS 17.0 minimum deployment target because the installed
ExecuTorch native package requires it.

## Android emulator

Start an emulator in Android Studio, then build, install, and launch:

```bash
pnpm exec expo run:android --device
```

To build the development APK without installing it:

```bash
cd android
./gradlew app:assembleDebug
```

The APK is generated at:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

## Physical Android device — final compatibility gate

Leave this until simulator and emulator checks pass. Enable developer options
and USB debugging, connect the device, and verify its serial:

```bash
adb devices -l
```

Then either let Expo select the connected device:

```bash
pnpm exec expo run:android --device
```

or install the already-built APK explicitly:

```bash
adb -s <physical-device-serial> install -r \
  android/app/build/outputs/apk/debug/app-debug.apk
adb -s <physical-device-serial> reverse tcp:8081 tcp:8081
pnpm start:dev-client
```

Run the offline model download and inference checks on the physical device.
Simulators and emulators prove native integration and UI startup, but they do
not replace device-specific memory, storage, and accelerator validation.

## Useful project documents

- [Architecture and implementation plan](./OFFLINE_STUDY_COACH_ARCHITECTURE_AND_IMPLEMENTATION_PLAN.md)
- [Incremental delivery stages](./INCREMENTAL_DELIVERY_STAGES.md)
- [Expo 57 dependency matrix](./EXPO_57_DEPENDENCY_MATRIX.md)
- [Stage 0 fixture contract](./fixtures/README.md)

# Soma Offline

An Expo 57 development-build project for a private, local-first study coach. The
deadline MVP turns one material into an ordered topic roadmap, grounded
lessons, five-question knowledge checks, rule-based next recommendations, and
a persisted Chat with Material experience.

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

## Complete offline learning flow

```text
Import TXT or clean PDF
→ extract selectable text
→ build deterministic overlapping passages
→ generate MiniLM embeddings on-device
→ persist vectors in OP-SQLite
→ generate and persist a source-covered topic roadmap
→ generate one cited lesson on demand
→ generate and score five grounded questions
→ persist progress and recommend the next action
→ ask cited follow-up questions from fresh retrieved context
```

TXT is the guaranteed format. PDF extraction is available as a compatibility
candidate, but the current PDFium bridge does not preserve page-level
provenance. When a page number is unavailable, the interface uses the stored
section title or source-passage ordinal and never invents a page number.

## Generation safety and recovery

- Model output for topic maps, lessons, and quizzes is validated with Zod.
- Malformed JSON receives one local repair attempt.
- Topic generation has a deterministic, source-covered fallback.
- Lessons and quizzes are not published unless their citation labels resolve
  to stored chunks.
- Quiz scoring and recommendation thresholds run deterministically in
  TypeScript.
- Chat persists the learner question before generation, uses only four prior
  conversational messages, retrieves fresh material context for every turn,
  and refuses low-evidence questions.
- Completed roadmaps, lessons, quizzes, attempts, and chat messages survive
  application restarts.

## Repeatable deadline demo

Use [`fixtures/demo/database-normalization.txt`](./fixtures/demo/database-normalization.txt)
and validate against
[`fixtures/demo/expected-results.json`](./fixtures/demo/expected-results.json).

1. Open **Offline model setup** and load MiniLM and Gemma while online.
2. Import `database-normalization.txt`.
3. Prepare the material and wait for its local vector index.
4. Turn on airplane mode.
5. Generate the topic roadmap and open **Second Normal Form**.
6. Generate the grounded lesson and inspect at least one source chip.
7. Generate the quiz, answer all five questions, and inspect the recommendation.
8. In **Ask this material**, ask:
   - `What condition does Second Normal Form add beyond First Normal Form?`
   - `Who invented database normalization?`
9. Confirm the first answer is cited and the second is refused.
10. Force-close and reopen the app; confirm the roadmap, lesson, attempt, and
    chat thread remain available.

The complete physical-device offline run is a release gate; native compilation
and unit tests cannot prove model quality or device-specific memory behavior.

## Current limitations

- no OCR or scanned-PDF support
- no DOCX, PowerPoint, audio, or image input
- no multi-material courses or semester calendar
- no cloud backup, account, analytics backend, or sync
- no probabilistic mastery engine or exam-readiness score
- locally generated content can still be wrong, so factual views expose source
  provenance for learner inspection

## Open-source attribution

The app is built with Expo, React Native ExecuTorch, React Native RAG,
OP-SQLite, Expo SQLite, MiniLM embeddings, and Gemma 4 E2B. Its model-lifecycle,
persistence, and local-RAG approach was informed by Software Mansion's
[Private Mind](https://github.com/software-mansion-labs/private-mind)
production reference.

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

- [Soma Offline product design and React Native handoff](./SOMA_OFFLINE_PRODUCT_DESIGN_SPEC.md)
- [Architecture and implementation plan](./OFFLINE_STUDY_COACH_ARCHITECTURE_AND_IMPLEMENTATION_PLAN.md)
- [Incremental delivery stages](./INCREMENTAL_DELIVERY_STAGES.md)
- [Expo 57 dependency matrix](./EXPO_57_DEPENDENCY_MATRIX.md)
- [Stage 0 fixture contract](./fixtures/README.md)

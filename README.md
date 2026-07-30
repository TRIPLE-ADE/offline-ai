# LearnGuide

**Your offline study guide.**

LearnGuide is a private, local-first mobile study coach built with Expo and
React Native. It turns a learner's own TXT or selectable-text PDF material into
an ordered topic roadmap, grounded lessons, five-question quizzes, progress
tracking, deterministic next-study recommendations, and cited material chat.

The learning workflow runs on the device. A network connection is needed to
download the AI model files the first time, but imported materials and generated
learning data remain local and can be used offline afterward.

## What LearnGuide does

1. Imports one TXT or clean, selectable-text PDF of up to 25 MB.
2. Extracts and divides the material into source passages.
3. Creates local embeddings and a searchable vector index.
4. Builds an ordered, source-backed topic roadmap.
5. Generates cited lessons and five-question knowledge checks.
6. Tracks topic progress and recommends the next study action.
7. Answers questions using only evidence retrieved from the selected material.

LearnGuide is a guided study product, not a general-purpose chatbot. Lessons,
quizzes, and answers must stay grounded in the learner's stored source passages.

## Current scope

The MVP supports:

- Android and iOS through an Expo development or production build;
- TXT files and PDFs containing selectable text;
- private, on-device storage and inference;
- light and dark appearance;
- material-scoped chat with citations;
- persisted lessons, quizzes, attempts, progress, and chat history.

It does not currently support:

- Expo Go;
- scanned or image-only PDFs and OCR;
- accounts, cloud sync, or cross-device backup;
- multiple materials combined into one course;
- lecturer or institution features;
- calendar-based study planning.

## Technology

| Area | Implementation |
| --- | --- |
| Application | Expo SDK 57, React Native 0.86, TypeScript |
| Navigation | Expo Router |
| UI | Uniwind, React Native primitives, `@expo/ui` |
| Local relational data | Expo SQLite |
| Vector index | OP-SQLite/LibSQL through React Native RAG |
| On-device AI | React Native ExecuTorch |
| Generation model | Gemma 4 E2B |
| Embedding model | all-MiniLM-L6-v2 |
| PDF extraction | Local `react-native-pdfium` package |
| State and validation | Zustand and Zod |
| Tests | Jest and React Native Testing Library |

The two SQLite integrations intentionally have separate responsibilities:
Expo SQLite stores product data, while OP-SQLite/LibSQL owns vector retrieval.
The iOS prebuild plugin in
`plugins/with-expo-sqlite-header-isolation.js` keeps their native headers
isolated.

## Requirements

Install the following before running the project:

- Node.js 24;
- Corepack with pnpm 11.16.0;
- Java 17;
- Android Studio with an Android SDK and emulator, or an Android device with
  USB debugging enabled;
- Xcode and CocoaPods for iOS development;
- macOS for iOS builds.

Offline inference should be tested on a physical device. LearnGuide rejects the
model download on physical devices with less than 4 GB of reported memory.
Devices with at least 8 GB can keep both AI runtimes resident; lower supported
devices switch between them to conserve memory.

## Install

```bash
git clone <repository-url>
cd offline-ai
corepack enable
corepack prepare pnpm@11.16.0 --activate
pnpm install --frozen-lockfile
```

No application API key or `.env` file is required for the current offline MVP.
Use the project scripts rather than invoking Expo directly so the development
app receives its `.dev` package identifier and can coexist with production.

## Run locally

This project contains native modules and cannot run in Expo Go.

### Android emulator

Start an Android emulator, then run:

```bash
pnpm prebuild
pnpm android
```

### Physical Android device

Enable Developer options and USB debugging, connect the device, and confirm it
is visible:

```bash
adb devices
pnpm android --device
```

### iOS simulator

```bash
pnpm prebuild
pnpm ios
```

The simulator is useful for navigation and interface testing. Validate model
download, memory behavior, heat, and inference performance on a physical
device.

### Start Metro after the development build is installed

Once the native development app is on the simulator or device, normal
JavaScript and TypeScript changes only require Metro:

```bash
pnpm start:dev-client
```

Rebuild the native app after changing native dependencies, Expo plugins,
`app.config.ts`, or local native packages.

## First run

1. Complete onboarding or choose **Skip for now** on the model-download step.
2. Open Home without being forced to install the model or import a file.
3. Download the offline AI from Home or Settings when ready.
4. Import a TXT or selectable-text PDF from Home.
5. Prepare the material to create its local source passages and vector index.
6. Create the roadmap, open a topic, and generate a lesson or quiz.

Model installation, onboarding completion, and material import are independent
persisted states. Removing the model does not remove saved materials or study
history.

## EAS builds

The EAS project is already linked in `app.config.ts`.

Authenticate first:

```bash
npx eas-cli@latest login
```

Create an installable Android development build:

```bash
npx eas-cli@latest build --platform android --profile development
```

Create an iOS simulator development build:

```bash
npx eas-cli@latest build --platform ios --profile development-simulator
```

Create an internal production APK:

```bash
npx eas-cli@latest build --platform android --profile production-apk
```

Create store production builds:

```bash
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

Development uses `com.tripletech.offlineai.dev`; production uses
`com.tripletech.offlineai`, so both variants can be installed on one device.

## Quality checks

Run the complete local verification suite before handing off a change:

```bash
pnpm verify
```

Individual checks are also available:

```bash
pnpm typecheck
pnpm lint
pnpm test --runInBand
pnpm doctor
```

Tests live under `src/**/__tests__`. The deterministic material fixture used by
the ingestion and retrieval tests lives under `fixtures/demo`.

## Project structure

```text
src/
├── ai/             # Model installation, runtime ownership, memory and inference
├── app/            # Expo Router routes and route groups
├── chat/           # Grounded material-chat policies and persistence
├── components/     # Shared product and foundation UI
├── db/             # Expo SQLite schema, repositories and migrations
├── learning/       # Roadmaps, lessons, quizzes and recommendations
├── materials/      # Import, extraction, chunking and preparation
├── retrieval/      # Embeddings, vector index and grounded context selection
├── screens/        # Screen implementations
├── stores/         # Application and learning overview state
└── theme/          # Appearance persistence and semantic colors

assets/             # App icon, splash and brand assets
fixtures/demo/      # Deterministic test material
plugins/            # Expo config plugins
vendor/             # Required local native packages
```

## Common issues

### “This project cannot run in Expo Go”

Expected. Install a development build with `pnpm android`, `pnpm ios`, or an
EAS development profile.

### The app cannot generate a lesson, quiz, or answer

Confirm that both offline AI resources are installed and that the material has
finished preparation. Model download can be retried from Home or Settings.

### A PDF imports but has no usable text

Only PDFs containing selectable text are supported. Export the document with a
text layer or use a TXT version; scanned PDFs require OCR, which is outside the
current MVP.

### The model download is unavailable

Use a physical device with at least 8 GB of memory and enough free storage for
the model files. The app verifies the actual downloaded resources rather than
trusting only a saved status flag.

### Native build behavior does not match the latest config

Regenerate and rebuild the native projects:

```bash
pnpm prebuild:clean
pnpm android
```

Use `pnpm ios` instead of `pnpm android` for iOS. The `ios/` and `android/`
directories are generated outputs and should not contain durable manual
changes.

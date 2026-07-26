#pragma once

#include <ReactCommon/CallInvokerHolder.h>
#include <fbjni/fbjni.h>

#include <memory>
#include <utility>

namespace rnpdfium {

using namespace facebook;
using namespace react;

class PdfiumInstallerModule : public jni::HybridClass<PdfiumInstallerModule> {
public:
  // CORRECTED: This now points to the correct Kotlin class.
  static auto constexpr kJavaDescriptor = "Lcom/pdfium/PdfiumInstaller;";

  static jni::local_ref<PdfiumInstallerModule::jhybriddata>
  initHybrid(jni::alias_ref<jhybridobject> jThis, jlong jsContext,
             jni::alias_ref<facebook::react::CallInvokerHolder::javaobject>
                 jsCallInvokerHolder);

  static void registerNatives();

  void injectJSIBindings();

private:
  friend HybridBase;

  jni::global_ref<PdfiumInstallerModule::javaobject> javaPart_;
  jsi::Runtime *jsiRuntime_;
  std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker_;

  explicit PdfiumInstallerModule(
      jni::alias_ref<PdfiumInstallerModule::jhybridobject> &jThis,
      jsi::Runtime *jsiRuntime,
      const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker);
};

} // namespace rnpdfium

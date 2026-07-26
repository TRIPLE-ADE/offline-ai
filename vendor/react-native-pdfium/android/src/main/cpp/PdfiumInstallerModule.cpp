#include "PdfiumInstallerModule.h"
#include "../../common/rnpdfium/RnPdfiumInstaller.h" // Your core logic header

#include <jni.h>
#include <jsi/jsi.h>

namespace rnpdfium {

using namespace facebook::jni;

// CORRECTED: Constructor now accepts CallInvoker.
PdfiumInstallerModule::PdfiumInstallerModule(
    jni::alias_ref<PdfiumInstallerModule::jhybridobject> &jThis,
    jsi::Runtime *jsiRuntime,
    const std::shared_ptr<facebook::react::CallInvoker> &jsCallInvoker)
    : javaPart_(make_global(jThis)), jsiRuntime_(jsiRuntime),
      jsCallInvoker_(jsCallInvoker) {}

jni::local_ref<PdfiumInstallerModule::jhybriddata>
PdfiumInstallerModule::initHybrid(
    jni::alias_ref<jhybridobject> jThis, jlong jsContext,
    jni::alias_ref<facebook::react::CallInvokerHolder::javaobject>
        jsCallInvokerHolder) {
  auto jsCallInvoker = jsCallInvokerHolder->cthis()->getCallInvoker();
  auto rnRuntime = reinterpret_cast<jsi::Runtime *>(jsContext);
  return makeCxxInstance(jThis, rnRuntime, jsCallInvoker);
}

void PdfiumInstallerModule::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybrid", PdfiumInstallerModule::initHybrid),
      makeNativeMethod("injectJSIBindings",
                       PdfiumInstallerModule::injectJSIBindings),
  });
}

void PdfiumInstallerModule::injectJSIBindings() {
  PdfiumInstaller::injectJSIBindings(jsiRuntime_, jsCallInvoker_);
}

} // namespace rnpdfium

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  return facebook::jni::initialize(
      vm, [] { rnpdfium::PdfiumInstallerModule::registerNatives(); });
}

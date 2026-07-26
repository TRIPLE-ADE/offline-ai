#include "NativeRNPdfium.h"
#include "RNPdfiumHostObject.h"

namespace facebook::react {

NativeRNPdfium::NativeRNPdfium(std::shared_ptr<CallInvoker> jsInvoker)
    : NativeRNPdfiumCxxSpec(jsInvoker) {}

NativeRNPdfium::~NativeRNPdfium() {}

jsi::Object NativeRNPdfium::createRNPdfium(jsi::Runtime &runtime,
                                           RNPdfiumConfig config) {
  auto instance = std::make_shared<RNPdfiumHostObject>();
  return jsi::Object::createFromHostObject(runtime, instance);
}

} // namespace facebook::react
#pragma once

#if __has_include(<React-Codegen/RNPdfiumTurboSpecJSI.h>)
// CocoaPods include (iOS)
#include <React-Codegen/RNPdfiumTurboSpecJSI.h>
#elif __has_include(<RNPdfiumTurboSpecJSI.h>)
// CMake include on Android
#include <RNPdfiumTurboSpecJSI.h>
#else
#error Cannot find react-native-pdfium spec! Try cleaning your cache and re-running CodeGen!
#endif

// The RNFPdfiumTurboConfiguration type from JS
using RNPdfiumTurboConfig =
    RNPdfiumTurboModuleConfiguration<std::string, std::string, std::string,
                                     std::string, std::string, std::string,
                                     std::string, std::string, std::string,
                                     std::string, std::string>;
template <>
struct Bridging<RNFPdfiumConfig>
    : RnPdfiumConfigurationBridging<RNFPdfiumConfig> {};

namespace facebook::react {

// The TurboModule itself
class NativeRNPdfium : public NativeRNPdfiumCxxSpec<NativeRNPdfium> {
public:
  NativeRNPdfium(std::shared_ptr<CallInvoker> jsInvoker);
  ~NativeRNPdfium();

  jsi::Object createRNPdfium(jsi::Runtime &runtime, RNFPdfiumConfig config);
};

} // namespace facebook::react
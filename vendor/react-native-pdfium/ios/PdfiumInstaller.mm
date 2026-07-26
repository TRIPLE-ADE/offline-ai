#import "PdfiumInstaller.h"

#import <React/RCTBridge+Private.h>
#import <React/RCTCallInvoker.h>
#import <ReactCommon/RCTTurboModule.h>
#include <stdexcept>
#include <rnpdfium/RnPdfiumInstaller.h>

using namespace facebook::react;

@interface RCTBridge (JSIRuntime)
- (void *)runtime;
@end

@implementation PdfiumInstaller

@synthesize callInvoker = _callInvoker;

RCT_EXPORT_MODULE(PdfiumInstaller)

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(install) {
  auto jsiRuntime =
      reinterpret_cast<facebook::jsi::Runtime *>(self.bridge.runtime);
  auto jsCallInvoker = _callInvoker.callInvoker;

  assert(jsiRuntime != nullptr);

  rnpdfium::PdfiumInstaller::injectJSIBindings(
      jsiRuntime, jsCallInvoker);

  NSLog(@"Successfully installed JSI bindings for react-native-pdfium!");
  return @true;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativePdfiumSpecJSI>(params);
}

@end


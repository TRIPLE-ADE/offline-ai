#pragma once

#include <ReactCommon/CallInvoker.h>
#include <jsi/jsi.h>
#include <memory>

namespace rnpdfium {

using namespace facebook;

/**
 * @class PdfiumInstaller
 * @brief Installs the JSI bindings for the react-native-pdfium library.
 */
class PdfiumInstaller {
public:
  /**
   * @brief Injects the JSI bindings into the JavaScript runtime.
   *
   * This function creates a single global function in the JS runtime:
   * - readPDF(filePath: string): Promise<string>
   *
   * @param jsiRuntime A pointer to the JSI runtime.
   * @param callInvoker A shared pointer to the call invoker for async
   * operations.
   */
  static void
  injectJSIBindings(jsi::Runtime *jsiRuntime,
                    std::shared_ptr<react::CallInvoker> callInvoker);
};

} // namespace rnpdfium

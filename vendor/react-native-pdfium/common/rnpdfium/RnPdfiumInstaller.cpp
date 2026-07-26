#include "RnPdfiumInstaller.h"
#include "jsi/Promise.h"

#include <pdfium/fpdf_text.h>
#include <pdfium/fpdfview.h>

#include <codecvt>
#include <iostream>
#include <locale>
#include <stdexcept>
#include <string>
#include <thread>
#include <vector>

namespace rnpdfium {

// This is the self-contained text extraction logic.
// It's placed here to be called directly by our JSI function.
std::string extractText(const std::string &filePath) {
  std::string finalText = "";
  // log the file path
  std::cout << "Extracting text from PDF: " << filePath << std::endl;
  // 1. Load the document
  FPDF_DOCUMENT doc = FPDF_LoadDocument(filePath.c_str(), nullptr);
  if (!doc) {
    throw std::runtime_error("Failed to load PDF document: " + filePath);
  }

  // 2. Get page count and iterate
  int page_count = FPDF_GetPageCount(doc);
  for (int i = 0; i < page_count; ++i) {
    FPDF_PAGE page = FPDF_LoadPage(doc, i);
    if (!page)
      continue;

    FPDF_TEXTPAGE text_page = FPDFText_LoadPage(page);
    if (!text_page) {
      FPDF_ClosePage(page);
      continue;
    }

    // 3. Get character count and extract text (UTF-16LE)
    int char_count = FPDFText_CountChars(text_page);
    if (char_count > 0) {
      // Allocate buffer with +1 for null terminator
      std::vector<unsigned short> buffer(char_count + 1, 0);
      FPDFText_GetText(text_page, 0, char_count, buffer.data());

      // 4. Convert UTF-16LE to UTF-8
      try {
        std::wstring_convert<std::codecvt_utf8_utf16<char16_t>, char16_t>
            converter;
        finalText += converter.to_bytes(
            reinterpret_cast<const char16_t *>(buffer.data()));
      } catch (const std::exception &e) {
        // Handle conversion errors if necessary
      }
    }

    // 5. Clean up page resources
    FPDFText_ClosePage(text_page);
    FPDF_ClosePage(page);
  }

  // 6. Clean up document resource
  FPDF_CloseDocument(doc);

  return finalText;
}

void PdfiumInstaller::injectJSIBindings(
    jsi::Runtime *jsiRuntime, std::shared_ptr<react::CallInvoker> callInvoker) {
  std::cout << "InjectingJSI";
  // Initialize the PDFium library once when the module is loaded.
  FPDF_InitLibrary();

  // Create the 'readPDF' host function that returns a Promise
  auto readPDFFunc = jsi::Function::createFromHostFunction(
      *jsiRuntime, jsi::PropNameID::forAscii(*jsiRuntime, "readPDF"), 1,
      [callInvoker](jsi::Runtime &runtime, const jsi::Value &thisValue,
                    const jsi::Value *args, size_t count) -> jsi::Value {
        if (count != 1 || !args[0].isString()) {
          throw jsi::JSError(runtime,
                             "readPDF expects one string argument (filePath)");
        }

        std::string filePath = args[0].asString(runtime).utf8(runtime);

        return Promise::createPromise(
            runtime, callInvoker,
            [filePath, &runtime,
             callInvoker](std::shared_ptr<Promise> promise) {
              // Run the PDF extraction in a background thread
              std::thread([promise, filePath, &runtime, callInvoker]() {
                try {
                  std::string extractedText = extractText(filePath);
                  // Resolve the promise with the extracted text - schedule on
                  // JS thread
                  callInvoker->invokeAsync([promise, extractedText,
                                            &runtime]() {
                    promise->resolve(
                        jsi::String::createFromUtf8(runtime, extractedText));
                  });
                } catch (const std::exception &e) {
                  // Reject the promise with the error - schedule on JS thread
                  callInvoker->invokeAsync(
                      [promise, error = std::string(e.what())]() {
                        promise->reject(error);
                      });
                }
              }).detach();
            });
      });

  // Install the function on the global object
  jsiRuntime->global().setProperty(*jsiRuntime, "readPDF",
                                   std::move(readPDFFunc));
}

} // namespace rnpdfium

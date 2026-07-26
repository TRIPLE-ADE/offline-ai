"use strict";

import { PdfiumInstallerNativeModule } from './RnPdfiumModules';

// eslint-disable-next-line no-var

if (global.readPDF == null) {
  if (!PdfiumInstallerNativeModule) {
    throw new Error(`Failed to install react-native-pdfium: The native module could not be found.`);
  }
  PdfiumInstallerNativeModule.install();
  if (global.readPDF == null) {
    throw new Error(`Failed to install react-native-pdfium: The global 'readPDF' function was not found after installation.`);
  }
}
export { readPDF } from './Pdfium';
//# sourceMappingURL=index.js.map
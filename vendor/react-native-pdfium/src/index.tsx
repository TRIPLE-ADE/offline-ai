import { PdfiumInstallerNativeModule } from './RnPdfiumModules';

// eslint-disable-next-line no-var
declare global {
  var readPDF: (filePath: string) => Promise<string>;
}

if (globalThis.readPDF == null) {
  if (!PdfiumInstallerNativeModule) {
    throw new Error(
      `Failed to install react-native-pdfium: The native module could not be found.`
    );
  }
  PdfiumInstallerNativeModule.install();

  if (globalThis.readPDF == null) {
    throw new Error(
      `Failed to install react-native-pdfium: The global 'readPDF' function was not found after installation.`
    );
  }
}
export { readPDF } from './Pdfium';

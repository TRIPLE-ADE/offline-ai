"use strict";

import { Platform } from 'react-native';
const LINKING_ERROR = `The package 'react-native-pdfium' doesn't seem to be linked. Make sure: \n\n` + Platform.select({
  ios: "- You have run 'pod install'\n",
  default: ''
}) + '- You rebuilt the app after installing the package\n' + '- You are not using Expo Go\n';
function returnSpecOrThrowLinkingError(spec) {
  return spec ? spec : new Proxy({}, {
    get() {
      throw new Error(LINKING_ERROR);
    }
  });
}
const PdfiumInstallerNativeModule = returnSpecOrThrowLinkingError(require('./NativePdfium').default);
export { PdfiumInstallerNativeModule };
//# sourceMappingURL=RnPdfiumModules.js.map
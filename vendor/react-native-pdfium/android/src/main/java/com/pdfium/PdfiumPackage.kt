package com.pdfium

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider
import com.facebook.react.uimanager.ViewManager

class PdfiumPackage : BaseReactPackage() {
  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = listOf()

  override fun getModule(
    name: String,
    reactContext: ReactApplicationContext,
  ): NativeModule? =
    if (name == PdfiumInstaller.NAME) {
      PdfiumInstaller(reactContext)
    } else {
      null
    }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
    ReactModuleInfoProvider {
      val moduleInfos: MutableMap<String, ReactModuleInfo> = HashMap()
      moduleInfos[PdfiumInstaller.NAME] =
        ReactModuleInfo(
          PdfiumInstaller.NAME,
          PdfiumInstaller.NAME,
          false, // canOverrideExistingModule
          false, // needsEagerInit
          // hasConstants
          false, // isCxxModule
          true
        )

      moduleInfos
    }
}


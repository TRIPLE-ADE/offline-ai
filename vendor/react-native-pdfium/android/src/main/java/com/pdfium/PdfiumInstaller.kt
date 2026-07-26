package com.pdfium

import com.facebook.jni.HybridData
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.common.annotations.FrameworkAPI
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.turbomodule.core.CallInvokerHolderImpl

@OptIn(FrameworkAPI::class)
@ReactModule(name = PdfiumInstaller.NAME)
class PdfiumInstaller(reactContext: ReactApplicationContext) :
  NativePdfiumSpec(reactContext) {
  companion object {
    const val NAME = NativePdfiumSpec.NAME
  }

  private val mHybridData: HybridData

  // CORRECTED: The signature now matches the C++ side.
  external fun initHybrid(jsContext: Long, callInvoker: CallInvokerHolderImpl): HybridData

  private external fun injectJSIBindings()

  init {
    try {
      System.loadLibrary("pdfium")
      System.loadLibrary("react-native-pdfium")
      val jsCallInvokerHolder = reactContext.jsCallInvokerHolder as CallInvokerHolderImpl
      mHybridData = initHybrid(reactContext.javaScriptContextHolder!!.get(), jsCallInvokerHolder)
    } catch (exception: UnsatisfiedLinkError) {
      throw RuntimeException("Could not load native module PdfiumInstaller. Have you packaged the .so files correctly?", exception)
    }
  }

  @ReactMethod(isBlockingSynchronousMethod = true)
  override fun install(): Boolean {
    injectJSIBindings()
    return true
  }
}

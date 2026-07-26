cmake_minimum_required(VERSION 3.13)

file(GLOB_RECURSE ANDROID_CPP_SOURCES CONFIGURE_DEPENDS "${ANDROID_CPP_DIR}/*.cpp")
file(GLOB_RECURSE COMMON_CPP_SOURCES CONFIGURE_DEPENDS "${COMMON_CPP_DIR}/*.cpp" "${COMMON_CPP_DIR}/*.c")
file(GLOB_RECURSE TEST_CPP_SOURCES "${COMMON_CPP_DIR}/rnexecutorch/tests/*.cpp")
list(REMOVE_ITEM COMMON_CPP_SOURCES ${TEST_CPP_SOURCES})

add_library(react-native-pdfium SHARED ${ANDROID_CPP_SOURCES} ${COMMON_CPP_SOURCES})

find_package(ReactAndroid REQUIRED CONFIG)
find_package(fbjni REQUIRED CONFIG)

target_include_directories(
  react-native-pdfium
  PUBLIC
  "${COMMON_CPP_DIR}"
  "${ANDROID_CPP_DIR}"
  "${INCLUDE_DIR}"
  "${REACT_NATIVE_DIR}/ReactCommon"
  "${REACT_NATIVE_DIR}/ReactAndroid/src/main/jni/react/turbomodule"
  "${REACT_NATIVE_DIR}/ReactCommon/callinvoker"
)

set(LINK_LIBRARIES
  ReactAndroid::jsi
  fbjni::fbjni
  android
  log
)

set(RN_VERSION_LINK_LIBRARIES
  ReactAndroid::reactnative
)

# --- PDFium ---
# Create an imported target for the PDFium shared library
add_library(pdfium SHARED IMPORTED)

# Tell CMake where to find the actual .so file for the target
set_target_properties(pdfium PROPERTIES
                      IMPORTED_LOCATION "${LIBS_DIR}/pdfium/${ANDROID_ABI}/libpdfium.so")

# --------------

target_link_libraries(
  react-native-pdfium 
  ${LINK_LIBRARIES} 
  ${RN_VERSION_LINK_LIBRARIES}
  pdfium
)
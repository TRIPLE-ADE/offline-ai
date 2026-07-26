require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "Pdfium" # Changed to match your project name
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "13.0" } # Using a common modern minimum version
  s.source       = { :git => "https://github.com/your-repo/react-native-pdfium.git", :tag => "#{s.version}" }

  # Define the path to your pre-built PDFium library
  pdfium_binaries_path = File.expand_path('$(PODS_TARGET_SRCROOT)/ios/libs/pdfium', __dir__)

  # --- Build Configurations ---
  s.user_target_xcconfig = {
    # Path for third-party headers (like pdfium/*.h)
    "HEADER_SEARCH_PATHS" => "$(PODS_TARGET_SRCROOT)/third-party/include",

    # Linker flags for device builds
    "OTHER_LDFLAGS[sdk=iphoneos*][arch=*]" => [
      '$(inherited)',
      # Force load the PDFium static library to ensure all symbols are included
      "-force_load \"#{pdfium_binaries_path}/physical-arm64/libpdfium.a\"",
    ].join(' '),

    # Linker flags for simulator builds
    "OTHER_LDFLAGS[sdk=iphonesimulator*][arch=*]" => [
      '$(inherited)',
      "-force_load \"#{pdfium_binaries_path}/simulator-arm64/libpdfium.a\"",
    ].join(' '),

    'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'x86_64',
  }

  s.pod_target_xcconfig = {
    "USE_HEADERMAP" => "YES",
    # Paths for your library's internal C++ and Objective-C++ headers
    "HEADER_SEARCH_PATHS" =>
      '"$(PODS_TARGET_SRCROOT)/ios" '+
      '"$(PODS_TARGET_SRCROOT)/common" '+
      '"$(PODS_TARGET_SRCROOT)/third-party/include"',
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
    'EXCLUDED_ARCHS[sdk=iphonesimulator*]' => 'x86_64',
  }

  # --- Source File Definitions ---
  s.source_files = [
    "ios/**/*.{m,mm,h}",      # Objective-C++ bridge files
    "common/**/*.{cpp,c,h,hpp}", # Shared C++ source files
  ]

  # Install React Native dependencies
  install_modules_dependencies(s)
end

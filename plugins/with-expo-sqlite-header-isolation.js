const { withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs/promises');
const path = require('node:path');

const HELPER_MARKER = '# OFFLINE_STUDY_SQLITE_HEADER_ISOLATION_HELPER';
const CALL_MARKER = '# OFFLINE_STUDY_SQLITE_HEADER_ISOLATION_CALL';

const RUBY_HELPER = `
${HELPER_MARKER}
def isolate_expo_sqlite_header!(installer)
  umbrella = File.join(
    installer.sandbox.root.to_s,
    'Target Support Files',
    'ExpoSQLite',
    'ExpoSQLite-umbrella.h'
  )
  return unless File.exist?(umbrella)

  contents = File.read(umbrella)
  marker = '#define OFFLINE_STUDY_EXPO_SQLITE_HEADER_ISOLATION 1'
  return if contents.include?(marker)

  sqlite_import = '#import "sqlite3.h"'
  unless contents.include?(sqlite_import)
    Pod::UI.warn 'ExpoSQLite umbrella header did not contain the expected sqlite3 import'
    return
  end

  isolated_import = <<~HEADER.chomp
    #{marker}
    // OP-SQLite/LibSQL and Expo SQLite inherit SQLite's SQLITE3_H guard.
    // Expo SQLite namespaces its native symbols with exsqlite3_, so force its
    // own vendored declarations to load even when LibSQL was imported first.
    #ifdef SQLITE3_H
    #undef SQLITE3_H
    #endif
    #{sqlite_import}
  HEADER

  File.write(umbrella, contents.sub(sqlite_import, isolated_import))
end
`;

function injectHeaderIsolation(podfile) {
  let next = podfile;

  if (!next.includes(HELPER_MARKER)) {
    const targetMatch = next.match(/^target\s+['"][^'"]+['"]\s+do\s*$/m);
    const targetIndex = targetMatch?.index ?? -1;

    if (targetIndex === -1) {
      throw new Error('Unable to locate the application target in the generated Podfile.');
    }

    next = `${next.slice(0, targetIndex)}${RUBY_HELPER}\n${next.slice(targetIndex)}`;
  }

  if (!next.includes(CALL_MARKER)) {
    const postInstallIndex = next.indexOf('post_install do |installer|');

    if (postInstallIndex === -1) {
      throw new Error('Unable to locate the CocoaPods post_install hook.');
    }

    const reactNativeCallIndex = next.indexOf('react_native_post_install(', postInstallIndex);
    const callEnd = next.indexOf('\n    )', reactNativeCallIndex);

    if (reactNativeCallIndex === -1 || callEnd === -1) {
      throw new Error('Unable to locate the end of react_native_post_install.');
    }

    const insertionPoint = callEnd + '\n    )'.length;
    const call = `\n    ${CALL_MARKER}\n    isolate_expo_sqlite_header!(installer)`;
    next = `${next.slice(0, insertionPoint)}${call}${next.slice(insertionPoint)}`;
  }

  return next;
}

module.exports = function withExpoSQLiteHeaderIsolation(config) {
  return withDangerousMod(config, [
    'ios',
    async (dangerousConfig) => {
      const podfilePath = path.join(dangerousConfig.modRequest.platformProjectRoot, 'Podfile');
      const podfile = await fs.readFile(podfilePath, 'utf8');
      const nextPodfile = injectHeaderIsolation(podfile);

      if (nextPodfile !== podfile) {
        await fs.writeFile(podfilePath, nextPodfile);
      }

      return dangerousConfig;
    },
  ]);
};

module.exports.injectHeaderIsolation = injectHeaderIsolation;

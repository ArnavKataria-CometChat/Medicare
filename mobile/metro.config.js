const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// CometChat Calls SDK resolution fixes:
// 1. Route @cometchat/calls-sdk-react-native to dist/index.mjs (CJS entry has ESM syntax bug)
// 2. Alias @cometchat/calls-lib-webrtc to lib-jitsi-meet (Cloudsmith package, not on npm)
//
// The UI Kit internally does require("@cometchat/calls-sdk-react-native") which
// resolves via package.json "main" to dist/index.js (CJS). That file has ESM import
// syntax and also imports @cometchat/calls-lib-webrtc which doesn't exist as a
// standalone package. We intercept BOTH module names in resolveRequest.

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Fix 1: calls SDK -> use .mjs entry (the CJS index.js has broken ESM syntax)
  if (moduleName === '@cometchat/calls-sdk-react-native') {
    return {
      filePath: path.resolve(
        __dirname,
        'node_modules/@cometchat/calls-sdk-react-native/dist/index.mjs'
      ),
      type: 'sourceFile',
    };
  }

  // Fix 2: calls-lib-webrtc -> lib-jitsi-meet UMD build (self-contained, no Node deps)
  if (moduleName === '@cometchat/calls-lib-webrtc') {
    return {
      filePath: path.resolve(
        __dirname,
        'node_modules/lib-jitsi-meet/dist/umd/lib-jitsi-meet.min.js'
      ),
      type: 'sourceFile',
    };
  }

  // Default resolution
  return context.resolveRequest(context, moduleName, platform);
};

// Also add .mjs to source extensions so Metro can parse the ESM file
if (!config.resolver.sourceExts.includes('mjs')) {
  config.resolver.sourceExts.push('mjs');
}

module.exports = config;

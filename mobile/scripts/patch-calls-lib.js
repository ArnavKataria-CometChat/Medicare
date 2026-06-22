/**
 * Patches @cometchat/calls-lib-webrtc resolution.
 *
 * The CometChat Calls SDK imports from "@cometchat/calls-lib-webrtc" which is not
 * published on npm (only on Cloudsmith as a tarball). The tarball installs as
 * "lib-jitsi-meet". This script creates a shim package at
 * node_modules/@cometchat/calls-lib-webrtc that re-exports lib-jitsi-meet.
 */

const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(__dirname, '..', 'node_modules', '@cometchat', 'calls-lib-webrtc');
const libJitsiEntry = path.resolve(__dirname, '..', 'node_modules', 'lib-jitsi-meet', 'dist', 'umd', 'lib-jitsi-meet.min.js');

// Only patch if lib-jitsi-meet exists
if (!fs.existsSync(libJitsiEntry)) {
  console.log('[patch-calls-lib] lib-jitsi-meet not found, skipping patch');
  process.exit(0);
}

// Create directory
fs.mkdirSync(targetDir, { recursive: true });

// Create symlink to the actual JitsiMeetJS entry
const symlinkTarget = path.relative(targetDir, libJitsiEntry);
const indexPath = path.join(targetDir, 'index.js');

// Remove existing symlink/file if present
try { fs.unlinkSync(indexPath); } catch {}

fs.symlinkSync(symlinkTarget, indexPath);

// Create package.json
fs.writeFileSync(
  path.join(targetDir, 'package.json'),
  JSON.stringify({
    name: '@cometchat/calls-lib-webrtc',
    version: '1.0.0',
    main: 'index.js',
  }, null, 2)
);

console.log('[patch-calls-lib] Created @cometchat/calls-lib-webrtc -> lib-jitsi-meet alias');

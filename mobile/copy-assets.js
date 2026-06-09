const fs = require('fs');
const path = require('path');

const srcFile = "C:\\Users\\Arnav Kataria\\.gemini\\antigravity-ide\\brain\\8669a9e6-f729-40eb-ac91-b7f6f67da187\\medicare_logo_icon_1781000016930.png";
const assetsDir = path.join(__dirname, 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
  console.log('Created assets directory.');
}

const targetAssets = ['icon.png', 'splash.png', 'adaptive-icon.png', 'favicon.png'];

targetAssets.forEach(fileName => {
  const destPath = path.join(assetsDir, fileName);
  try {
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, destPath);
      console.log(`Successfully set up: assets/${fileName}`);
    } else {
      console.error(`Source file not found at: ${srcFile}`);
    }
  } catch (err) {
    console.error(`Failed to copy ${fileName}:`, err.message);
  }
});
console.log('Asset setup completed.');

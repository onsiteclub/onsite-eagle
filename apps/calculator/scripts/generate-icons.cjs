const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sourceIcon = path.join(__dirname, '../public/images/icon.png');
const androidResDir = path.join(__dirname, '../android/app/src/main/res');

const sizes = [
  { name: 'mipmap-mdpi', size: 48 },
  { name: 'mipmap-hdpi', size: 72 },
  { name: 'mipmap-xhdpi', size: 96 },
  { name: 'mipmap-xxhdpi', size: 144 },
  { name: 'mipmap-xxxhdpi', size: 192 },
];

async function generateIcons() {
  console.log('Generating Android icons from:', sourceIcon);

  for (const { name, size } of sizes) {
    const outputDir = path.join(androidResDir, name);
    const outputPath = path.join(outputDir, 'ic_launcher.png');
    const outputPathRound = path.join(outputDir, 'ic_launcher_round.png');
    const outputPathForeground = path.join(outputDir, 'ic_launcher_foreground.png');

    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Resize to square icon
    await sharp(sourceIcon)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Created ${name}/ic_launcher.png (${size}x${size})`);

    // Also create round version (same as square for now)
    await sharp(sourceIcon)
      .resize(size, size)
      .png()
      .toFile(outputPathRound);
    console.log(`Created ${name}/ic_launcher_round.png (${size}x${size})`);

    // Create foreground (slightly larger for adaptive icon padding)
    const foregroundSize = Math.round(size * 1.5);
    await sharp(sourceIcon)
      .resize(foregroundSize, foregroundSize)
      .png()
      .toFile(outputPathForeground);
    console.log(`Created ${name}/ic_launcher_foreground.png (${foregroundSize}x${foregroundSize})`);
  }

  console.log('Done!');
}

generateIcons().catch(console.error);

const fs = require('fs');
const path = require('path');

const filesToPatch = [
  '_ctx.web.js',
  '_ctx-html.js',
];

filesToPatch.forEach(filename => {
  const filePath = path.join(__dirname, '../node_modules/expo-router/', filename);

  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/process\.env\.EXPO_ROUTER_APP_ROOT/g, "'../../app'");
    content = content.replace(/process\.env\.EXPO_ROUTER_IMPORT_MODE/g, "'sync'");
    fs.writeFileSync(filePath, content);
    console.log('Patched expo-router', filename);
  } else {
    console.log(filename, 'not found at:', filePath);
  }
});

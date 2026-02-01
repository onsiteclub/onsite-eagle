const fs = require('fs');
const path = require('path');

const ctxPath = path.join(__dirname, '../node_modules/expo-router/_ctx.web.js');

if (fs.existsSync(ctxPath)) {
  let content = fs.readFileSync(ctxPath, 'utf8');
  content = content.replace(/process\.env\.EXPO_ROUTER_APP_ROOT/g, "'../../app'");
  content = content.replace(/process\.env\.EXPO_ROUTER_IMPORT_MODE/g, "'sync'");
  fs.writeFileSync(ctxPath, content);
  console.log('Patched expo-router _ctx.web.js');
} else {
  console.log('_ctx.web.js not found at:', ctxPath);
}

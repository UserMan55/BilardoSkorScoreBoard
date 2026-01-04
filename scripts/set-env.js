const fs = require('fs');
const path = require('path');

const target = process.argv[2];
if (!target) {
    console.error('Lütfen bir build target belirtin: mobile veya terminal');
    process.exit(1);
}

const envContent = `REACT_APP_BUILD_TARGET=${target}\n`;
const envPath = path.join(__dirname, '..', '.env');

fs.writeFileSync(envPath, envContent);
console.log(`✅ .env dosyası güncellendi: REACT_APP_BUILD_TARGET=${target}`);

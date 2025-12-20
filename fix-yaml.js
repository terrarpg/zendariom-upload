const fs = require('fs');
const path = require('path');

const UPDATES_DIR = path.join(__dirname, 'updates');
const YAML_FILE = path.join(UPDATES_DIR, 'latest.yml');

console.log('🔧 Vérification latest.yml...');

if (!fs.existsSync(YAML_FILE)) {
    console.log('⚠️  latest.yml non trouvé');
    process.exit(1);
}

let content = fs.readFileSync(YAML_FILE, 'utf8');

// Remplacer les espaces par %20
content = content.replace(/path:\s*(.*\.exe)/g, (match, filename) => {
    const cleanName = filename.trim().replace(/ /g, '%20');
    return `path: ${cleanName}`;
});

content = content.replace(/url:\s*(.*\.exe)/g, (match, filename) => {
    const cleanName = filename.trim().replace(/ /g, '%20');
    return `url: ${cleanName}`;
});

fs.writeFileSync(YAML_FILE, content, 'utf8');
console.log('✅ latest.yml corrigé');
console.log('💡 Conseil: Renommez le fichier .exe sans espaces!');

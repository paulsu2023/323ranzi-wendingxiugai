const fs = require('fs');
const path = require('path');

const srcDirUrl = '../TK带货稳定版-然子/components';
const destDirUrl = 'src/components';
const appClientSrc = '../TK带货稳定版-然子/App.tsx';
const appClientDest = 'src/app/app/AppClient.tsx';

// 1. Copy components
function copyDir(src, dest) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            let content = fs.readFileSync(srcPath, 'utf8');
            if (['Storyboard.tsx', 'ImageUploader.tsx', 'AnalysisLoader.tsx'].includes(entry.name)) {
                content = '"use client";\n' + content;
            }
            fs.writeFileSync(destPath, content, 'utf8');
        }
    }
}

copyDir(srcDirUrl, destDirUrl);

// 2. Copy AppClient
let appContent = fs.readFileSync(appClientSrc, 'utf8');
appContent = '"use client";\n' + appContent;
fs.writeFileSync(appClientDest, appContent, 'utf8');

console.log('Copy complete');

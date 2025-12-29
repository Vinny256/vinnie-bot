const fs = require('fs-extra');
const path = require('path');

module.exports = {
    name: "menu",
    async execute(sock, msg, args) {
        const cmdPath = path.join(__dirname, '..', '..', 'commands');
        let menuText = "┏━━━━━━━━━━━━━━━━━━━━┓\n┃      *VINNIE BOT MENU* ┃\n┗━━━━━━━━━━━━━━━━━━━━┛\n\n";
        
        try {
            // Get everything inside the commands folder
            const items = fs.readdirSync(cmdPath);
            let foundAny = false;

            items.forEach(item => {
                const fullPath = path.join(cmdPath, item);
                const stats = fs.statSync(fullPath);

                // If it's a sub-folder (Category)
                if (stats.isDirectory()) {
                    const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.js'));
                    if (files.length > 0) {
                        foundAny = true;
                        menuText += `*──『 ${item.toUpperCase()} 』──*\n`;
                        files.forEach(file => {
                            menuText += `│ ✧ .${file.replace('.js', '')}\n`;
                        });
                        menuText += `└──────────────\n\n`;
                    }
                } 
                // If it's just a file sitting directly in the commands folder
                else if (item.endsWith('.js') && item !== 'menu.js') {
                    foundAny = true;
                    menuText += `│ ✧ .${item.replace('.js', '')}\n`;
                }
            });

            if (!foundAny) {
                menuText += "_No commands found._\n";
            }

            menuText += "_Powered by Vinnie Bot System_";
            await sock.sendMessage(msg.key.remoteJid, { text: menuText });

        } catch (error) {
            console.error(error);
            await sock.sendMessage(msg.key.remoteJid, { text: "❌ Error reading commands folder." });
        }
    }
};
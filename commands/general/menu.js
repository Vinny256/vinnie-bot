const fs = require('fs-extra');
const path = require('path');

module.exports = {
    name: "menu",
    async execute(sock, msg, args) {
        // Path to the commands directory
        const cmdPath = path.join(__dirname, '..', '..', 'commands');
        const pushname = msg.pushName || 'User';
        
        // Calculate Uptime
        const uptimeSeconds = process.uptime();
        const hours = Math.floor(uptimeSeconds / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const uptime = `${hours}h ${minutes}m`;

        const categoryRequest = args[0] ? args[0].toLowerCase() : null;

        try {
            // Get all items in commands folder
            const items = fs.readdirSync(cmdPath);

            // --- 1. SUB-MENU TEMPLATE (e.g., .menu general) ---
            if (categoryRequest) {
                const targetFolder = items.find(i => i.toLowerCase() === categoryRequest);
                const fullPath = targetFolder ? path.join(cmdPath, targetFolder) : null;

                if (fullPath && fs.statSync(fullPath).isDirectory()) {
                    const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.js'));
                    
                    let subMenu = `╭━━〔 🤖 *${categoryRequest.toUpperCase()} MENU* 〕━━┈⊷\n`;
                    subMenu += `┃ 👤 *User:* ${pushname}\n`;
                    subMenu += `┃ 📂 *Category:* ${categoryRequest}\n`;
                    subMenu += `╰ ━━━━━━━━━━━━━━┈⊷\n\n`;

                    files.forEach((file, index) => {
                        subMenu += `┃ ${index + 1}. .${file.replace('.js', '')}\n`;
                    });

                    subMenu += `\n╰ ━━━━━━━━━━━━━━┈⊷\n_Powered by Vinnie Tech_`;
                    return await sock.sendMessage(msg.key.remoteJid, { text: subMenu }, { quoted: msg });
                }
            }

            // --- 2. MAIN MENU TEMPLATE (Triggered by .menu) ---
            let mainText = `╭━━〔 🌟 *VINNIE-BOT* 🌟 〕━━┈⊷\n`;
            mainText += `┃ 👤 *User:* ${pushname}\n`;
            mainText += `┃ ⏱️ *Uptime:* ${uptime}\n`;
            mainText += `┃ 📚 *Status:* Active\n`;
            mainText += `╰ ━━━━━━━━━━━━━━┈⊷\n\n`;
            mainText += `*SELECT A CATEGORY:*\n`;

            // Automatically find directories to list as categories
            let count = 1;
            items.forEach(item => {
                const isDir = fs.statSync(path.join(cmdPath, item)).isDirectory();
                if (isDir) {
                    mainText += `${count}️⃣ .menu ${item.toLowerCase()}\n`;
                    count++;
                }
            });

            mainText += `\n_Type .menu [category] to view commands_\n`;
            mainText += `_Example: .menu ai_\n\n`;
            mainText += `_Powered by Vinnie Tech_`;

            await sock.sendMessage(msg.key.remoteJid, { text: mainText }, { quoted: msg });

        } catch (error) {
            console.error(error);
            await sock.sendMessage(msg.key.remoteJid, { text: "❌ Error reading categories." });
        }
    }
};
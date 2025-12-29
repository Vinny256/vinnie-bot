const fs = require('fs-extra');

module.exports = async (sock, msg) => {
    try {
        const settings = JSON.parse(fs.readFileSync('./settings.json'));

        // 👁️ AUTO-VIEW STATUS & AUTO-REACT
        if (msg.key.remoteJid === 'status@broadcast') {
            
            // 1. Mark as Seen (Auto-Status)
            if (settings.autoStatus) {
                await sock.readMessages([msg.key]);
            }

            // 2. Send Reaction (Auto-React)
            if (settings.autoReact && !msg.key.fromMe) {
                const emojis = ["❤️", "🔥", "🙌", "👏", "✨", "💯"];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];

                await sock.sendMessage('status@broadcast', {
                    react: {
                        text: randomEmoji,
                        key: msg.key
                    }
                }, { statusJidList: [msg.key.participant] });
                
                console.log(`✨ Reacted ${randomEmoji} to status from: ${msg.pushName || "User"}`);
            }
        }

        // 🔵 AUTO-READ (Individual Messages)
        if (settings.autoRead && !msg.key.fromMe && msg.key.remoteJid !== 'status@broadcast') {
            await sock.readMessages([msg.key]);
        }
        
    } catch (err) {
        console.error("Automation Error:", err);
    }
};
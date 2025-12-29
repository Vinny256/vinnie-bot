const fs = require('fs-extra');

module.exports = {
    name: "read",
    async execute(sock, msg, args) {
        const ownerJid = sock.user.id.split(':')[0] + "@s.whatsapp.net";
        if (msg.key.remoteJid !== ownerJid && !msg.key.fromMe) return; // Only you can change this

        const choice = args[0]?.toLowerCase();
        if (choice !== "on" && choice !== "off") {
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ Use: `.read on` or `.read off`" });
        }

        // Update settings file
        const settings = JSON.parse(fs.readFileSync('./settings.json'));
        settings.autoRead = (choice === "on");
        fs.writeFileSync('./settings.json', JSON.stringify(settings, null, 2));

        await sock.sendMessage(msg.key.remoteJid, { 
            text: `✅ *Auto-Read* has been turned *${choice.toUpperCase()}*.` 
        });
    }
};
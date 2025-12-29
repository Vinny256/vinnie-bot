const fs = require('fs-extra');

module.exports = {
    name: "autoreact",
    async execute(sock, msg, args) {
        const ownerJid = sock.user.id.split(':')[0] + "@s.whatsapp.net";
        if (msg.key.remoteJid !== ownerJid && !msg.key.fromMe) return; 

        const choice = args[0]?.toLowerCase();
        if (choice !== "on" && choice !== "off") {
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ Use: `.autoreact on` or `.autoreact off`" });
        }

        const settings = JSON.parse(fs.readFileSync('./settings.json'));
        settings.autoReact = (choice === "on");
        fs.writeFileSync('./settings.json', JSON.stringify(settings, null, 2));

        await sock.sendMessage(msg.key.remoteJid, { 
            text: `✅ *Auto-Reaction* to status is now *${choice.toUpperCase()}*.` 
        });
    }
};
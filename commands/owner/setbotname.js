module.exports = {
    name: "setbotname",
    async execute(sock, msg, args) {
        if (!msg.key.fromMe) return; // Only owner

        const newName = args.join(" ");
        if (!newName) return sock.sendMessage(msg.key.remoteJid, { text: "Provide a name!" });

        try {
            // 🛠️ Alternative method that sometimes bypasses 'App State' errors
            await sock.query({
                tag: 'iq',
                attrs: {
                    to: '@s.whatsapp.net',
                    type: 'set',
                    xmlns: 'status',
                },
                content: [{
                    tag: 'name',
                    attrs: {},
                    content: Buffer.from(newName, 'utf-8')
                }]
            });

            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Name updated to: ${newName}` });
        } catch (error) {
            console.error(error);
            await sock.sendMessage(msg.key.remoteJid, { text: "❌ Still blocked. You MUST scan a fresh QR code to use this feature." });
        }
    }
};
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

module.exports = {
    name: "save",
    async execute(sock, msg, args) {
        // 1. Check if you are replying to a message
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quotedMsg) {
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ Please reply to a status/media message with `.save`" });
        }

        try {
            // 2. Determine if it's an image or video
            const type = Object.keys(quotedMsg)[0];
            if (!['imageMessage', 'videoMessage'].includes(type)) {
                return sock.sendMessage(msg.key.remoteJid, { text: "❌ Only images and videos can be saved." });
            }

            // 3. Download the media from WhatsApp servers
            const stream = await downloadContentFromMessage(quotedMsg[type], type === 'imageMessage' ? 'image' : 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            // 4. Send the media back to you
            await sock.sendMessage(msg.key.remoteJid, { 
                [type === 'imageMessage' ? 'image' : 'video']: buffer,
                caption: "✅ *Status Saved by Vinnie Bot*"
            }, { quoted: msg });

        } catch (err) {
            console.error("Save Error:", err);
            await sock.sendMessage(msg.key.remoteJid, { text: "❌ Failed to download media." });
        }
    }
};
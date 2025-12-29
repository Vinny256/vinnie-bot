const { downloadContentFromMessage, getContentType } = require('@whiskeysockets/baileys');

module.exports = {
    name: "vo",
    async execute(sock, msg, args) {
        // 1. Get the quoted message properly
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) return sock.sendMessage(msg.key.remoteJid, { text: "❌ Please reply to a *View Once* message." });

        // 2. 🔍 DEEP SEARCH for the media (Handles V1, V2, and Context formats)
        let viewOnceContent = quoted.viewOnceMessageV2?.message || 
                              quoted.viewOnceMessage?.message || 
                              quoted.viewOnceMessageV2Extension?.message ||
                              quoted; // Fallback to direct quoted message

        // 3. Identify if it's actually an image or video
        const type = getContentType(viewOnceContent);
        const isImage = type === 'imageMessage' || viewOnceContent?.imageMessage;
        const isVideo = type === 'videoMessage' || viewOnceContent?.videoMessage;

        if (!isImage && !isVideo) {
            return sock.sendMessage(msg.key.remoteJid, { text: "❌ Error: This message doesn't contain View Once media." });
        }

        const mediaData = viewOnceContent.imageMessage || viewOnceContent.videoMessage || viewOnceContent;
        const mediaType = isImage ? 'image' : 'video';

        // 4. Send the result privately to your inbox
        const ownerJid = sock.user.id.split(':')[0] + "@s.whatsapp.net";
        await sock.sendMessage(msg.key.remoteJid, { text: "🕵️ *Extracting... check your PM.*" });

        try {
            const stream = await downloadContentFromMessage(mediaData, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            await sock.sendMessage(ownerJid, { 
                [mediaType]: buffer, 
                caption: `✅ *Stealth VO Extract*\nFrom: @${msg.key.remoteJid.split('@')[0]}`,
                mentions: [msg.key.remoteJid]
            });

            // Cleanup: Delete your command so no one sees you did it
            await sock.sendMessage(msg.key.remoteJid, { delete: msg.key });

        } catch (err) {
            console.error("VO Error:", err);
            await sock.sendMessage(msg.key.remoteJid, { text: "❌ Failed. The media may have already been viewed or expired." });
        }
    }
};
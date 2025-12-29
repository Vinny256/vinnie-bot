module.exports = {
    name: "pp",
    async execute(sock, msg, args) {
        // 1. Get the JID of the person (either replied to or mentioned)
        const cited = msg.message?.extendedTextMessage?.contextInfo?.participant || 
                      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

        // If no one is replied to, default to the sender of the message
        const target = cited || msg.key.remoteJid;

        try {
            // 2. Request the high-res profile picture URL from WhatsApp
            // 'image' returns the high-quality version, 'preview' returns the thumbnail
            const ppUrl = await sock.profilePictureUrl(target, 'image');

            // 3. Send the image back to the chat
            await sock.sendMessage(msg.key.remoteJid, { 
                image: { url: ppUrl }, 
                caption: `📸 *Profile Picture of:* @${target.split('@')[0]}`,
                mentions: [target]
            }, { quoted: msg });

        } catch (err) {
            console.error(err);
            // Error usually happens if the person has "Privacy" settings on
            // or if they don't have a profile picture at all.
            await sock.sendMessage(msg.key.remoteJid, { 
                text: "❌ *Error:* I couldn't fetch the profile picture. It might be hidden by their privacy settings or they don't have one." 
            });
        }
    }
};
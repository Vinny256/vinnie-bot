module.exports = {
    name: "owner",
    async execute(sock, msg, args) {
        // --- CONFIGURE YOUR DETAILS HERE ---
        const myName = "Vincent";
        const myNumber = "254768666068"; // Use your international number (no +)
        const myLocation = "Kiambu, Kenya";
        const myOrg = "Vinnie Tech Solutions";
        const myEmail = "vinnykaranja973@gmail.com";
        // ------------------------------------

        // Construct the vCard String
        const vcard = 'BEGIN:VCARD\n' 
            + 'VERSION:3.0\n' 
            + `FN:${myName}\n` 
            + `ORG:${myOrg};\n` 
            + `TEL;type=CELL;type=VOICE;waid=${myNumber}:+${myNumber}\n` 
            + `ADR;type=WORK,PREF:;;${myLocation};;;;\n`
            + `EMAIL;type=INTERNET:${myEmail}\n`
            + 'END:VCARD';

        try {
            // 1. Send the Professional Contact Card
            await sock.sendMessage(msg.key.remoteJid, { 
                contacts: { 
                    displayName: myName, 
                    contacts: [{ vcard }] 
                } 
            }, { quoted: msg });

            // 2. Send a styled follow-up text with location and details
            const styledText = `👤 *OWNER PROFILE*\n\n`
                + `✨ *Name:* ${myName}\n`
                + `📍 *Location:* ${myLocation}\n`
                + `💼 *Org:* ${myOrg}\n`
                + `📱 *WhatsApp:* wa.me/${myNumber}\n\n`
                + `_Always happy to help with Vinnie Bot!_`;

            await sock.sendMessage(msg.key.remoteJid, { text: styledText }, { quoted: msg });

        } catch (err) {
            console.error("Owner Command Error:", err);
        }
    }
};
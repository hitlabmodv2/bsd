import fs from 'fs';

/**
 * Template untuk buttonMessage menu
 * @param {Object} params - Parameter untuk template
 * @param {string} params.caption - Caption/text untuk pesan
 * @param {string} params.ucapanWaktu - Waktu untuk fileName
 * @param {string} params.namaBot - Nama bot untuk title
 * @param {string} params.namabot - Deskripsi bot untuk body
 * @param {string} params.linkSaluran - Link saluran
 * @param {Buffer|null} params.thumbImage - Thumbnail image buffer
 * @returns {Object} buttonMessage object
 */
export function createMenuTemplate(params) {
    const {
        caption,
        ucapanWaktu,
        namaBot,
        namabot,
        linkSaluran,
        thumbImage,
        senderName, // Tambahkan senderName
        runtime // Tambahkan runtime
    } = params;

    return {
        document: {
            url: `https://files.catbox.moe/j56xya.jpg`
        },
        mimetype: "image/png",
        fileName: ucapanWaktu,
        fileLength: 99999,
        pageCount: 99999,
        jpegThumbnail: thumbImage,
        caption: caption,
        footer: `© WILY KUN`,
        contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            externalAdReply: {
                title: `👋 Halo ${senderName || 'User'}!`,
                body: `⏱️ Runtime: ${runtime || 'Unknown'} | 🤖 ${namaBot}`,
                thumbnail: thumbImage,
                mediaType: 1,
                renderLargerThumbnail: true,
                previewType: 0,
                mediaUrl: linkSaluran,
                sourceUrl: linkSaluran
            },
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363312297133690@newsletter",
                newsletterName: `Auto Rection Story`
            }
        }
    };
}
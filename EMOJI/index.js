
const fs = require('fs');
const path = require('path');

/**
 * Daftar emoji yang tersedia untuk reaksi
 */
const emojiList = [
    '❤️', '😍', '😊', '👍', '🔥', '💯', '😂', '🥰', '😘', '👏',
    '🚀', '💫', '🎊', '🌈', '💎', '🦋', '🌸', '🍀', '⭐', '🌟',
    '🎉', '💝', '🌹', '💖', '✨', '🤩', '🎈', '🎁', '💐', '🌺',
    '🦄', '🎯', '🏆', '🎪', '🎭', '🎨', '🎵', '🎶', '🎤', '🎸'
];

/**
 * Fungsi untuk mendapatkan emoji acak
 */
function getRandomEmoji() {
    return emojiList[Math.floor(Math.random() * emojiList.length)];
}

/**
 * Fungsi untuk menyimpan statistik emoji
 */
function saveEmojiStats(emoji) {
    try {
        const statsPath = path.join(__dirname, 'emoji_stats.json');
        let stats = {};

        // Muat data statistik yang sudah ada
        if (fs.existsSync(statsPath)) {
            stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
        }

        // Update statistik
        if (!stats[emoji]) {
            stats[emoji] = 0;
        }
        stats[emoji]++;

        // Simpan data
        fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));

        return stats;
    } catch (error) {
        console.log('❌ Error saat menyimpan statistik emoji:', error.message);
        return {};
    }
}

/**
 * Fungsi untuk mendapatkan statistik emoji
 */
function getEmojiStats() {
    try {
        const statsPath = path.join(__dirname, 'emoji_stats.json');
        
        if (fs.existsSync(statsPath)) {
            return JSON.parse(fs.readFileSync(statsPath, 'utf8'));
        }
        
        return {};
    } catch (error) {
        console.log('❌ Error saat membaca statistik emoji:', error.message);
        return {};
    }
}

module.exports = {
    getRandomEmoji,
    saveEmojiStats,
    getEmojiStats,
    emojiList
};

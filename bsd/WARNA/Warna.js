const { colors, style } = require('../CODE_WARNA/colors');

/**
 * Fungsi untuk membuat kotak status berwarna
 */
async function createStatusBox(data) {
    try {
        // Tentukan warna berdasarkan status reaksi
        let reactionColor = colors.red;
        if (data.reactionStatus === 'ON') {
            reactionColor = colors.green;
        } else if (data.reactionStatus === 'RANDOM') {
            reactionColor = colors.yellow;
        }

        // Tentukan warna emoji - pastikan tidak ada undefined
        const emojiDisplay = (data.emoji && typeof data.emoji === 'string' && data.emoji.trim() !== '') ? 
            `${colors.brightMagenta}${data.emoji}${colors.reset}` : 
            `Tidak Ada`;

        // Tentukan status aksi
        const actionStatus = data.willReact ? 
            `${colors.green}Dilihat & Disukai${colors.reset}` : 
            `${colors.yellow}Hanya Dilihat${colors.reset}`;

        const statusBox = `${colors.brightCyan}╭══════════════════════════════════╮${colors.reset}
${colors.brightCyan}║${colors.reset} ${colors.brightMagenta}💌 STATUS UPDATE MASUK${colors.reset}          ${colors.brightCyan}║${colors.reset}
${colors.brightCyan}├══════════════════════════════════┤${colors.reset}
${colors.brightCyan}│${colors.reset} ${colors.brightBlue}»${colors.reset} ${colors.white}Status      :${colors.reset} ${colors.green}Aktif ✓${colors.reset}
${colors.brightCyan}│${colors.reset} ${colors.brightBlue}»${colors.reset} ${colors.white}Tanggal     :${colors.reset} ${colors.brightWhite}${data.date}${colors.reset}
${colors.brightCyan}│${colors.reset} ${colors.brightBlue}»${colors.reset} ${colors.white}Selamat     :${colors.reset} ${colors.brightYellow}${data.greeting}${colors.reset}
${colors.brightCyan}│${colors.reset} ${colors.brightBlue}»${colors.reset} ${colors.white}Waktu       :${colors.reset} ${colors.brightWhite}${data.time}${colors.reset}
${colors.brightCyan}│${colors.reset} ${colors.brightBlue}»${colors.reset} ${colors.white}Speed Views :${colors.reset} ${colors.brightGreen}${data.speedViews} Detik${colors.reset}
${colors.brightCyan}│${colors.reset} ${colors.brightBlue}»${colors.reset} ${colors.white}Total Views :${colors.reset} ${colors.brightMagenta}${data.totalViews}${colors.reset}
${colors.brightCyan}│${colors.reset} ${colors.brightBlue}»${colors.reset} ${colors.white}Status Dia  :${colors.reset} ${colors.brightCyan}${data.userStatus}${colors.reset}
${colors.brightCyan}│${colors.reset} ${colors.brightBlue}»${colors.reset} ${colors.white}Nama        :${colors.reset} ${colors.brightYellow}${data.name}${colors.reset}
${colors.brightCyan}│${colors.reset} ${colors.brightBlue}»${colors.reset} ${colors.white}Nomor       :${colors.reset} ${colors.brightWhite}${data.number}${colors.reset}
${colors.brightCyan}│${colors.reset} ${colors.brightBlue}»${colors.reset} ${colors.white}Tipe Status :${colors.reset} ${colors.brightGreen}${data.statusType}${colors.reset}
${colors.brightCyan}│${colors.reset} ${colors.brightBlue}»${colors.reset} ${colors.white}Reaction    :${colors.reset} ${reactionColor}${data.reactionStatus}${colors.reset}
${colors.brightCyan}│${colors.reset} ${colors.brightBlue}»${colors.reset} ${colors.white}Auto Unduh  :${colors.reset} ${data.autoUnduhStatus}
${colors.brightCyan}│${colors.reset} ${colors.brightBlue}»${colors.reset} ${colors.white}Mode        :${colors.reset} ${colors.brightBlue}${data.mode}${colors.reset}
${colors.brightCyan}│${colors.reset} ${colors.brightBlue}»${colors.reset} ${colors.white}Reaksi      :${colors.reset} ${emojiDisplay}
${colors.brightCyan}│${colors.reset} ${colors.brightBlue}»${colors.reset} ${colors.white}Status      :${colors.reset} ${actionStatus}
${colors.brightCyan}└───···${colors.reset}`;

        return statusBox;
    } catch (error) {
        throw new Error(`Error membuat status box: ${error.message}`);
    }
}

/**
 * Fungsi untuk membuat kotak statistik
 */
async function createStatsBox(stats) {
    try {
        const statsBox = `
${colors.brightYellow}╭══════════════════════════════════╮${colors.reset}
${colors.brightYellow}║${colors.reset} ${colors.brightMagenta}📊 STATISTIK BOT${colors.reset}                ${colors.brightYellow}║${colors.reset}
${colors.brightYellow}├══════════════════════════════════┤${colors.reset}
${colors.brightYellow}│${colors.reset} ${colors.brightBlue}»${colors.reset} ${colors.white}Total Views :${colors.reset} ${colors.brightGreen}${stats.totalViews || 0}${colors.reset}
${colors.brightYellow}│${colors.reset} ${colors.brightBlue}»${colors.reset} ${colors.white}Total Users :${colors.reset} ${colors.brightCyan}${Object.keys(stats.users || {}).length}${colors.reset}
${colors.brightYellow}│${colors.reset} ${colors.brightBlue}»${colors.reset} ${colors.white}Bot Uptime  :${colors.reset} ${colors.brightMagenta}${stats.uptime || '0s'}${colors.reset}
${colors.brightYellow}└${colors.reset}${colors.gray}───···${colors.reset}
`;

        return statsBox;
    } catch (error) {
        throw new Error(`Error membuat stats box: ${error.message}`);
    }
}

module.exports = {
    createStatusBox,
    createStatsBox
};
```
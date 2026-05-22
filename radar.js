// =================================================================
// 🛡️ PRO-TRADE SYNERGY // GÜRÜLTÜ FİLTRELİ & WIDGET READY V5.3
// =================================================================

const fs = require('fs'); // Widget verisi için gerekli
const TELEGRAM_TOKEN = "BURAYA_BOT_TOKENINI_YAZ";
const CHAT_ID = "BURAYA_CHAT_ID_YAZ";
const COIN_LIST = ["XRP", "XLM", "ONDO", "PLUME", "SHIB"];

let lastSignalTime = {}; 

async function sendTelegramAlert(msg) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(msg)}`;
    try { await fetch(url); } catch (e) { console.error("Telegram bağlantı hatası!"); }
}

// Widget için canlı dosya oluşturucu
function updateWidgetFile(coin, type, price, percent) {
    const data = {
        coin: coin,
        signal: type,
        price: price.toFixed(4),
        trend: percent.toFixed(2),
        timestamp: new Date().toLocaleTimeString()
    };
    fs.writeFileSync('widget_data.json', JSON.stringify(data));
}

// ... (fetchMarketData ve getUsdTry fonksiyonların buraya gelecek) ...

async function startTerminal() {
    const market = await fetchMarketData();
    const now = Date.now();
    
    process.stdout.write("\x1Bc");
    console.log("=== 🛡️ WIDGET-READY GÜRÜLTÜ FİLTRELİ İSTASYON ===");

    COIN_LIST.forEach(coin => {
        const d = market[coin];
        if (!d) return;

        const cooldownTime = 1800000; 
        const isNotified = lastSignalTime[coin] && (now - lastSignalTime[coin] < cooldownTime);
        const isSignificant = Math.abs(d.c) > 2.5; 

        if (isSignificant && !isNotified) {
            const type = d.c < -2.5 ? "AL" : "SAT";
            lastSignalTime[coin] = now;
            
            // 1. Telegram Bildirimi
            const msg = `🎯 SİNYAL: ${coin}\nİşlem: ${type}\nFiyat: ${d.p} USDT\nTrend: %${d.c}`;
            sendTelegramAlert(msg);
            
            // 2. Widget Verisini Güncelle
            updateWidgetFile(coin, type, d.p, d.c);
        }

        console.log(`${coin}: %${d.c} değişim - ${isNotified ? "Sessiz" : "Aktif"}`);
    });

    console.log("\n(Sistem çalışıyor, widget_data.json güncellendi.)");
    setTimeout(startTerminal, 60000);
}

startTerminal();
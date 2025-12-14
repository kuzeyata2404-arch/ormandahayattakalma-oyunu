// --- OYUN AYARLARI ---
const MAKS_TUR = 20;
const MAX_DEGER = 100;
const ACIKLIK_TUKETIM = 15;

const TARIFLER = [
    { ad: "İp", maliyet: { Odun: 3 }, kazanc: { İp: 1 }, etki: "" },
    { ad: "Basit Barınak", maliyet: { Odun: 10, İp: 5 }, kazanc: {}, etki: "+5 H/Tur" },
    { ad: "Balta", maliyet: { Taş: 5, İp: 2 }, kazanc: {}, etki: "Odun Toplama x2" },
    { ad: "Ateş Yak", maliyet: { Odun: 1 }, kazanc: {}, etki: "Risk Azalır" }
];

let durum = {
    tur: 1,
    saglik: MAX_DEGER,
    aclik: MAX_DEGER,
    eylemHakki: 3,
    envanter: { Odun: 0, Taş: 0, Yiyecek: 0, İp: 0 },
    uretimler: { 'Basit Barınak': false, 'Balta': false, 'Ateş Yak': false },
    mesaj: "",
    oyunBitti: false
};

// --- DOM Elementleri ---
const DOMS = ['tur', 'saglik', 'aclik', 'eylem'];
const kaynakDOMS = ['Odun', 'Taş', 'Yiyecek', 'İp'];
const mesajKutusu = document.getElementById('mesaj-kutusu');
const uretimAlani = document.getElementById('uretim-alani');
const turIlerletBtn = document.getElementById('tur-ilerlet-btn');

// --- FONKSİYONLAR ---

function oyunuYukle() {
    const kaydedilenDurum = localStorage.getItem('karanlik_orman');
    if (kaydedilenDurum) {
        durum = JSON.parse(kaydedilenDurum);
    } else {
        oyunuSifirla(false);
    }
    ekraniGuncelle();
    uretimleriGoster();
    eylemButonlariniKontrolEt();
}

function oyunuKaydet() {
    localStorage.setItem('karanlik_orman', JSON.stringify(durum));
}

function ekraniGuncelle() {
    // Durum Paneli Güncelleme
    document.getElementById('tur-gosterge').innerText = `Tur: ${durum.tur} / Kalan: ${MAKS_TUR - durum.tur}`;
    document.getElementById('saglik-gosterge').innerText = `Sağlık: ${durum.saglik}%`;
    document.getElementById('aclik-gosterge').innerText = `Açlık: ${durum.aclik}%`;
    document.getElementById('eylem-gosterge').innerText = `Eylem Hakkı (AH): ${durum.eylemHakki}`;
    document.getElementById('kalan-ah').innerText = durum.eylemHakki;

    // Envanter Güncelleme
    kaynakDOMS.forEach(k => {
        document.getElementById(`kaynak-${k.toLowerCase()}`).innerText = `${k}: ${durum.envanter[k]}`;
    });
    
    mesajKutusu.innerText = durum.mesaj;
    oyunuKaydet();
}

function eylemButonlariniKontrolEt() {
    const eylemButonlari = document.getElementById('eylem-alani').querySelectorAll('button');
    const uretimButonlari = uretimAlani.querySelectorAll('button');

    [...eylemButonlari, ...uretimButonlari].forEach(btn => {
        btn.disabled = durum.oyunBitti || durum.eylemHakki <= 0;
    });
    
    turIlerletBtn.disabled = durum.oyunBitti;
}

// --- KAYNAK VE TÜKETİM ---

function kaynakTopla(kaynak) {
    if (durum.oyunBitti || durum.eylemHakki <= 0) return;

    let miktar;
    if (kaynak === 'Odun' && durum.uretimler.Balta) {
        miktar = Math.floor(Math.random() * 3) + 3; // Balta ile 3-5
        durum.mesaj = `Balta ile hızlıca ${miktar} Odun toplandı.`;
    } else if (kaynak === 'Odun') {
        miktar = Math.floor(Math.random() * 3) + 1; // 1-3
        durum.mesaj = `${miktar} Odun toplandı.`;
    } else if (kaynak === 'Taş') {
        miktar = Math.floor(Math.random() * 2) + 1; // 1-2
        durum.mesaj = `${miktar} Taş bulundu.`;
    } else if (kaynak === 'Yiyecek') {
        miktar = Math.floor(Math.random() * 4) + 1; // 1-4
        durum.mesaj = `Yiyecek arandı, ${miktar} birim bulundu.`;
    }
    
    durum.envanter[kaynak] += miktar;
    durum.eylemHakki--;
    ekraniGuncelle();
    uretimleriGoster(); // Yeni kaynakla üretim açılabilir
    eylemButonlariniKontrolEt();
}

function yemekYe() {
    if (durum.oyunBitti || durum.eylemHakki <= 0) return;

    if (durum.envanter.Yiyecek > 0) {
        durum.envanter.Yiyecek--;
        durum.aclik = Math.min(MAX_DEGER, durum.aclik + 30);
        durum.eylemHakki--;
        durum.mesaj = `Yemek yendi! Açlık +30.`;
        ekraniGuncelle();
        eylemButonlariniKontrolEt();
    } else {
        durum.mesaj = `Yemek yemek için Yiyecek yok!`;
    }
}

// --- ÜRETİM SİSTEMİ ---

function uretimleriGoster() {
    uretimAlani.innerHTML = '<h2>🔨 Üretim (Crafting)</h2>';

    TARIFLER.forEach(tarif => {
        const button = document.createElement('button');
        
        let maliyetStr = Object.entries(tarif.maliyet).map(([k, v]) => `${v} ${k}`).join(', ');
        let uretildi = durum.uretimler[tarif.ad];

        button.innerText = `${tarif.ad} ${tarif.etki ? '(' + tarif.etki + ')' : ''} - Maliyet: [${maliyetStr}]`;
        button.onclick = () => urunUret(tarif);

        // Satın alma mantığı: Eylem hakkı ve kaynaklar kontrol edilir
        let kaynakYeterli = Object.entries(tarif.maliyet).every(([k, v]) => durum.envanter[k] >= v);
        
        if (uretildi || durum.eylemHakki <= 0 || !kaynakYeterli) {
            button.disabled = true;
            if (uretildi) {
                button.innerText += " (Üretildi)";
            }
        }
        
        uretimAlani.appendChild(button);
    });
}

function urunUret(tarif) {
    if (durum.oyunBitti || durum.eylemHakki <= 0) return;

    let kaynakYeterli = Object.entries(tarif.maliyet).every(([k, v]) => durum.envanter[k] >= v);
    let zatenUretildi = durum.uretimler[tarif.ad];
    
    if (kaynakYeterli && !zatenUretildi) {
        // Kaynakları tüket
        Object.entries(tarif.maliyet).forEach(([k, v]) => {
            durum.envanter[k] -= v;
        });

        // Üretimi gerçekleştir
        Object.entries(tarif.kazanc).forEach(([k, v]) => {
            durum.envanter[k] += v;
        });

        // Etkisi varsa kaydet
        if (tarif.ad !== 'İp') { // İp sürekli üretilebilir
            durum.uretimler[tarif.ad] = true;
        }

        durum.eylemHakki--;
        durum.mesaj = `${tarif.ad} başarıyla üretildi!`;
        ekraniGuncelle();
        uretimleriGoster();
        eylemButonlariniKontrolEt();
    } else if (zatenUretildi) {
        durum.mesaj = `${tarif.ad} zaten üretilmiş durumda.`;
    } else {
        durum.mesaj = `Yetersiz kaynak! Kontrol et: ${Object.entries(tarif.maliyet).map(([k, v]) => `${v} ${k}`).join(', ')}.`;
    }
}

// --- TUR MANTIĞI VE RİSKLER ---

function sonrakiTur() {
    if (durum.oyunBitti) return;

    durum.mesaj = "Yeni Gün Başladı. ";
    
    // 1. Yaşam Desteği Tüketimi
    durum.aclik -= ACIKLIK_TUKETIM;
    if (durum.aclik < 0) durum.aclik = 0;

    if (durum.aclik === 0) {
        durum.saglik -= 10;
        durum.mesaj += "AÇLIKTAN SAĞLIK KAYBI! (-10 H). ";
    } else if (durum.aclik <= 20) {
        durum.mesaj += "Çok açsın! Yemek bulmalısın. ";
    }

    // 2. Barınak Etkisi
    if (durum.uretimler['Basit Barınak']) {
        durum.saglik = Math.min(MAX_DEGER, durum.saglik + 5);
        durum.mesaj += "Barınak sayesinde dinlendin (+5 H). ";
    }

    // 3. Rastgele Tehlike (Ateş yoksa risk yüksek)
    const tehlikeOlasiligi = durum.uretimler['Ateş Yak'] ? 0.1 : 0.3; // %10 vs %30
    if (Math.random() < tehlikeOlasiligi) {
        durum.saglik -= 20;
        durum.mesaj += "VAHŞİ HAYVAN SALDIRISI! Ağır yara aldın (-20 H). ";
    }
    
    // 4. Tur İlerletme ve Sıfırlama
    durum.tur++;
    durum.eylemHakki = 3;

    // 5. Bitiş Kontrolü
    oyunBitisiniKontrolEt();

    ekraniGuncelle();
    eylemButonlariniKontrolEt();
    uretimleriGoster();
}

function oyunBitisiniKontrolEt() {
    if (durum.oyunBitti) return;

    if (durum.saglik <= 0) {
        durum.mesaj = `ÖLDÜN! ${durum.tur}. günde orman seni yendi.`;
        durum.oyunBitti = true;
    } else if (durum.tur > MAKS_TUR) {
        durum.mesaj = "KAZANDIN! Kurtarma ekibi zamanında ulaştı. Hayatta kaldın!";
        durum.oyunBitti = true;
    }
}

window.onload = oyunuYukle;
                                                                

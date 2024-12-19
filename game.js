const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elementleri
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const gameOverElement = document.getElementById('gameOver');
const finalScoreElement = document.getElementById('finalScore');

// Kuş görsellerini ve boncuk görselini yükle
const kusResim = new Image();
kusResim.src = '3.png';
const kusResim2 = new Image();
kusResim2.src = '2.png';
const cannaResim = new Image();
cannaResim.src = 'canna.png';

// Oyun ayarları
const PENCERE_GENISLIK = 480;
const PENCERE_YUKSEKLIK = 640;
const YER_YUKSEKLIK = 100;
const KUS_BOYUT = 45;
const BORU_GENISLIK = 70;
const BORU_ARALIK = 220;
const YERCEKIMI = 0.5;
const ZIPLAMA_GUCU = -10;
const MAKSIMUM_SURE = 300;
const ZAMAN_AZALMA_HIZI = 0.5;
const BONCUK_GENISLIK = 30;
const BONCUK_YUKSEKLIK = 40;
const MINIMUM_BORU_MESAFE = 350;
const BORU_HIZI = 3;
const CARPISMA_TOLERANSI = 10;
const DONME_HIZI = 0.02;
const PARLAMA_HIZI = 0.005;

class FlappyBird {
    constructor() {
        this.isSoundOn = true;
        this.halisunasyonSeviyesi = 0;
        this.gameStarted = false;
        this.highScore = parseInt(localStorage.getItem('highScore')) || 0;
        this.toplananboncukSayisi = 0;  // Toplanan boncuk sayısını takip etmek için

        // Müzik listesi
        this.muzikListesi = [
            'music.mp3',
            'music1.mp3',
            'music2.mp3',
            'music3.mp3'
        ];
        this.aktifMuzikIndex = 0;

        // Ses efektleri
        this.jumpSound = new Audio('jump.mp3');
        this.jumpSound.volume = 1.0;
        this.smokeSound = new Audio('smoke.mp3');
        this.smokeSound.volume = 1.0;
        this.gameOverSound = new Audio('gameover.mp3'); // Game over sesi

        // Arkaplan müziği
        this.bgMusic = new Audio(this.muzikListesi[this.aktifMuzikIndex]);
        this.bgMusic.loop = true;
        this.bgMusic.volume = 0.5;

        // Ses kontrolü
        this.soundToggle = document.getElementById('soundToggle');
        this.prevMusic = document.getElementById('prevMusic');
        this.nextMusic = document.getElementById('nextMusic');
        
        // Mouse olaylarını düzenleme
        const handleSoundToggle = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleSound();
        };

        const handlePrevMusic = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.oncekiMuzik();
        };

        const handleNextMusic = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.sonrakiMuzik();
        };

        this.soundToggle.addEventListener('mousedown', handleSoundToggle);
        this.prevMusic.addEventListener('mousedown', handlePrevMusic);
        this.nextMusic.addEventListener('mousedown', handleNextMusic);

        // Login ekranı
        this.loginScreen = document.getElementById('loginScreen');
        document.getElementById('startButton').addEventListener('click', () => {
            this.startGame();
            this.loginScreen.style.display = 'none';
            if (this.isSoundOn) {
                this.bgMusic.play().catch(e => console.log('Müzik başlatılamadı:', e));
            }
        });

        // Oyunu başlatma
        this.hedefSure = MAKSIMUM_SURE;
        this.patlamaEfektleri = [];
        this.highYazilar = [];
        this.setupGame();
    }

    startGame() {
        if (!this.gameStarted) {
            this.gameStarted = true;
            this.reset();
            this.oyunDongusu();
        }
    }

    toggleSound() {
        this.isSoundOn = !this.isSoundOn;
        const icon = this.soundToggle.querySelector('.sound-icon');
        const newIcon = this.isSoundOn ? '🔊' : '🔇';
        icon.textContent = newIcon;
        
        if (this.isSoundOn) {
            this.bgMusic.play().catch(e => console.log('Müzik başlatılamadı:', e));
        } else {
            this.bgMusic.pause();
        }
    }

    setupGame() {
        this.reset();
        this.hedefAci = 0;
        this.mevcutAci = 0;
        this.boncukAci = 0;
        this.parlamaEfekti = 0;
        this.karakterGecisEfekti = 1;
        this.oncekiKarakterDurumu = true;
        this.hedefSure = MAKSIMUM_SURE;
        
        const touchArea = document.getElementById('touchArea');
        touchArea.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.zipla();
        }, { passive: false });

        document.addEventListener('keydown', (e) => this.tusBasildi(e));
        
        this.ekraniBoyutlandir();
        window.addEventListener('resize', () => this.ekraniBoyutlandir());
        
        window.game = this;
    }

    oyunuBitir() {
        this.oyunAktif = false;
        if (this.puan > this.highScore) {
            this.highScore = this.puan;
            localStorage.setItem('highScore', this.highScore);
        }
        finalScoreElement.textContent = this.puan;
        gameOverElement.style.display = 'block';
        if (this.isSoundOn) {
            this.gameOverSound.play().catch(e => console.log('Game over sesi çalınamadı:', e));
        }
    }

    reset() {
        if (this.oyunAktif) {
            return;
        }

        this.kus = {
            x: 150,
            y: PENCERE_YUKSEKLIK / 2,
            hiz: 0
        };
        
        this.borular = [];
        this.boncuklar = [];
        this.sonBoruX = 0;
        this.boruOlustur();
        
        this.puan = 0;
        this.oyunAktif = true;
        this.kalanSure = MAKSIMUM_SURE;
        this.hedefSure = MAKSIMUM_SURE;
        this.halisunasyonSeviyesi = 0;
        this.toplananboncukSayisi = 0;  // Reset'te sıfırla

        if (this.isSoundOn && this.bgMusic.paused) {
            this.bgMusic.play().catch(e => console.log('Müzik başlatılamadı:', e));
        }

        this.uiGuncelle();
        gameOverElement.style.display = 'none';
    }

    uiGuncelle() {
        scoreElement.textContent = `Score: ${this.puan}`;
        highScoreElement.textContent = `High Score: ${this.highScore}`;
    }

    ekraniBoyutlandir() {
        const canvas = document.getElementById('gameCanvas');
        const container = document.body;
        
        // Ekran oranını koru
        const gameRatio = PENCERE_GENISLIK / PENCERE_YUKSEKLIK;
        const containerRatio = container.clientWidth / container.clientHeight;
        
        if (containerRatio > gameRatio) {
            // Ekran daha geniş, yüksekliğe göre boyutlandır
            const yeniYukseklik = container.clientHeight;
            const yeniGenislik = yeniYukseklik * gameRatio;
            
            canvas.style.width = `${yeniGenislik}px`;
            canvas.style.height = `${yeniYukseklik}px`;
        } else {
            // Ekran daha dar, genişliğe göre boyutlandır
            const yeniGenislik = container.clientWidth;
            const yeniYukseklik = yeniGenislik / gameRatio;
            
            canvas.style.width = `${yeniGenislik}px`;
            canvas.style.height = `${yeniYukseklik}px`;
        }
    }

    boncukOlustur(boruX, boruUstYukseklik, boruAltY) {
        const guvenliAlanBaslangic = boruUstYukseklik + 50;
        const guvenliAlanBitis = boruAltY - 50;
        
        if (guvenliAlanBitis - guvenliAlanBaslangic > BONCUK_YUKSEKLIK * 2) {
            const rastgeleY = Math.random() * (guvenliAlanBitis - guvenliAlanBaslangic) + guvenliAlanBaslangic;
            
            this.boncuklar.push({
                x: boruX + BORU_GENISLIK + 50,
                y: rastgeleY,
                alinmadi: true,
                aci: Math.random() * Math.PI * 2
            });
        }
    }

    boruOlustur() {
        if (this.sonBoruX > 0 && PENCERE_GENISLIK - this.sonBoruX < MINIMUM_BORU_MESAFE) {
            return;
        }

        const boslukY = Math.random() * (PENCERE_YUKSEKLIK - 400) + 200;
        const yeniBoru = {
            x: PENCERE_GENISLIK,
            ustYukseklik: boslukY - BORU_ARALIK / 2,
            altY: boslukY + BORU_ARALIK / 2,
            puanAlindi: false,
            olusturmaZamani: Date.now() * 0.001  // Boru oluşturma zamanını kaydet
        };
        
        this.borular.push(yeniBoru);
        this.sonBoruX = PENCERE_GENISLIK;

        if (Math.random() < 0.5) {
            this.boncukOlustur(yeniBoru.x, yeniBoru.ustYukseklik, yeniBoru.altY);
        }
    }

    tusBasildi(e) {
        if (e.code === 'Space') {
            e.preventDefault(); // Varsayılan davranışı engelle
            if (this.oyunAktif) {
                this.zipla();
            } else {
                this.reset();
            }
        }
    }

    zipla() {
        if (this.oyunAktif) {
            this.kus.hiz = ZIPLAMA_GUCU;
            if (this.isSoundOn) {
                this.jumpSound.currentTime = 0;
                this.jumpSound.play().catch(e => console.log('Zıplama sesi çalınamadı:', e));
            }
        }
    }

    oyunuGuncelle() {
        if (!this.oyunAktif) return;

        // Zamanı yumuşak şekilde güncelle
        const sureFarki = this.hedefSure - this.kalanSure;
        if (Math.abs(sureFarki) > 0.1) {
            this.kalanSure += sureFarki * 0.1; // Yumuşak geçiş için %10 adımlarla ilerle
        }

        // HIGH! yazılarını güncelle
        for (let i = this.highYazilar.length - 1; i >= 0; i--) {
            const yazi = this.highYazilar[i];
            yazi.y -= 2;  // Yukarı doğru hareket hızını artırdık
            yazi.alpha -= 0.008;  // Yavaşça kaybolma hızını azalttık
            yazi.scale = Math.min(1, yazi.scale + 0.05);  // Büyüme hızını azalttık

            if (yazi.alpha <= 0) {
                this.highYazilar.splice(i, 1);
            }
        }

        this.kalanSure -= ZAMAN_AZALMA_HIZI;
        this.hedefSure -= ZAMAN_AZALMA_HIZI;

        if (this.kalanSure <= 0) {
            this.oyunuBitir();
            return;
        }

        // Parlama efektini yumuşak şekilde güncelle
        this.parlamaEfekti = (Math.sin(Date.now() * PARLAMA_HIZI) + 1) / 2;
        this.parlamaEfekti = this.parlamaEfekti * this.parlamaEfekti * (3 - 2 * this.parlamaEfekti);

        // Karakter geçiş efektini güncelle
        const zamanOrani = this.kalanSure / MAKSIMUM_SURE;
        const guncelKarakterDurumu = zamanOrani > 0.5;
        
        if (this.oncekiKarakterDurumu !== guncelKarakterDurumu) {
            this.karakterGecisEfekti = 0; // Geçişi başlat
            this.oncekiKarakterDurumu = guncelKarakterDurumu;
        }
        
        // Geçiş efektini yumuşak şekilde güncelle
        if (this.karakterGecisEfekti < 1) {
            this.karakterGecisEfekti = Math.min(1, this.karakterGecisEfekti + 0.05);
        }

        this.kus.hiz += YERCEKIMI;
        this.kus.y += this.kus.hiz;

        if (this.kus.hiz < 0) {
            this.hedefAci = Math.PI/6;
        } else {
            this.hedefAci = -Math.PI/6;
        }

        const aciDegisimHizi = 0.15;
        this.mevcutAci += (this.hedefAci - this.mevcutAci) * aciDegisimHizi;

        this.boncukAci += DONME_HIZI;
        if (this.boncukAci >= Math.PI * 2) {
            this.boncukAci = 0;
        }

        for (let boru of this.borular) {
            boru.x -= BORU_HIZI;
            this.sonBoruX = Math.max(...this.borular.map(b => b.x));

            if (!boru.puanAlindi && boru.x < this.kus.x) {
                this.puan++;
                this.highScore = Math.max(this.puan, this.highScore);
                boru.puanAlindi = true;
                this.uiGuncelle();
            }
        }

        for (let boncuk of this.boncuklar) {
            boncuk.x -= BORU_HIZI;

            if (boncuk.alinmadi &&
                this.kus.x < boncuk.x + BONCUK_GENISLIK &&
                this.kus.x + KUS_BOYUT > boncuk.x &&
                this.kus.y < boncuk.y + BONCUK_YUKSEKLIK &&
                this.kus.y + KUS_BOYUT > boncuk.y) {
                this.boncukToplamaEfekti(boncuk);
            }
        }

        if (this.sonBoruX < PENCERE_GENISLIK - MINIMUM_BORU_MESAFE) {
            this.boruOlustur();
        }

        this.borular = this.borular.filter(boru => boru.x > -BORU_GENISLIK);
        this.boncuklar = this.boncuklar.filter(boncuk => boncuk.x > -BONCUK_GENISLIK);

        this.carpismaKontrol();

        // Patlama efektlerini güncelle
        for (let i = this.patlamaEfektleri.length - 1; i >= 0; i--) {
            const patlama = this.patlamaEfektleri[i];
            patlama.yasam -= 0.02;  // Yavaşça azalt

            for (let parcacik of patlama.parcaciklar) {
                parcacik.x += Math.cos(parcacik.aci) * parcacik.hiz * patlama.yasam;
                parcacik.y += Math.sin(parcacik.aci) * parcacik.hiz * patlama.yasam;
                parcacik.alpha = patlama.yasam;
                parcacik.boyut *= 0.99;
            }

            if (patlama.yasam <= 0) {
                this.patlamaEfektleri.splice(i, 1);
            }
        }
    }

    carpismaKontrol() {
        const kusHitbox = {
            x: this.kus.x + KUS_BOYUT * 0.3,
            y: this.kus.y + KUS_BOYUT * 0.3,
            genislik: KUS_BOYUT * 0.4,
            yukseklik: KUS_BOYUT * 0.4
        };

        if (this.kus.y > PENCERE_YUKSEKLIK - YER_YUKSEKLIK - KUS_BOYUT * 0.4 || 
            this.kus.y < KUS_BOYUT * 0.2) {
            this.oyunuBitir();
            return;
        }

        for (let boru of this.borular) {
            const boruUstHitbox = {
                x: (boru.guncelX || boru.x) + BORU_GENISLIK * 0.1,
                y: 0,
                genislik: BORU_GENISLIK * 0.8,
                yukseklik: boru.guncelUstYukseklik || boru.ustYukseklik
            };

            const boruAltHitbox = {
                x: (boru.guncelX || boru.x) + BORU_GENISLIK * 0.1,
                y: boru.guncelAltY || boru.altY,
                genislik: BORU_GENISLIK * 0.8,
                yukseklik: PENCERE_YUKSEKLIK - (boru.guncelAltY || boru.altY)
            };

            if (this.hassasCarpismaKontrol(kusHitbox, boruUstHitbox) || 
                this.hassasCarpismaKontrol(kusHitbox, boruAltHitbox)) {
                this.oyunuBitir();
                return;
            }
        }
    }

    hassasCarpismaKontrol(kus, boru) {
        const minOrtusme = 3; // Minimum örtüşme miktarını azalt

        const yatayOrtusme = Math.min(
            (kus.x + kus.genislik) - boru.x,
            (boru.x + boru.genislik) - kus.x
        );

        const dikeyOrtusme = Math.min(
            (kus.y + kus.yukseklik) - boru.y,
            (boru.y + boru.yukseklik) - kus.y
        );

        return yatayOrtusme > minOrtusme && 
               dikeyOrtusme > minOrtusme && 
               kus.x < boru.x + boru.genislik &&
               kus.x + kus.genislik > boru.x &&
               kus.y < boru.y + boru.yukseklik &&
               kus.y + kus.yukseklik > boru.y;
    }

    // Ongen çizme fonksiyonu
    ongenCiz(ctx, x, y, boyut) {
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
            const aci = (Math.PI * 2 / 10) * i;
            const sonrakiX = x + boyut * Math.cos(aci);
            const sonrakiY = y + boyut * Math.sin(aci);
            if (i === 0) {
                ctx.moveTo(sonrakiX, sonrakiY);
            } else {
                ctx.lineTo(sonrakiX, sonrakiY);
            }
        }
        ctx.closePath();
    }

    ekraniCiz() {
        const time = Date.now() * 0.001;
        const timeRatio = this.kalanSure / MAKSIMUM_SURE;
        
        // Halüsinasyon seviyesine göre efekt yoğunluğunu ayarla
        const halisunasyonFaktoru = Math.min(1, this.halisunasyonSeviyesi / 25); // 25 boncukta maksimum etki
        
        // Başlangıç renkleri (Canlı tonlar)
        const baslangicUst = {r: 100, g: 200, b: 255}; // Parlak mavi
        const baslangicAlt = {r: 150, g: 100, b: 255}; // Mor
        
        // Bitiş renkleri (Psikedelik tonlar)
        const bitisUst = {r: 255, g: 50, b: 100};    // Neon pembe
        const bitisAlt = {r: 200, g: 50, b: 255};    // Mor

        // Dalgalı efekt için offset hesapla - halüsinasyon seviyesine göre artan
        const waveOffset = Math.sin(time) * 20 * (1 + halisunasyonFaktoru * 2);
        const waveOffset2 = Math.cos(time * 1.5) * 15 * (1 + halisunasyonFaktoru * 2);
        
        // Renkleri karıştır ve dalgalandır
        for(let y = 0; y < PENCERE_YUKSEKLIK; y += 2) {
            const yRatio = y / PENCERE_YUKSEKLIK;
            
            // Dalga efekti - halüsinasyon seviyesine göre artan
            const wave = Math.sin(y * 0.01 + time * (1 + halisunasyonFaktoru)) * waveOffset;
            const wave2 = Math.cos(y * 0.02 - time * 0.5 * (1 + halisunasyonFaktoru)) * waveOffset2;
            const totalWave = wave + wave2;
            
            // Renk geçişi - halüsinasyon seviyesine göre daha canlı
            const r = Math.floor(
                baslangicUst.r + (bitisUst.r - baslangicUst.r) * (1 - timeRatio) * (1 + Math.sin(y * 0.01 + time * (1 + halisunasyonFaktoru * 2))) / 2
            );
            const g = Math.floor(
                baslangicUst.g + (bitisUst.g - baslangicUst.g) * (1 - timeRatio) * (1 + Math.cos(y * 0.015 + time * 1.2 * (1 + halisunasyonFaktoru * 2))) / 2
            );
            const b = Math.floor(
                baslangicUst.b + (bitisUst.b - baslangicUst.b) * (1 - timeRatio) * (1 + Math.sin(y * 0.02 + time * 0.8 * (1 + halisunasyonFaktoru * 2))) / 2
            );

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(PENCERE_GENISLIK, y + totalWave);
            ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.stroke();
        }

        // Parlayan daire efektleri - halüsinasyon seviyesine göre daha belirgin
        for(let i = 0; i < 5; i++) {
            const x = PENCERE_GENISLIK * (0.2 + Math.sin(time * (i + 1) * 0.5 * (1 + halisunasyonFaktoru)) * 0.3);
            const y = PENCERE_YUKSEKLIK * (0.2 + Math.cos(time * (i + 1) * 0.7 * (1 + halisunasyonFaktoru)) * 0.3);
            const radius = (50 + Math.sin(time * (i + 1)) * 20) * (1 + halisunasyonFaktoru);
            
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
            gradient.addColorStop(0, `rgba(255, 255, 255, ${(0.1 + Math.sin(time) * 0.05) * (1 + halisunasyonFaktoru * 1.5)})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Yarı saydam overlay - halüsinasyon seviyesine göre değişen yeşil renk
        const overlayOpacity = 0.1 + (Math.sin(time) * 0.05) * (1 + halisunasyonFaktoru * 0.5);
        ctx.fillStyle = `rgba(124, 255, 155, ${overlayOpacity})`;
        ctx.fillRect(0, 0, PENCERE_GENISLIK, PENCERE_YUKSEKLIK);

        // Diğer oyun elementlerini çiz...
        this.borulariCiz();
        this.boncuklariCiz();
        this.zeminCiz();
        this.kusuCiz();
        this.efektleriCiz();
    }

    borulariCiz() {
        const time = Date.now() * 0.001;
        const yatayHareketAktif = this.toplananboncukSayisi >= 5;
        const dikeyHareketAktif = this.toplananboncukSayisi >= 10;
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 5;
        ctx.fillStyle = '#7cff9b';

        for (let boru of this.borular) {
            let xOffset = 0;
            let yOffset = 0;
            
            if (yatayHareketAktif) {
                // Sağa-sola hareket
                const yatayFrekansi = 1.5;
                const yatayGenlik = 20;
                xOffset = Math.sin((time - boru.olusturmaZamani) * yatayFrekansi) * yatayGenlik;
            }

            if (dikeyHareketAktif) {
                // Yukarı-aşağı hareket
                const dikeyFrekansi = 2;
                const dikeyGenlik = 25;
                yOffset = Math.cos((time - boru.olusturmaZamani) * dikeyFrekansi) * dikeyGenlik;
            }

            // Üst boru
            this.roundedRect(
                ctx, 
                boru.x + xOffset, 
                yOffset, 
                BORU_GENISLIK, 
                boru.ustYukseklik, 
                5
            );
            
            // Alt boru
            this.roundedRect(
                ctx, 
                boru.x + xOffset, 
                boru.altY + yOffset, 
                BORU_GENISLIK, 
                PENCERE_YUKSEKLIK - boru.altY, 
                5
            );

            // Çarpışma kontrolü için boru pozisyonlarını güncelle
            boru.guncelX = boru.x + xOffset;
            boru.guncelUstYukseklik = boru.ustYukseklik + yOffset;
            boru.guncelAltY = boru.altY + yOffset;
        }

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
    }

    boncuklariCiz() {
        // Boncukları çiz
        for (let boncuk of this.boncuklar) {
            if (boncuk.alinmadi && cannaResim.complete) {
                ctx.save();
                
                const boncukX = boncuk.x + BONCUK_GENISLIK/2;
                const boncukY = boncuk.y + BONCUK_YUKSEKLIK/2;
                ctx.translate(boncukX, boncukY);
                
                // Parlayan ongen arka planı çiz
                const parlaklik = 200 + Math.floor(55 * this.parlamaEfekti);
                ctx.fillStyle = `rgb(${parlaklik}, ${Math.floor(parlaklik * 0.84)}, 0)`;
                this.ongenCiz(ctx, 0, 0, Math.max(BONCUK_GENISLIK, BONCUK_YUKSEKLIK) * 0.55);
                ctx.fill();
                
                // Ongen kenarlarını çiz
                ctx.strokeStyle = '#DAA520';
                ctx.lineWidth = 2; // Kenar kalınlığını artırdık
                this.ongenCiz(ctx, 0, 0, Math.max(BONCUK_GENISLIK, BONCUK_YUKSEKLIK) * 0.55);
                ctx.stroke();

                // İlk blur katmanı (en geniş ve en silik)
                ctx.shadowColor = `rgba(255, 215, 0, ${this.parlamaEfekti * 0.25})`;
                ctx.shadowBlur = 45;
                this.ongenCiz(ctx, 0, 0, Math.max(BONCUK_GENISLIK, BONCUK_YUKSEKLIK) * 0.55);
                ctx.fill();

                // İkinci blur katmanı
                ctx.shadowColor = `rgba(255, 215, 0, ${this.parlamaEfekti * 0.35})`;
                ctx.shadowBlur = 35;
                this.ongenCiz(ctx, 0, 0, Math.max(BONCUK_GENISLIK, BONCUK_YUKSEKLIK) * 0.55);
                ctx.fill();

                // Üçüncü blur katmanı
                ctx.shadowColor = `rgba(255, 215, 0, ${this.parlamaEfekti * 0.45})`;
                ctx.shadowBlur = 25;
                this.ongenCiz(ctx, 0, 0, Math.max(BONCUK_GENISLIK, BONCUK_YUKSEKLIK) * 0.55);
                ctx.fill();

                // Dördüncü blur katmanı
                ctx.shadowColor = `rgba(255, 215, 0, ${this.parlamaEfekti * 0.55})`;
                ctx.shadowBlur = 20;
                this.ongenCiz(ctx, 0, 0, Math.max(BONCUK_GENISLIK, BONCUK_YUKSEKLIK) * 0.55);
                ctx.fill();

                // Son blur katmanı (en keskin)
                ctx.shadowColor = `rgba(255, 215, 0, ${this.parlamaEfekti * 0.65})`;
                ctx.shadowBlur = 15;
                this.ongenCiz(ctx, 0, 0, Math.max(BONCUK_GENISLIK, BONCUK_YUKSEKLIK) * 0.55);
                ctx.fill();
                
                // Glow efektini sıfırla ve canna resmini çiz
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                
                // Canna resmini döndürerek çiz
                ctx.rotate(this.boncukAci);
                ctx.drawImage(cannaResim,
                    -BONCUK_GENISLIK/2,
                    -BONCUK_YUKSEKLIK/2,
                    BONCUK_GENISLIK,
                    BONCUK_YUKSEKLIK
                );
                
                ctx.restore();
            }
        }
    }

    zeminCiz() {
        // Modern zemin gradyanı
        const groundGradient = ctx.createLinearGradient(0, PENCERE_YUKSEKLIK - YER_YUKSEKLIK, 0, PENCERE_YUKSEKLIK);
        groundGradient.addColorStop(0, '#7cff9b');  // Açık yeşil
        groundGradient.addColorStop(1, '#5ed17c');  // Biraz daha koyu yeşil
        ctx.fillStyle = groundGradient;
        ctx.fillRect(0, PENCERE_YUKSEKLIK - YER_YUKSEKLIK, PENCERE_GENISLIK, YER_YUKSEKLIK);
    }

    kusuCiz() {
        if (kusResim.complete) {
            ctx.save();
            
            const kusX = this.kus.x + KUS_BOYUT/2;
            const kusY = this.kus.y + KUS_BOYUT/2;
            ctx.translate(kusX, kusY);
            
            ctx.scale(-1, 1);
            
            ctx.rotate(this.mevcutAci);
            
            // Karakter geçişini uygula
            const zamanOrani = this.kalanSure / MAKSIMUM_SURE;
            const gecisAlpha = Math.sin(this.karakterGecisEfekti * Math.PI / 2);

            if (zamanOrani > 0.5) {
                ctx.globalAlpha = gecisAlpha;
                ctx.drawImage(kusResim, 
                    -KUS_BOYUT * 0.75,
                    -KUS_BOYUT * 0.75,
                    KUS_BOYUT * 1.5,
                    KUS_BOYUT * 1.5
                );
            } else {
                ctx.globalAlpha = gecisAlpha;
                ctx.drawImage(kusResim2, 
                    -KUS_BOYUT * 0.75,
                    -KUS_BOYUT * 0.75,
                    KUS_BOYUT * 1.5,
                    KUS_BOYUT * 1.5
                );
            }
            
            ctx.restore();
        }
    }

    efektleriCiz() {
        // Patlama efektlerini çiz
        for (const patlama of this.patlamaEfektleri) {
            for (const parcacik of patlama.parcaciklar) {
                ctx.save();
                ctx.globalAlpha = parcacik.alpha;
                ctx.fillStyle = parcacik.renk;
                ctx.beginPath();
                ctx.arc(parcacik.x, parcacik.y, parcacik.boyut, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // HIGH! yazılarını çiz
        for (const yazi of this.highYazilar) {
            ctx.save();
            ctx.translate(yazi.x, yazi.y);
            ctx.scale(yazi.scale, yazi.scale);
            ctx.globalAlpha = yazi.alpha;
            
            // HIGH! yazısı - geniş ve yayılmış
            const letters = ['H', 'I', 'G', 'H', '!'];
            const letterSpacing = 25;
            const totalWidth = letterSpacing * (letters.length - 1);
            const startX = -totalWidth / 2;

            ctx.fillStyle = '#FFD700';
            ctx.strokeStyle = '#B8860B';
            ctx.lineWidth = 3;
            ctx.font = 'bold 32px Poppins';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            letters.forEach((letter, index) => {
                const x = startX + letterSpacing * index;
                const time = Date.now() * 0.01;
                const offsetY = Math.sin(time + index * 1.5) * 5;
                const offsetX = Math.cos(time + index * 1.5) * 3;
                
                ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
                ctx.shadowBlur = 15;
                ctx.strokeText(letter, x + offsetX, offsetY);
                ctx.fillText(letter, x + offsetX, offsetY);
            });
            
            ctx.restore();
        }

        // Oyun bittiğinde karartma efekti
        if (!this.oyunAktif) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, PENCERE_GENISLIK, PENCERE_YUKSEKLIK);
        }
    }

    roundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }

    oyunDongusu() {
        this.oyunuGuncelle();
        this.ekraniCiz();
        requestAnimationFrame(() => this.oyunDongusu());
    }

    patlamaEfektiEkle(x, y) {
        const parcacikSayisi = 12;
        const parcaciklar = [];
        
        for (let i = 0; i < parcacikSayisi; i++) {
            const aci = (Math.PI * 2 * i) / parcacikSayisi;
            parcaciklar.push({
                x: x,
                y: y,
                hiz: 8,
                aci: aci,
                boyut: 5,
                alpha: 1,
                renk: `hsl(${Math.random() * 60 + 30}, 100%, 50%)`  // Altın/sarı tonları
            });
        }
        
        this.patlamaEfektleri.push({
            parcaciklar,
            yasam: 1  // 1'den 0'a azalacak
        });

        // HIGH! yazısını ekle
        this.highYazilar.push({
            x: x,
            y: y - 30,
            alpha: 1,
            scale: 0.1  // Başlangıç ölçeği küçük
        });
    }

    boncukToplamaEfekti(boncuk) {
        boncuk.alinmadi = false;
        this.hedefSure = MAKSIMUM_SURE;
        this.puan += 5;
        this.halisunasyonSeviyesi = Math.min(this.halisunasyonSeviyesi + 0.15, 1);
        this.toplananboncukSayisi++;
        this.uiGuncelle();
        
        if (this.isSoundOn) {
            this.smokeSound.currentTime = 0;
            this.smokeSound.play().catch(e => console.log('Smoke sesi çalınamadı:', e));
        }
        
        this.patlamaEfektiEkle(
            boncuk.x + BONCUK_GENISLIK/2,
            boncuk.y + BONCUK_YUKSEKLIK/2
        );
    }

    boncukKontrol() {
        for (let i = this.boncuklar.length - 1; i >= 0; i--) {
            const boncuk = this.boncuklar[i];
            if (boncuk.alinmadi) {
                const dx = this.kus.x - boncuk.x;
                const dy = this.kus.y - boncuk.y;
                const mesafe = Math.sqrt(dx * dx + dy * dy);
                
                if (mesafe < KUS_BOYUT / 2 + BONCUK_GENISLIK / 2) {
                    boncuk.alinmadi = false;
                    this.kalanSure = Math.min(this.kalanSure + 30, MAKSIMUM_SURE);
                    this.puan += 10;
                    this.halisunasyonSeviyesi = Math.min(this.halisunasyonSeviyesi + 0.15, 1); // Boncuk toplandıkça artış
                    this.uiGuncelle();
                }
            }
        }
    }

    oncekiMuzik() {
        if (this.isSoundOn) {
            this.aktifMuzikIndex--;
            if (this.aktifMuzikIndex < 0) {
                this.aktifMuzikIndex = this.muzikListesi.length - 1;
            }
            const suankiZaman = this.bgMusic.currentTime;
            const suankiOynatiliyor = !this.bgMusic.paused;
            
            this.bgMusic.src = this.muzikListesi[this.aktifMuzikIndex];
            this.bgMusic.currentTime = suankiZaman;
            
            if (suankiOynatiliyor) {
                this.bgMusic.play().catch(e => console.log('Müzik başlatılamadı:', e));
            }
        }
    }

    sonrakiMuzik() {
        if (this.isSoundOn) {
            this.aktifMuzikIndex = (this.aktifMuzikIndex + 1) % this.muzikListesi.length;
            const suankiZaman = this.bgMusic.currentTime;
            const suankiOynatiliyor = !this.bgMusic.paused;
            
            this.bgMusic.src = this.muzikListesi[this.aktifMuzikIndex];
            this.bgMusic.currentTime = suankiZaman;
            
            if (suankiOynatiliyor) {
                this.bgMusic.play().catch(e => console.log('Müzik başlatılamadı:', e));
            }
        }
    }
}

new FlappyBird(); 
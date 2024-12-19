import pygame
import random
import sys

# Oyun ayarları
PENCERE_GENISLIK = 400
PENCERE_YUKSEKLIK = 600
YER_YUKSEKLIK = 100
FPS = 60

# Renkler
BEYAZ = (255, 255, 255)
MAVI = (0, 0, 255)
YESIL = (0, 255, 0)

class FlappyBird:
    def __init__(self):
        pygame.init()
        self.ekran = pygame.display.set_mode((PENCERE_GENISLIK, PENCERE_YUKSEKLIK))
        pygame.display.set_caption('Flappy Bird')
        self.saat = pygame.time.Clock()
        
        # Kuş özellikleri
        self.kus_x = 100
        self.kus_y = PENCERE_YUKSEKLIK // 2
        self.kus_hiz = 0
        self.kus_boyut = 30
        
        # Boru özellikleri
        self.borular = []
        self.boru_genislik = 50
        self.boru_aralik = 200
        self.boru_olustur()
        
        self.puan = 0
        self.oyun_aktif = True

    def boru_olustur(self):
        bosluk_y = random.randint(200, PENCERE_YUKSEKLIK - 200)
        yeni_boru = {
            'x': PENCERE_GENISLIK,
            'ust_yukseklik': bosluk_y - self.boru_aralik // 2,
            'alt_y': bosluk_y + self.boru_aralik // 2
        }
        self.borular.append(yeni_boru)

    def oyunu_guncelle(self):
        # Yerçekimi
        self.kus_hiz += 0.5
        self.kus_y += self.kus_hiz
        
        # Boruları hareket ettir
        for boru in self.borular:
            boru['x'] -= 3
        
        # Yeni boru oluştur
        if len(self.borular) == 0 or self.borular[-1]['x'] < PENCERE_GENISLIK - 300:
            self.boru_olustur()
            
        # Eski boruları sil
        self.borular = [boru for boru in self.borular if boru['x'] > -self.boru_genislik]
        
        # Çarpışma kontrolü
        for boru in self.borular:
            if (self.kus_x + self.kus_boyut > boru['x'] and 
                self.kus_x < boru['x'] + self.boru_genislik):
                if (self.kus_y < boru['ust_yukseklik'] or 
                    self.kus_y + self.kus_boyut > boru['alt_y']):
                    self.oyun_aktif = False
        
        # Yer ve tavan kontrolü
        if self.kus_y > PENCERE_YUKSEKLIK - YER_YUKSEKLIK or self.kus_y < 0:
            self.oyun_aktif = False

    def ekrani_ciz(self):
        self.ekran.fill(BEYAZ)
        
        # Kuşu çiz
        pygame.draw.rect(self.ekran, MAVI, 
                        (self.kus_x, self.kus_y, self.kus_boyut, self.kus_boyut))
        
        # Boruları çiz
        for boru in self.borular:
            pygame.draw.rect(self.ekran, YESIL, 
                           (boru['x'], 0, self.boru_genislik, boru['ust_yukseklik']))
            pygame.draw.rect(self.ekran, YESIL, 
                           (boru['x'], boru['alt_y'], 
                            self.boru_genislik, PENCERE_YUKSEKLIK - boru['alt_y']))
        
        # Yeri çiz
        pygame.draw.rect(self.ekran, YESIL, 
                        (0, PENCERE_YUKSEKLIK - YER_YUKSEKLIK, 
                         PENCERE_GENISLIK, YER_YUKSEKLIK))
        
        pygame.display.flip()

    def oyunu_baslat(self):
        while True:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_SPACE and self.oyun_aktif:
                        self.kus_hiz = -10
                    if event.key == pygame.K_SPACE and not self.oyun_aktif:
                        self.__init__()

            if self.oyun_aktif:
                self.oyunu_guncelle()
            self.ekrani_ciz()
            self.saat.tick(FPS)

if __name__ == '__main__':
    oyun = FlappyBird()
    oyun.oyunu_baslat() 
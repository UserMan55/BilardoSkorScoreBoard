# Proje Tanımları ve Terimler

Bu dosya, proje geliştirme sürecinde kullanılan terimlerin ve bileşenlerin ortak tanımlarını içerir.

## 1. Mobil Tarafı (Mobile Side)
*   **Tanım:** Mobil cihazlar üzerinden çalıştırılan arayüz.
*   **İşlev:** Uzaktan canlı maç başlatmak, oyunu yönetmek ve "kumanda" işlevi görmek için kullanılır.

## 2. Tabela Tarafı (Scoreboard Side)
*   **Tanım:** Skor tabelası uygulamasının yürütüldüğü ana ekran.
*   **Mevcut Durum:** Test aşamasında laptop/tarayıcı üzerinde çalışmaktadır.
*   **Hedef Durum:** Raspberry Pi üzerinde çalışacaktır.
*   **İşlev:** Maç skorunu, oyuncu bilgilerini ve oyun durumunu izleyicilere gösterir.

## 3. Tabela Ana Sayfa (Scoreboard Home)
*   **Tanım:** Proje başlatıldığında Tabela Tarafında görünen ilk ekran.
*   **İçerik:** Proje logosu bulunur.
*   **İşlev:** 
    *   "Canlı Maç Başlat" komutunu bekler (Listening Mode).
    *   Manuel olarak maç başlatma seçeneği sunar.

## 4. Server
*   **Tanım:** Raspberry Pi üzerine kurulacak arka uç hizmeti.
*   **Teknoloji:** Node.js ve Express.
*   **İşlev:** Sistem haberleşmesini ve veri akışını yönetir.

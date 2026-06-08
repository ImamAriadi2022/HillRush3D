# HillRush 3D

**HillRush 3D** adalah sebuah game balapan sederhana 3D berbasis web yang terinspirasi dari gameplay klasik *Hill Climb Racing*. Proyek ini dibangun menggunakan pustaka grafika 3D **Three.js** dan di-bundel menggunakan **Vite** dengan menerapkan konsep **ES Modules modern**. Proyek ini dikembangkan sebagai tugas mata kuliah **Grafika Komputer**.

---

## 🎮 Spesifikasi & Fitur Utama

### 1. Objek 3D & Kustomisasi Kendaraan
- **Model Kendaraan**: Memuat model kendaraan bergaya low-poly (`low-poly_truck_car_drifter.glb`) secara asinkron menggunakan `GLTFLoader`.
- **Auto-Scaling & Pivot Adjustment**: Ukuran kendaraan disesuaikan secara otomatis (~3.5 unit panjang) dan posisi Y poros roda dihitung secara dinamis sehingga ban selalu menempel pas di atas permukaan jalan bukit/jembatan.
- **Efek Putaran Roda**: Roda kendaraan berputar pada sumbu Z lokal axle secara dinamis menyesuaikan dengan kecepatan dan arah pergerakan mobil.

### 2. Sirkuit Berkelok & Berbukit Prosedural
- **Winding Road**: Garis tengah sirkuit meliuk-liuk (berkelok) secara prosedural menggunakan kombinasi gelombang sinus dan kosinus.
- **Procedural Plane Heights**: Sirkuit dibentuk dari `PlaneGeometry` berukuran panjang 2200 unit dengan deformasi ketinggian vertikal dinamis (berbukit).
- **Stylized Vertex Colors**: Pewarnaan jalan tanah (Light Mode) atau jalan aspal (Dark Mode) serta lereng perbukitan hijau/violet dihitung secara dinamis mengikuti arah kelokan jalan.

### 3. Sistem Jembatan Dinamis & Deteksi Jatuh
- **3 Zona Jurang**: Terdapat 3 lembah curam di Z = -250, Z = -500, dan Z = -750.
- **Jembatan Paralel Acak**: Setiap kali game dimulai atau diulang, susunan jembatan diacak:
  - *Tipe Tunggal*: Jembatan lebar (4.2 unit) di tengah jalan.
  - *Tipe Ganda*: Dua jembatan paralel sempit (2.2 unit) di kiri dan kanan dengan **celah kosong (jurang) di tengah jalan**.
- **Perataan Kemiringan (Slope & Yaw)**: Mesh jembatan dirotasi dalam koordinat YXZ untuk menyelaraskan dengan kelokan diagonal jalan (Yaw Y) dan kemiringan daki bukit (Pitch X) secara linear (ramp).
- **Deteksi Jatuh (Game Over)**: Jika mobil keluar dari papan jembatan, tinggi mobil akan anjlok ke dasar jurang (kedalaman 11 unit) dan memicu layar **Game Over** secara instan.

### 4. Mekanisme Gameplay & Skor
- **Koin Emas**: Terdapat 50 koin emas melayang di sepanjang lintasan 1000 unit. Koin berputar secara konstan dan memiliki **efek sorot (highlight emissive)** saat kursor mouse diarahkan ke koin.
- **Koleksi & Efek**: Mengambil koin bernilai **10 poin** dan memicu animasi koin mengecil lalu terbang ke atas.
- **Selesai (Finish Line)**: Garis finish di Z = -1000 dilengkapi gerbang spanduk bertuliskan **"SELESAI"** (tekstur digambar dinamis pada Canvas 2D). Saat melewatinya, game memicu status **Kemenangan** dan meluncurkan partikel kembang api/konfeti.

### 5. Tema Warna Dinamis (Light & Dark Mode)
- **Mode Terang (Light Mode)**: Langit biru terang, pencahayaan matahari yang hangat, jalan tanah pasir cokelat, dan rumput hijau.
- **Mode Gelap (Dark Mode)**: Langit luar angkasa gelap violet, kabut tebal mistis, rumput ungu neon, lampu jalan temaram, serta **lampu sorot depan (headlights) aktif pada mobil** yang memancarkan cahaya ke depan jalan dan menghasilkan bayangan *real-time*.

### 6. Antarmuka UI Glassmorphism & Bahasa Indonesia
- **Desain Modern**: UI dirancang melayang (overlay) di atas Canvas menggunakan CSS modern dengan efek buram latar belakang (*glassmorphic backdrop blur*).
- **Copywriting**: Seluruh teks dalam permainan (HUD Skor, Progres bar, petunjuk kontrol tombol, dan tombol modal Kemenangan/Game Over) menggunakan **Bahasa Indonesia** secara penuh.

---

## ⌨️ Kontrol Permainan

Game dikendalikan sepenuhnya menggunakan keyboard (WASD atau Tombol Arah):
- **W** atau **ArrowUp**: Maju / Akselerasi Gas
- **S** atau **ArrowDown**: Mundur / Rem
- **A** atau **ArrowLeft**: Geser Kiri (Mengikuti kelokan jalan)
- **D** or **ArrowRight**: Geser Kanan (Mengikuti kelokan jalan)
- **Mouse Hover**: Arahkan kursor ke koin 3D di layar untuk menyoroti koin.

---

## 📁 Struktur Folder Proyek

```
HillRush3D/
 ├── public/
 │    └── low-poly_truck_car_drifter.glb  # Model 3D Kendaraan
 ├── src/
 │    ├── main.js                         # Bootstrapper Loop Animasi utama
 │    ├── scene/
 │    │    └── SceneManager.js            # Renderer, Kamera Lerp, Kabut, Cahaya
 │    ├── terrain/
 │    │    └── Terrain.js                 # Rumus belokan, tinggi bukit & jembatan
 │    ├── objects/
 │    │    ├── Vehicle.js                 # Setup GLB, pergerakan & suspensi roda
 │    │    ├── Coin.js                    # Spawning koin, hover & koleksi
 │    │    └── FinishLine.js              # Gerbang Finish 3D & spanduk "SELESAI"
 │    ├── controls/
 │    │    └── InputHandler.js            # Listener Event Keyboard
 │    ├── ui/
 │    │    └── UIManager.js               # Handler HUD & Tombol Modal
 │    ├── game/
 │    │    └── GameManager.js             # Finite State Machine & Confetti
 │    └── styles/
 │         └── style.css                  # Desain tema & Glassmorphism UI
 ├── index.html                           # HTML utama & layout HUD
 ├── package.json                         # Dependensi (Three.js, Vite)
 └── vite.config.js                       # Konfigurasi Server Vite
```

---

## 🚀 Instalasi & Cara Menjalankan

### Persyaratan Sistem
Pastikan Anda sudah menginstal **Node.js** (rekomendasi versi 18 ke atas) dan **npm** di komputer Anda.

### Langkah-langkah
1. **Instal Dependensi**:
   Buka terminal di direktori proyek dan jalankan perintah:
   ```bash
   npm install
   ```

2. **Jalankan Server Pengembangan**:
   Mulai server lokal untuk bermain di browser:
   ```bash
   npm run dev
   ```
   Setelah server aktif, buka peramban dan akses alamat yang tertera (biasanya `http://localhost:3000`).

3. **Build untuk Produksi (Opsional)**:
   Untuk melakukan kompilasi file yang dioptimalkan untuk hosting produksi:
   ```bash
   npm run build
   ```
   Hasil kompilasi akan berada di folder `/dist`.

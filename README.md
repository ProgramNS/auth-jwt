# auth-jwt
Project ini saya buat untuk yang membutuhkan contoh dalam praktik implementasi authentication, middleware , dengan jwt.


# Auth & User Management Starter (Node.js + MySQL)

**Tujuan Proyek**  
API ini dibuat sebagai **open-source starter kit** untuk **pembelajaran** maupun bagi developer yang ingin memiliki pondasi sistem **Authentication & User Management** siap pakai.  
Kamu bisa mempelajarinya, menggunakannya di proyek pribadi/komersial, atau melakukan fork untuk mengembangkan lebih lanjut. Fokus utamanya tetap pada **belajar praktik nyata** membangun sistem auth yang aman, terstruktur, dan scalable.  

---

## Fitur Utama
- Register, login, logout  
- JWT **access + rotating refresh token** (aman & revoke support)  
- Role & permission sederhana (Admin, Staff, Viewer)  
- Update profil, ganti password, hapus akun (soft delete)  
- Middleware keamanan: rate-limit, CORS, Helmet  
- Audit log dasar untuk aksi penting  
- **Google OAuth** (minimal login)  

---

## Deliverables
- Struktur backend **Express (MVC)**  
- **Prisma schema** (User, Role, RefreshToken, AuditLog)  
- Dokumentasi API dengan **Swagger/OpenAPI**  
- **Dockerfile + docker-compose** (app, MySQL, Adminer)  
- Unit & integration test dasar (Jest/Supertest)  
- MIT License + CONTRIBUTING.md  

---

##  Acceptance Criteria
- Refresh token aman (httpOnly, rotation, revoke)  
- 95% endpoint terlindungi middleware auth  
- Stabil **100 RPS selama 30 detik** (uji di VPS dev)  

---

## Cocok Untuk
- Belajar implementasi auth modern di Node.js  
- Pondasi proyek internal perusahaan/UMKM  
- Bahan portofolio untuk freelance/job portal  

---

## Cara Menggunakannya
```bash
git clone https://github.com/username/auth-jwt.git
cd auth-starter
cp .env.example .env
docker compose up -d db adminer
npx prisma migrate dev --name init
npm run dev

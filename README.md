# Church Worship Connect

Frontend React/Vite untuk komunikasi realtime tim pelayanan, terhubung ke Go API dan MySQL.

## Docker deployment

Frontend dan backend memiliki `docker-compose.yml` masing-masing. Keduanya serta container MySQL harus berada pada external network yang sama:

```powershell
docker network create church-network
docker network connect church-network nama-container-mysql
```

Jalankan backend dari direktori `Sahata Worship BE`:

```powershell
Copy-Item .env.docker.example .env.docker
```

Isi `DB_HOST` dengan nama container MySQL yang sudah berjalan, lalu:

```powershell
docker compose --env-file .env.docker up -d --build
```

Jalankan frontend dari direktori `Sahata Worship`:

```powershell
Copy-Item .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

Aplikasi tersedia di `http://localhost:3000`. Nginx meneruskan `/api/v1` ke `church-backend:8080` melalui external network. Migration database dijalankan manual terhadap MySQL yang sudah tersedia.

Perintah operasional untuk masing-masing project:

```powershell
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f
docker compose --env-file .env.docker down
```

## Local development

```powershell
npm install
npm run dev
```

Gunakan `npm run build` untuk production build.

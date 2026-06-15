# MediCare — AWS Deployment Guide

Deploy MediCare on a single EC2 instance using Docker Compose (Postgres + app),
fronted by the nginx you already have running.

```
Browser ──▶ nginx (:80/:443) ──▶ medicare-app (127.0.0.1:5000) ──▶ medicare-db (Postgres)
```

The app container serves the built React SPA, the `/api` REST endpoints, and the
`/socket.io` real-time channel — all on port 5000. nginx just reverse-proxies to it.

---

## 1. Prerequisites on the instance

```bash
# Docker + compose plugin
docker --version
docker compose version
```

If Docker isn't installed (Amazon Linux 2023):

```bash
sudo dnf install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker $USER   # log out/in after this
# Compose plugin:
sudo dnf install -y docker-compose-plugin
```

Ubuntu:

```bash
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

---

## 2. Get the code

```bash
git clone https://github.com/ArnavKataria-CometChat/Medicare.git
cd Medicare
```

(If already cloned: `git pull`.)

---

## 3. Configure environment

Create a `.env` file in the project root (same folder as `docker-compose.yml`).
docker-compose reads it automatically.

```bash
cp .env.example .env
```

Edit `.env` and set real values:

```env
DB_USER=postgres
DB_PASSWORD=<a-strong-password>
DB_NAME=medicare

JWT_SECRET=<long-random-string>

# Web push (optional but recommended). Generate once:
#   docker run --rm node:20-alpine npx -y web-push generate-vapid-keys
VAPID_PUBLIC_KEY=<public-key>
VAPID_PRIVATE_KEY=<private-key>
```

Generate a JWT secret quickly:

```bash
openssl rand -hex 32
```

> Note: `DB_HOST` is forced to `db` inside docker-compose, so you don't need to set it.

---

## 4. Build and start the stack

```bash
docker compose up -d --build
```

Check it's healthy:

```bash
docker compose ps
docker compose logs -f app
```

You're looking for `Database connected successfully.` and
`MediCare backend server running on port 5000`.

The server runs `sequelize.sync({ alter: true })` on boot, so tables are created
automatically — no manual migration step needed.

Quick local check (on the instance):

```bash
curl http://localhost:5000/api/doctors
```

---

## 5. Seed demo data (optional)

Populates 100+ users, doctor profiles, articles, and appointments.

```bash
docker compose exec app npm run seed
```

Login credentials for seeded accounts are documented at the end of
`SCOPE_OF_WORK_STEP1.md`.

---

## 6. Wire up nginx

Copy the provided config into nginx.

**Debian/Ubuntu (sites-available):**

```bash
sudo cp deploy/nginx/medicare.conf /etc/nginx/sites-available/medicare.conf
sudo ln -s /etc/nginx/sites-available/medicare.conf /etc/nginx/sites-enabled/
# remove the default site if it conflicts on port 80:
sudo rm -f /etc/nginx/sites-enabled/default
```

**Amazon Linux/RHEL (conf.d):**

```bash
sudo cp deploy/nginx/medicare.conf /etc/nginx/conf.d/medicare.conf
```

Edit `server_name` in the config to your domain (or leave `_` to match any host).
Then test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Open the instance's address in a browser. The site should load and real-time
chat/notifications should connect (the socket goes through `/socket.io/`).

---

## 7. Security groups

In the EC2 Security Group, allow inbound:

- **80** (HTTP) and **443** (HTTPS) from anywhere (or your allowed CIDRs)
- **22** (SSH) from your IP only

Do **not** expose **5000** or **5432** publicly — they should stay internal to the
instance. (docker-compose currently maps both to the host; see hardening note below.)

---

## 8. HTTPS (optional, needs a domain)

```bash
sudo certbot --nginx -d your-domain.com
```

certbot edits the nginx config to add TLS and redirect HTTP→HTTPS automatically.

---

## Fronting with an AWS Application Load Balancer (ALB)

When an ALB sits in front of the instance, TLS terminates at the ALB and traffic
flows: `Browser → ALB (443) → EC2 nginx (80) → app (5000)`.

### Target group
- **Type:** Instances, **Protocol:** HTTP, **Port:** 80 (nginx).
- **Health check path:** `/api/doctors` (returns 200), or `/`.
- **Register** the EC2 instance.
- **Stickiness:** only needed if you run **more than one** instance behind the ALB.
  Socket.io's initial handshake can use HTTP long-polling, which must land on the
  same target. Enable duration-based stickiness on the target group in that case.
  For a single instance, leave it off.

### Listeners
- **HTTPS :443** with an ACM certificate → forward to the target group.
- **HTTP :80** → redirect to HTTPS (301).

### WebSockets / Socket.io
ALB supports WebSockets natively — no special listener setting required. One
gotcha: the ALB **idle timeout** defaults to 60s. Socket.io pings every ~25s so
connections normally stay alive, but bumping the ALB idle timeout to 120–300s
avoids edge-case disconnects.

### Security group
- **ALB SG:** allow inbound 80/443 from the internet (or your CIDRs).
- **Instance SG:** allow inbound **80 only from the ALB's security group** (not
  from the internet). Keep 5000/5432 closed to everything external. SSH (22) from
  your IP only.

### nginx
The provided `deploy/nginx/medicare.conf` already honors the ALB's
`X-Forwarded-Proto` header (via a `map`), so the app sees the real client protocol
(https) even though the ALB→nginx hop is plain HTTP. `server_name _` matches the
ALB/host header, so no change is needed there. After pulling the updated config,
re-run `nginx -t && systemctl reload nginx`.

## Updating to a new version

```bash
git pull
docker compose up -d --build
```

## Hardening notes

- In `docker-compose.yml`, the `db` service publishes `5432:5432` and the `app`
  publishes `5000:5000` on all interfaces. For production, bind them to localhost
  only — change to `"127.0.0.1:5000:5000"` and drop the `db` ports mapping entirely
  (the app reaches Postgres over the internal compose network). nginx still reaches
  the app on `127.0.0.1:5000`.
- Keep `.env` out of git (it already is, via `.gitignore`).

## Troubleshooting

- **502 Bad Gateway** — app isn't up on 5000. Check `docker compose logs app`.
- **Socket won't connect / chat dead** — confirm the `/socket.io/` block is present
  in the active nginx config and `nginx -t` passes.
- **DB connection errors** — verify `.env` `DB_PASSWORD` matches and the `db`
  container is healthy (`docker compose ps`).
- **Uploads fail for large files** — raise `client_max_body_size` in the nginx config.

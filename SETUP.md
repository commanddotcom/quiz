# Автоматичний деплой через GitHub Actions

## Перше встановлення

### 1. SSH ключ буде створено автоматично

Скрипт `setup-server.sh` автоматично:
- Створить окремий SSH ключ `~/.ssh/id_quiz` для цього проекту
- Налаштує SSH config для його використання
- Покаже вам публічний ключ для додавання в GitHub

**Ви побачите інструкцію під час виконання скрипта** - потрібно буде додати ключ як **Deploy Key** в репозиторії.

### 2. Запустіть скрипт першого встановлення

На вашому локальному комп'ютері:

```bash
chmod +x setup-server.sh
./setup-server.sh root@your-server-ip test.example.com
```

Замініть `root@your-server-ip` на ваші дані та `test.example.com` на ваш домен.

### 3. Налаштуйте GitHub Secrets

Перейдіть у Settings → Secrets and variables → Actions вашого репозиторію на GitHub:

**SERVER_HOST**
```
167.172.45.67
```
(ваш IP сервера)

**SERVER_USER**
```
root
```
(або інший користувач)

**SSH_PRIVATE_KEY**

На сервері виконайте:
```bash
cat ~/.ssh/id_quiz
```

Скопіюйте весь вміст (включно з `-----BEGIN OPENSSH PRIVATE KEY-----` та `-----END OPENSSH PRIVATE KEY-----`) і додайте як секрет.

**ВАЖЛИВО:** 
- Це окремий ключ тільки для цього проекту (`id_quiz`), не плутайте з `id_ed25519`.
- Цей ключ використовується для SSH підключення GitHub Actions до сервера, а не для git pull (для git використовується окремий SSH config на сервері).

### 4. Готово!

Тепер при кожному push в гілку `main` додаток буде автоматично оновлюватися на сервері.

## Як це працює

1. Ви робите зміни локально
2. Виконуєте `git push origin main`
3. GitHub Actions автоматично:
   - Підключається до сервера через SSH
   - Виконує `git pull` в `/var/www/test-app`
   - Перезапускає Docker контейнери

## Ручне оновлення (якщо потрібно)

Якщо потрібно оновити вручну:

```bash
ssh root@your-server-ip
cd /var/www/test-app
git pull origin main
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```

## Налаштування SSL (один раз)

На сервері:

```bash
cd /var/www/moblik
docker compose stop webserver
certbot certonly --standalone -d test.example.com
mkdir -p docker/nginx/ssl/test.example.com
cp /etc/letsencrypt/live/test.example.com/fullchain.pem docker/nginx/ssl/test.example.com/
cp /etc/letsencrypt/live/test.example.com/privkey.pem docker/nginx/ssl/test.example.com/
docker compose start webserver
```

## Моніторинг деплою

Перегляньте статус деплою в GitHub:
- Перейдіть у вкладку "Actions" вашого репозиторію
- Там побачите історію всіх деплоїв

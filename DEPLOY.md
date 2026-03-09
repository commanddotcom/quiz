# Деплой на DigitalOcean (для існуючого сервера з Nginx)

## Швидкий деплой

### 1. Скопіюйте файли на сервер

На вашому локальному комп'ютері:
```bash
cd /home/cmd/Projects/test
scp -r index.html app.js tests.json img docker-compose.prod.yml nginx.prod.conf nginx-site.conf Dockerfile root@your-server-ip:/var/www/
```

### 2. На сервері створіть проект

```bash
ssh root@your-server-ip

# Створіть директорію
cd /var/www
mkdir -p test-app
cd test-app

# Перемістіть файли
mv /var/www/index.html /var/www/app.js /var/www/tests.json /var/www/nginx.prod.conf /var/www/Dockerfile /var/www/docker-compose.prod.yml .
mv /var/www/img .

# Запустіть додаток (буде працювати на порті 8081)
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3. Додайте Nginx конфігурацію

```bash
# Скопіюйте конфігурацію в папку з вашим Nginx
cp /var/www/nginx-site.conf /var/www/moblik/docker/nginx/conf.d/test-app.conf

# Відредагуйте конфігурацію - замініть домен на ваш
nano /var/www/moblik/docker/nginx/conf.d/test-app.conf
# Замініть обидва "your-test-subdomain.com" на ваш реальний субдомен
```

### 4. Перезапустіть Nginx контейнер

```bash
cd /var/www/moblik
docker-compose restart webserver

# Або якщо потрібно повністю перезапустити
docker-compose down
docker-compose up -d
```

### 5. Отримайте SSL сертифікат

```bash
# Встановіть certbot якщо його немає
apt update
apt install -y certbot

# Зупиніть nginx контейнер на час отримання сертифіката
cd /var/www/moblik
docker-compose stop webserver

# Отримайте сертифікат
certbot certonly --standalone -d ваш-тест-субдомен.com

# Сертифікат буде в /etc/letsencrypt/live/ваш-тест-субдомен.com/

# Скопіюйте сертифікат в папку для nginx
mkdir -p /var/www/moblik/docker/nginx/ssl/test
cp /etc/letsencrypt/live/ваш-тест-субдомен.com/fullchain.pem /var/www/moblik/docker/nginx/ssl/test/
cp /etc/letsencrypt/live/ваш-тест-субдомен.com/privkey.pem /var/www/moblik/docker/nginx/ssl/test/

# Запустіть nginx назад
cd /var/www/moblik
docker-compose start webserver

# Перевірте чи все працює
curl https://ваш-тест-субдомен.com
```

```bash
# На локальній машині
scp tests.json root@your-server-ip:/var/www/test-app/

# На сервері
cd /var/www

---

## Оновлення додатку

Після внесення змін у файли:

### Автоматично:
```bash
./deploy.sh your-subdomain.example.com root@your-droplet-ip
```

### Вручну:
```bash
# На локальній машині
scp tests.json root@your-droplet-ip:/opt/test-app/

# На сервері
cd /opt/test-app
docker-compose -f docker-compose.prod.yml restart
```

---

## Корисні команди

### Перегляд логів
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Перезапуск
```bash
# Перегляд логів
cd /var/www/test-app
docker-compose -f docker-compose.prod.yml logs -f

# Перезапуск
docker-compose -f docker-compose.prod.yml restart

# Зупинка
docker-compose -f docker-compose.prod.yml down

# Перевірка статусу
docker-compose -f docker-compose.prod.yml ps
docker ps | grep test_app
```

---

## Перевірка з'єднання

```bash
# Перевірте чи працює додаток на порті 8081
curl http://localhost:8081

# Перевірте логи nginx
docker logs moblik_webserver

# Подивіться які порти відкриті
netstat -tulpn | grep 8081
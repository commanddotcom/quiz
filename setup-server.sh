#!/bin/bash

# Скрипт для першого встановлення на сервері
# Використання: ./setup-server.sh user@server-ip your-subdomain.com

if [ "$#" -ne 2 ]; then
    echo "Використання: ./setup-server.sh USER@SERVER SUBDOMAIN"
    echo "Приклад: ./setup-server.sh root@167.172.45.67 test.example.com"
    exit 1
fi

SERVER=$1
DOMAIN=$2

echo "🚀 Перше встановлення на $SERVER для домену $DOMAIN"

# Виконуємо команди на сервері
echo "⚙️ Налаштовуємо сервер..."
ssh $SERVER << ENDSSH
    set -e
    
    # Встановлюємо git якщо немає
    if ! command -v git &> /dev/null; then
        echo "📦 Встановлюємо git..."
        apt-get update
        apt-get install -y git
    fi
    
    # Клонуємо репозиторій
    echo "📥 Клонуємо репозиторій..."
    cd /var/www
    rm -rf test-app
    git clone git@github.com:dtrmnd/quiz.git test-app
    cd test-app
    
    # Запускаємо додаток
    echo "🐳 Запускаємо Docker контейнери..."
    docker-compose -f docker-compose.prod.yml up -d --build
    
    # Копіюємо nginx конфігурацію
    echo "🌐 Налаштовуємо Nginx..."
    sed "s/your-test-subdomain.com/$DOMAIN/g" nginx-site.conf > /var/www/moblik/docker/nginx/conf.d/test-app.conf
    
    # Перезапускаємо nginx
    cd /var/www/moblik
    docker-compose restart webserver
    
    echo ""
    echo "✅ Перше встановлення завершено!"
    echo "🌐 HTTP доступний: http://$DOMAIN"
    echo ""
    echo "📝 Наступні оновлення будуть автоматичні при push в GitHub!"
    echo ""
    echo "🔐 Для SSL виконайте на сервері:"
    echo "   cd /var/www/moblik"
    echo "   docker-compose stop webserver"
    echo "   certbot certonly --standalone -d $DOMAIN"
    echo "   mkdir -p docker/nginx/ssl/$DOMAIN"
    echo "   cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem docker/nginx/ssl/$DOMAIN/"
    echo "   cp /etc/letsencrypt/live/$DOMAIN/privkey.pem docker/nginx/ssl/$DOMAIN/"
    echo "   docker-compose start webserver"
ENDSSH

echo ""
echo "📋 Наступні кроки:"
echo "1. Налаштуйте GitHub Secrets в репозиторії:"
echo "   - SERVER_HOST: IP адреса сервера"
echo "   - SERVER_USER: користувач (наприклад, root)"
echo "   - SSH_PRIVATE_KEY: приватний SSH ключ"
echo ""
echo "2. Після цього кожен push в main буде автоматично деплоїти зміни"

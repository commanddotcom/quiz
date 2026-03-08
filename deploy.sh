#!/bin/bash

# Простий скрипт деплою на існуючий сервер
# Використання: ./deploy.sh user@server-ip your-subdomain.com

if [ "$#" -ne 2 ]; then
    echo "Використання: ./deploy.sh USER@SERVER SUBDOMAIN"
    echo "Приклад: ./deploy.sh root@167.172.45.67 test.example.com"
    exit 1
fi

SERVER=$1
DOMAIN=$2

echo "🚀 Деплой на $SERVER для домену $DOMAIN"

# Копіюємо файли
echo "📤 Копіюємо файли..."
ssh $SERVER "mkdir -p /var/www/test-app"
scp index.html app.js tests.json docker-compose.prod.yml nginx.prod.conf Dockerfile $SERVER:/var/www/test-app/
scp -r img $SERVER:/var/www/test-app/
scp nginx-site.conf $SERVER:/tmp/test-app-nginx.conf

# Налаштовуємо на сервері
echo "⚙️ Налаштовуємо сервер..."
ssh $SERVER << ENDSSH
    set -e
    
    # Запускаємо додаток
    cd /var/www/test-app
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    docker-compose -f docker-compose.prod.yml up -d --build
    
    # Налаштовуємо nginx конфігурацію
    sed "s/your-test-subdomain.com/$DOMAIN/g" /tmp/test-app-nginx.conf > /var/www/moblik/docker/nginx/conf.d/test-app.conf
    rm /tmp/test-app-nginx.conf
    
    # Перезапускаємо nginx
    cd /var/www/moblik
    docker-compose restart webserver
    
    echo ""
    echo "✅ Деплой завершено!"
    echo "🌐 HTTP доступний: http://$DOMAIN"
    echo ""
    echo "📝 Для SSL виконайте:"
    echo "   docker-compose stop webserver"
    echo "   certbot certonly --standalone -d $DOMAIN"
    echo "   mkdir -p /var/www/moblik/docker/nginx/ssl/$DOMAIN"
    echo "   cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem /var/www/moblik/docker/nginx/ssl/$DOMAIN/"
    echo "   cp /etc/letsencrypt/live/$DOMAIN/privkey.pem /var/www/moblik/docker/nginx/ssl/$DOMAIN/"
    echo "   # Потім розкоментуйте SSL секцію в /var/www/moblik/docker/nginx/conf.d/test-app.conf"
    echo "   docker-compose start webserver"
ENDSSH

echo ""
echo "✅ Готово! Перевірте: http://$DOMAIN"


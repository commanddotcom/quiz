FROM nginx:alpine

# Копіюємо файли додатку
COPY index.html /usr/share/nginx/html/
COPY app.js /usr/share/nginx/html/
COPY tests.json /usr/share/nginx/html/
COPY img /usr/share/nginx/html/img
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Відкриваємо порт 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

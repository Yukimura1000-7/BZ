# 🚀 Инструкция по деплою

## Вариант 1: Docker (рекомендуется)

### Требования
- Docker Engine 20.10+
- Docker Compose 2.0+

### Быстрый старт

```bash
# 1. Клонировать репозиторий
git clone <your-repo-url>
cd econom-strategy

# 2. Собрать и запустить
docker-compose up -d --build

# 3. Открыть в браузере
open http://localhost:3000
```

**Примечание:** Если у вас есть `package-lock.json`, Dockerfile автоматически использует `npm ci` для более быстрой и детерминированной установки зависимостей. Если его нет, используется `npm install`.

### Команды

```bash
# Просмотр статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down

# Пересборка после изменений
docker-compose up -d --build

# Полная очистка
docker-compose down -v
```

### Изменение порта

Отредактируйте `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # Замените 8080 на нужный порт
```

---

## Вариант 2: VPS (Ubuntu/Debian)

### Установка Docker

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Добавить пользователя в группу docker
sudo usermod -aG docker $USER

# Перелогиниться или выполнить
newgrp docker

# Установить Docker Compose
sudo apt install docker-compose-plugin -y
```

### Деплой

```bash
# Клонировать репозиторий
git clone <your-repo-url>
cd econom-strategy

# Запустить
docker-compose up -d --build

# Проверить статус
docker-compose ps
```

### Настройка Nginx Reverse Proxy (опционально)

Если хотите использовать домен:

```bash
# Установить Nginx
sudo apt install nginx -y

# Создать конфиг
sudo nano /etc/nginx/sites-available/econom-strategy
```

Добавить:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Активировать:
```bash
sudo ln -s /etc/nginx/sites-available/econom-strategy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### SSL сертификат (Let's Encrypt)

```bash
# Установить Certbot
sudo apt install certbot python3-certbot-nginx -y

# Получить сертификат
sudo certbot --nginx -d your-domain.com
```

---

## Вариант 3: Netlify (бесплатно) ⭐ РЕКОМЕНДУЕТСЯ

### Требования
- Аккаунт на [Netlify](https://netlify.com)
- GitHub репозиторий
- **Supabase проект** (см. [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))

### Деплой

1. **Настрой Supabase** (см. [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
2. Залить код на GitHub
3. Перейти на [app.netlify.com](https://app.netlify.com)
4. "Add new site" → "Import an existing project"
5. Выбрать GitHub репозиторий
6. Настройки:
   - Build command: `npm run build`
   - Publish directory: `dist`
7. **ВАЖНО:** Добавить Environment Variables:
   - `VITE_SUPABASE_URL` = твой Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = твой anon key
8. Нажать "Deploy site"

### Почему Netlify?
- ✅ Бесплатно
- ✅ Автоматический деплой при push в Git
- ✅ Поддержка environment variables
- ✅ CDN по всему миру
- ✅ HTTPS из коробки

---

## Вариант 4: Vercel (бесплатно)

### Требования
- Аккаунт на [Vercel](https://vercel.com)
- GitHub репозиторий
- **Supabase проект** (см. [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))

### Деплой

1. **Настрой Supabase** (см. [SUPABASE_SETUP.md](./SUPABASE_SETUP.md))
2. Залить код на GitHub
3. Перейти на [vercel.com/new](https://vercel.com/new)
4. Импортировать репозиторий
5. Vercel автоматически определит Vite проект
6. **ВАЖНО:** Добавить Environment Variables:
   - `VITE_SUPABASE_URL` = твой Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = твой anon key
7. Нажать "Deploy"

### Кастомный домен

1. Перейти в Settings → Domains
2. Добавить домен
3. Настроить DNS записи

---

## Вариант 4: Netlify (бесплатно)

### Требования
- Аккаунт на [Netlify](https://netlify.com)
- GitHub репозиторий

### Деплой

1. Залить код на GitHub
2. Перейти на [app.netlify.com](https://app.netlify.com)
3. "Add new site" → "Import an existing project"
4. Выбрать GitHub репозиторий
5. Настройки:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Нажать "Deploy site"

---

## Вариант 5: Ручной деплой на VPS

### Требования
- Node.js 18+
- Nginx

### Сборка

```bash
# На локальной машине
npm install
npm run build

# Архивировать dist
tar -czf dist.tar.gz dist/
```

### Загрузка на сервер

```bash
# Скопировать на сервер
scp dist.tar.gz user@your-server:/tmp/

# Подключиться к серверу
ssh user@your-server
```

### Настройка на сервере

```bash
# Распаковать
cd /var/www
sudo tar -xzf /tmp/dist.tar.gz
sudo chown -R www-data:www-data dist

# Настроить Nginx
sudo nano /etc/nginx/sites-available/econom-strategy
```

Добавить:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Активировать:
```bash
sudo ln -s /etc/nginx/sites-available/econom-strategy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Обновление приложения

### Docker

```bash
# Получить новые изменения
git pull

# Пересобрать и перезапустить
docker-compose up -d --build
```

### Vercel/Netlify

Автоматически при push в main ветку.

### Ручной деплой

```bash
# Повторить шаги сборки и загрузки
npm run build
scp -r dist/* user@your-server:/var/www/dist/
```

---

## Мониторинг

### Docker

```bash
# Логи в реальном времени
docker-compose logs -f

# Статистика ресурсов
docker stats econom-strategy
```

### Nginx

```bash
# Логи доступа
sudo tail -f /var/log/nginx/access.log

# Логи ошибок
sudo tail -f /var/log/nginx/error.log
```

---

## Безопасность

### Смена пароля админа

По умолчанию: `admin` / `admin`

**Важно:** Измените пароль после первого входа!

Пароль хранится в localStorage браузера. Для production рекомендуется:
1. Добавить backend с хешированием паролей
2. Использовать JWT токены
3. Настроить HTTPS

### Firewall

```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## Troubleshooting

### Порт занят

```bash
# Найти процесс
sudo lsof -i :3000

# Убить процесс
sudo kill -9 <PID>
```

### Docker не запускается

```bash
# Перезапустить Docker
sudo systemctl restart docker

# Проверить статус
docker-compose ps
```

### Nginx 502 Bad Gateway

```bash
# Проверить что контейнер запущен
docker-compose ps

# Перезапустить контейнер
docker-compose restart
```

### Белый экран

```bash
# Очистить кэш браузера
# Или открыть в режиме инкогнито

# Проверить консоль браузера (F12)
```

---

## Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs`
2. Убедитесь что все зависимости установлены
3. Проверьте версию Node.js: `node --version` (должна быть 18+)
4. Проверьте версию Docker: `docker --version`

---

## Лицензия

MIT

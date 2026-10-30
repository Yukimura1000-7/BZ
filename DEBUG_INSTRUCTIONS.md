# 🔍 Инструкция по отладке проблемы с пустым экраном игрока

## Что было исправлено

### 1. Добавлено детальное логирование
Все ключевые операции теперь логируются в консоль браузера:
- Создание сессии и подключение игрока
- Синхронизация с Supabase
- Рендеринг PlayerDashboard

### 2. Защита от перезаписи данных
- `syncFromSupabase` больше не перезаписывает `players` пустым массивом из Supabase
- Если `currentPlayerId` есть локально, но его нет в данных из Supabase — игрок добавляется из локальных данных
- `joinSession` теперь `async` и ждёт завершения `pushToSupabase`

### 3. Инициализация при загрузке
Добавлен компонент `SessionInitializer`, который:
- Проверяет состояние при загрузке страницы
- Если `currentPlayerId` есть, но `players` пустой — загружает данные из Supabase

## Как проверить работу

### Шаг 1: Откройте консоль браузера
Нажмите F12 → вкладка Console

### Шаг 2: Создайте сессию (админ)
В консоли вы увидите:
```
📤 Creating session, pushing to Supabase...
📤 Pushing session to Supabase: { id: "uuid...", code: "ABC123", ... }
✅ Session saved to Supabase: [...]
✅ Session confirmed in Supabase: { id: "uuid...", code: "ABC123" }
```

### Шаг 3: Подключитесь как игрок
В консоли вы увидите:
```
🎮 joinSession called: { sessionId: "uuid...", playerName: "Иван", ... }
✅ Creating player: { id: "uuid...", name: "Иван", ... }
✅ Player added to store. Total players: 1
📤 Pushing player to Supabase...
📤 Pushing session to Supabase: { ... }
✅ Session saved to Supabase: [...]
✅ Player pushed to Supabase
```

### Шаг 4: Перейдите на /player
В консоли вы увидите:
```
🎮 PlayerDashboard render: {
  currentPlayerId: "uuid...",
  playersCount: 1,
  playerFound: true,
  hasSession: true,
  hasSavedPlayerData: true
}
```

### Шаг 5: Обновите страницу (F5)
В консоли вы увидите:
```
🚀 SessionInitializer: checking state... {
  hasSession: true,
  currentPlayerId: "uuid...",
  playersCount: 1,
  isSupabaseConfigured: true
}
⏰ SupabaseRealtime: starting periodic sync (every 5s)
🔄 syncFromSupabase: starting sync for session uuid...
🔄 Local state: players= 1 currentPlayerId= uuid...
📥 Supabase response: players= 1 deals= 0
📝 Applying updates to store: {
  keys: ["session", "players", "deals", ...],
  playersCount: 1,
  currentPlayerId: "uuid...",
  playerIds: ["uuid..."]
}
✅ Synced from Supabase: session, players, deals, ...
🎮 PlayerDashboard render: {
  currentPlayerId: "uuid...",
  playersCount: 1,
  playerFound: true,
  hasSession: true,
  hasSavedPlayerData: true
}
```

## Возможные проблемы и решения

### Проблема 1: Игрок не найден после обновления
**Симптомы**: Пустой экран, в консоли `playerFound: false`

**Причина**: `syncFromSupabase` перезаписывает `players` данными из Supabase, где игрока ещё нет

**Решение**: Проверьте логи:
```
⚠️ Supabase returned 0 players, but local has 1 — keeping local data
```
или
```
⚠️ currentPlayerId not in Supabase data — adding from local: Иван
```

Если этих сообщений нет — значит защита не сработала. Проверьте, что `pushToSupabase` действительно сохраняет игрока:
```
✅ Player pushed to Supabase
```

### Проблема 2: Ошибка при создании сессии
**Симптомы**: Сессия не создаётся, в консоли ошибка

**Причина**: Проблема с UUID или структурой таблицы

**Решение**: Проверьте логи:
```
❌ Session upsert error: { message: "...", code: "..." }
```

Если ошибка `invalid input syntax for type uuid` — значит ID не является валидным UUID. Проверьте, что используется `uuidv4()`.

### Проблема 3: Ошибка при подключении игрока
**Симптомы**: Игрок не подключается, в консоли ошибка

**Причина**: Проблема с правами доступа (RLS) или структурой таблицы

**Решение**: Проверьте логи:
```
❌ Player upsert error: { message: "...", code: "..." }
```

Если ошибка `permission denied` — отключите RLS для таблицы `players` или настройте политики.

### Проблема 4: Периодическая синхронизация удаляет игрока
**Симптомы**: Игрок подключается, но через 5 секунд экран становится пустым

**Причина**: `syncFromSupabase` вызывается каждые 5 секунд и перезаписывает `players`

**Решение**: Проверьте логи:
```
⏰ SupabaseRealtime: starting periodic sync (every 5s)
🔄 syncFromSupabase: starting sync for session uuid...
📥 Supabase response: players= 0 deals= 0
⚠️ Supabase returned 0 players, but local has 1 — keeping local data
```

Если игрок всё равно пропадает — значит защита не сработала. Проверьте, что `currentPlayerId` сохраняется в localStorage.

## Структура таблиц Supabase

Убедитесь, что таблицы имеют правильную структуру:

### sessions
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  code VARCHAR(6) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  phase INTEGER NOT NULL DEFAULT 0,
  timer INTEGER NOT NULL DEFAULT 600,
  phase_duration INTEGER NOT NULL DEFAULT 600,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### players
```sql
CREATE TABLE players (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL,
  balance INTEGER NOT NULL DEFAULT 1000,
  usefulness_points INTEGER NOT NULL DEFAULT 0,
  goods JSONB NOT NULL DEFAULT '{}',
  deals_count INTEGER NOT NULL DEFAULT 0,
  salary INTEGER NOT NULL DEFAULT 200,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### deals
```sql
CREATE TABLE deals (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES players(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES players(id) ON DELETE CASCADE,
  goods VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  seller_confirmed BOOLEAN NOT NULL DEFAULT false,
  buyer_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### events
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### currency_rates
```sql
CREATE TABLE currency_rates (
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  currency VARCHAR(50) NOT NULL,
  rate DECIMAL(20, 2) NOT NULL,
  change DECIMAL(20, 2) NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, currency)
);
```

## Отключение RLS (для тестирования)

Если используете RLS, отключите его для тестирования:
```sql
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE deals DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE currency_rates DISABLE ROW LEVEL SECURITY;
```

## Полезные команды для проверки

### Проверить сессии в Supabase
```sql
SELECT id, code, name, status FROM sessions ORDER BY created_at DESC LIMIT 10;
```

### Проверить игроков в сессии
```sql
SELECT id, name, role, balance FROM players WHERE session_id = 'uuid-сессии';
```

### Очистить старые сессии
```sql
DELETE FROM sessions WHERE created_at < NOW() - INTERVAL '1 day';
```

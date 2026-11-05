-- Актуальная версия приложения использует только таблицы sessions и players.
-- Остальные таблицы ниже оставлены для совместимости со старой версией игры
-- и приложением не используются.
--
-- Очки полезности: если колонка players.usefulness_points отсутствует,
-- приложение автоматически хранит их в players.goods.__usefulness_points.
-- Для выделенной колонки выполните migration-add-usefulness-points.sql.

-- Создание таблицы сессий
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(6) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  phase INTEGER NOT NULL DEFAULT 0,
  timer INTEGER NOT NULL DEFAULT 600,
  phase_duration INTEGER NOT NULL DEFAULT 600,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_login VARCHAR(255) NOT NULL DEFAULT 'admin',
  admin_password VARCHAR(255) NOT NULL DEFAULT 'admin'
);

-- Создание таблицы игроков
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('buyer', 'seller')),
  balance INTEGER NOT NULL DEFAULT 1000,
  usefulness_points INTEGER NOT NULL DEFAULT 0,
  goods JSONB NOT NULL DEFAULT '{"Нефть": 0, "Зерно": 5, "Металл": 0, "Техника": 0, "Лекарства": 0}',
  deals_count INTEGER NOT NULL DEFAULT 0,
  salary INTEGER NOT NULL DEFAULT 200,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы сделок
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  goods VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  seller_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  buyer_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы событий
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('currency', 'market', 'random')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы курсов валют
CREATE TABLE currency_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  currency VARCHAR(10) NOT NULL,
  rate DECIMAL(15, 2) NOT NULL,
  change DECIMAL(10, 4) NOT NULL DEFAULT 0,
  UNIQUE(session_id, currency)
);

-- Создание индексов для производительности
CREATE INDEX idx_players_session_id ON players(session_id);
CREATE INDEX idx_deals_session_id ON deals(session_id);
CREATE INDEX idx_events_session_id ON events(session_id);
CREATE INDEX idx_currency_rates_session_id ON currency_rates(session_id);
CREATE INDEX idx_sessions_code ON sessions(code);

-- Включение Realtime для всех таблиц
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE players;
ALTER PUBLICATION supabase_realtime ADD TABLE deals;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE currency_rates;

-- Функция для генерации уникального кода сессии
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.code := upper(substr(md5(random()::text), 1, 6));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматической генерации кода
CREATE TRIGGER set_session_code
  BEFORE INSERT ON sessions
  FOR EACH ROW
  WHEN (NEW.code IS NULL)
  EXECUTE FUNCTION generate_session_code();

-- Функция для автоматического назначения роли (60% покупатели, 40% продавцы)
CREATE OR REPLACE FUNCTION assign_player_role()
RETURNS TRIGGER AS $$
DECLARE
  buyer_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM players WHERE session_id = NEW.session_id;
  SELECT COUNT(*) INTO buyer_count FROM players WHERE session_id = NEW.session_id AND role = 'buyer';
  
  -- Если еще нет 60% покупателей, назначаем покупателя
  IF total_count = 0 OR (buyer_count::float / (total_count + 1)) < 0.6 THEN
    NEW.role := 'buyer';
  ELSE
    NEW.role := 'seller';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автоматического назначения роли
CREATE TRIGGER set_player_role
  BEFORE INSERT ON players
  FOR EACH ROW
  WHEN (NEW.role IS NULL)
  EXECUTE FUNCTION assign_player_role();

-- RLS (Row Level Security) политики
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE currency_rates ENABLE ROW LEVEL SECURITY;

-- Разрешаем всем читать и писать (для простоты, в production лучше ограничить)
CREATE POLICY "Enable all operations for sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for players" ON players FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for deals" ON deals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for events" ON events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all operations for currency_rates" ON currency_rates FOR ALL USING (true) WITH CHECK (true);

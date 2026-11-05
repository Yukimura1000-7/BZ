-- Миграция (необязательная): отдельная колонка usefulness_points для очков.
-- Выполните этот SQL в Supabase SQL Editor.
--
-- Приложение умеет работать и без этой миграции: если колонки нет, очки
-- хранятся в players.goods.__usefulness_points и автоматически переносятся
-- сюда после применения миграции.

ALTER TABLE players
ADD COLUMN IF NOT EXISTS usefulness_points INTEGER NOT NULL DEFAULT 0;

-- Переносим очки, начисленные в резервном режиме (goods).
UPDATE players
SET usefulness_points = GREATEST(
  usefulness_points,
  COALESCE((goods ->> '__usefulness_points')::INTEGER, 0)
)
WHERE goods ? '__usefulness_points';

-- Индекс для быстрой сортировки по очкам полезности
CREATE INDEX IF NOT EXISTS idx_players_usefulness_points
ON players(session_id, usefulness_points DESC);

COMMENT ON COLUMN players.usefulness_points IS
'Очки полезности покупателей. Начисляются персоналом на странице /points.';

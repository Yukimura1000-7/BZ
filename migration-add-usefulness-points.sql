-- Миграция: добавление поля usefulness_points для покупателей
-- Выполните этот SQL в Supabase SQL Editor

-- Добавляем колонку usefulness_points
ALTER TABLE players 
ADD COLUMN IF NOT EXISTS usefulness_points INTEGER NOT NULL DEFAULT 0;

-- Создаем индекс для быстрой сортировки по очкам полезности
CREATE INDEX IF NOT EXISTS idx_players_usefulness_points 
ON players(session_id, usefulness_points DESC);

-- Комментарий для документации
COMMENT ON COLUMN players.usefulness_points IS 'Очки полезности для покупателей. Начисляются при совершении сделок.';

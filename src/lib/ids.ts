/**
 * Участники получают обычный UUID, но для ручного ввода на служебных
 * страницах показываем короткий код — первые 8 символов UUID.
 * Оператор может ввести как короткий код, так и полный ID.
 */

export function shortPlayerId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

export function normalizeIdInput(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function playerIdMatches(playerId: string, input: string): boolean {
  const query = normalizeIdInput(input);
  if (!query) return false;

  const normalizedId = playerId.replace(/-/g, '').toUpperCase();
  if (normalizedId === query) return true;

  // Короткий код ищем только начиная с 4 символов, чтобы не было
  // случайных совпадений при вводе одного-двух символов.
  return query.length >= 4 && normalizedId.startsWith(query);
}

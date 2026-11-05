import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

export type PlayerRole = 'buyer' | 'seller';
export type SessionStatus = 'waiting' | 'active' | 'paused' | 'ended';
export type CreditKind = 'money' | 'points';

export interface Player {
  id: string;
  name: string;
  sessionId: string;
  role: PlayerRole;
  balance: number;
  usefulnessPoints: number;
  createdAt: number;
}

export interface Session {
  id: string;
  code: string;
  name: string;
  status: SessionStatus;
  /** PIN для входа на служебные страницы (деньги / очки) */
  staffPin: string;
  createdAt: number;
}

export interface CreditResult {
  ok: boolean;
  error?: string;
  player?: Player;
  /** Новое значение баланса или очков */
  value?: number;
}

interface GameState {
  session: Session | null;
  players: Player[];
  currentPlayerId: string | null;
  savedPlayerData: Player | null;

  /** Сессия, в которую персонал вошёл по PIN. Хранится отдельно от игрока. */
  staffSessionId: string | null;

  syncError: string | null;
  lastSyncAt: number | null;
  /**
   * Есть ли в таблице players колонка usefulness_points.
   * null — ещё не проверяли. Если колонки нет, очки храним в goods.__usefulness_points.
   */
  pointsColumnAvailable: boolean | null;

  // Сессия
  createSession: (name?: string) => Promise<Session>;
  loadSessionByCode: (code: string) => Promise<Session | null>;
  authenticateStaff: (code: string, pin: string) => Promise<{ ok: boolean; error?: string }>;
  logoutStaff: () => void;
  endSession: () => Promise<boolean>;
  resetSession: () => void;

  // Игрок
  joinSession: (sessionId: string, playerName: string) => Promise<Player | null>;
  leaveSession: () => void;
  restoreSession: () => boolean;
  setCurrentPlayer: (id: string | null) => void;

  // Начисления
  creditPlayer: (playerId: string, amount: number, kind: CreditKind) => Promise<CreditResult>;

  // Синхронизация
  syncFromSupabase: () => Promise<void>;
}

const STORAGE_KEY = 'econom-strategy-storage';
const DEFAULT_STAFF_PIN = 'admin';
const MAX_CREDIT = 1_000_000;

const generateId = () => uuidv4();
const generateSessionCode = () =>
  Math.random().toString(36).slice(2, 8).padEnd(6, '0').toUpperCase();

const STATUSES: SessionStatus[] = ['waiting', 'active', 'paused', 'ended'];

const normalizeStatus = (value: unknown): SessionStatus =>
  STATUSES.includes(value as SessionStatus) ? (value as SessionStatus) : 'active';

const normalizeSession = (raw: any): Session | null => {
  if (!raw || typeof raw !== 'object' || !raw.id || !raw.code) return null;
  return {
    id: String(raw.id),
    code: String(raw.code).toUpperCase(),
    name: String(raw.name || 'Игровая сессия'),
    status: normalizeStatus(raw.status),
    staffPin: raw.staffPin || raw.admin_password || DEFAULT_STAFF_PIN,
    createdAt: Number(raw.createdAt) || Date.now(),
  };
};

const normalizePlayer = (raw: any): Player | null => {
  if (!raw || typeof raw !== 'object' || !raw.id || !raw.sessionId) return null;
  return {
    id: String(raw.id),
    name: String(raw.name || 'Участник'),
    sessionId: String(raw.sessionId),
    role: raw.role === 'seller' ? 'seller' : 'buyer',
    balance: Number(raw.balance) || 0,
    usefulnessPoints: Number(raw.usefulnessPoints ?? raw.usefulness_points) || 0,
    createdAt: Number(raw.createdAt) || Date.now(),
  };
};

const mapSessionRow = (row: any): Session => ({
  id: row.id,
  code: String(row.code).toUpperCase(),
  name: row.name || 'Игровая сессия',
  status: normalizeStatus(row.status),
  staffPin: row.admin_password || DEFAULT_STAFF_PIN,
  createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
});

const mapPlayerRow = (row: any): Player => {
  const goods =
    row.goods && typeof row.goods === 'object' ? (row.goods as Record<string, unknown>) : {};
  const goodsPoints = Number(goods.__usefulness_points) || 0;
  const columnPoints = Number(row.usefulness_points) || 0;

  return {
    id: row.id,
    name: row.name || 'Участник',
    sessionId: row.session_id,
    role: row.role === 'seller' ? 'seller' : 'buyer',
    balance: Number(row.balance) || 0,
    // Если колонки usefulness_points ещё нет, очки лежат в goods.
    usefulnessPoints: Math.max(columnPoints, goodsPoints),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
};

const chooseRole = (players: Player[]): PlayerRole => {
  const buyers = players.filter((p) => p.role === 'buyer').length;
  const total = players.length;
  // 60% покупателей / 40% продавцов
  return total === 0 || buyers / (total + 1) < 0.6 ? 'buyer' : 'seller';
};

const readLocalState = (): any => {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw)?.state ?? null;
  } catch {
    return null;
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Проверяет, есть ли в таблице players колонка usefulness_points.
 * На старых установках её может не быть — тогда очки храним в JSONB goods,
 * чтобы приложение работало без ручной миграции. После добавления колонки
 * приложение автоматически переключится на неё.
 */
const detectPointsColumn = async (
  client: any,
  set: (partial: any) => void,
  get: () => GameState
): Promise<boolean | null> => {
  const cached = get().pointsColumnAvailable;
  if (cached !== null) return cached;

  const { error } = await client.from('players').select('usefulness_points').limit(1);

  if (!error) {
    set({ pointsColumnAvailable: true });
    return true;
  }
  if (error.code === '42703') {
    set({ pointsColumnAvailable: false });
    return false;
  }

  console.warn('Could not detect players.usefulness_points:', error);
  return null;
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      session: null,
      players: [],
      currentPlayerId: null,
      savedPlayerData: null,
      staffSessionId: null,
      syncError: null,
      lastSyncAt: null,
      pointsColumnAvailable: null,

      createSession: async (name?: string) => {
        let staffPin = String(Math.floor(1000 + Math.random() * 9000));
        const session: Session = {
          id: generateId(),
          code: generateSessionCode(),
          name: name?.trim() || 'Игровая сессия',
          status: 'active',
          staffPin,
          createdAt: Date.now(),
        };

        let remoteOk = !isSupabaseConfigured;
        let syncError: string | null = null;

        if (isSupabaseConfigured) {
          const client = getSupabase();
          if (!client) {
            syncError = 'Нет подключения к серверу — сессия создана только на этом устройстве.';
          } else {
            for (let attempt = 0; attempt < 3 && !remoteOk; attempt += 1) {
              const { error } = await client.from('sessions').insert({
                id: session.id,
                code: session.code,
                name: session.name,
                status: session.status,
                admin_login: 'staff',
                admin_password: staffPin,
              });

              if (!error) {
                remoteOk = true;
                break;
              }

              // Коллизия кода — генерируем новый и пробуем снова.
              if (error.code === '23505') {
                session.code = generateSessionCode();
                continue;
              }

              // На старых установках может не быть admin_login/admin_password.
              if (error.code === '42703') {
                staffPin = DEFAULT_STAFF_PIN;
                session.staffPin = staffPin;
                const { error: retryError } = await client.from('sessions').insert({
                  id: session.id,
                  code: session.code,
                  name: session.name,
                  status: session.status,
                });
                if (!retryError) {
                  remoteOk = true;
                } else {
                  console.error('Session insert retry error:', retryError);
                  syncError = 'Не удалось сохранить сессию на сервере.';
                }
                break;
              }

              console.error('Session insert error:', error);
              syncError = 'Не удалось сохранить сессию на сервере.';
              break;
            }
          }
        }

        set({
          session,
          players: [],
          currentPlayerId: null,
          savedPlayerData: null,
          staffSessionId: session.id,
          syncError,
          lastSyncAt: Date.now(),
        });

        return session;
      },

      loadSessionByCode: async (code: string) => {
        const upperCode = code.trim().toUpperCase();
        if (!upperCode) return null;

        let remoteError: string | null = null;

        if (isSupabaseConfigured) {
          const client = getSupabase();
          if (client) {
            await detectPointsColumn(client, set, get);

            const { data, error } = await client
              .from('sessions')
              .select('*')
              .eq('code', upperCode)
              .maybeSingle();

            if (error) {
              console.error('Session query error:', error);
              remoteError = 'Не удалось связаться с сервером.';
            }

            if (data) {
              const session = mapSessionRow(data);
              const { data: playersData, error: playersError } = await client
                .from('players')
                .select('*')
                .eq('session_id', session.id);

              if (playersError) console.error('Players query error:', playersError);

              set({
                session,
                players: playersData ? playersData.map(mapPlayerRow) : [],
                syncError: playersError ? 'Не удалось загрузить участников.' : null,
                lastSyncAt: Date.now(),
              });
              return session;
            }
          }
        }

        // Локальный режим / сессия, созданная на этом устройстве без сети.
        const local = readLocalState();
        const localSession = normalizeSession(local?.session);
        if (localSession && localSession.code === upperCode) {
          const localPlayers = Array.isArray(local?.players)
            ? (local.players.map(normalizePlayer).filter(Boolean) as Player[])
            : [];

          set({
            session: localSession,
            players: localPlayers,
            syncError: remoteError,
            lastSyncAt: Date.now(),
          });
          return localSession;
        }

        set({ syncError: remoteError });
        return null;
      },

      authenticateStaff: async (code: string, pin: string) => {
        const session = await get().loadSessionByCode(code);
        if (!session) {
          return { ok: false, error: 'Сессия не найдена. Проверьте код.' };
        }
        if (session.status === 'ended') {
          return { ok: false, error: 'Эта сессия уже завершена.' };
        }

        const expected = session.staffPin || DEFAULT_STAFF_PIN;
        if (pin.trim() !== expected) {
          return { ok: false, error: 'Неверный PIN для персонала.' };
        }

        set({ staffSessionId: session.id });
        return { ok: true };
      },

      logoutStaff: () => set({ staffSessionId: null }),

      endSession: async () => {
        const { session } = get();
        if (!session) return false;

        if (isSupabaseConfigured) {
          const client = getSupabase();
          if (!client) {
            set({ syncError: 'Нет подключения к серверу — не удалось завершить сессию.' });
            return false;
          }

          const { error } = await client
            .from('sessions')
            .update({ status: 'ended' })
            .eq('id', session.id);

          if (error) {
            console.error('End session error:', error);
            set({ syncError: 'Не удалось завершить сессию на сервере.' });
            return false;
          }
        }

        set({
          session: { ...session, status: 'ended' },
          syncError: null,
          lastSyncAt: Date.now(),
        });
        return true;
      },

      resetSession: () =>
        set({
          session: null,
          players: [],
          currentPlayerId: null,
          savedPlayerData: null,
          staffSessionId: null,
          syncError: null,
          lastSyncAt: null,
          pointsColumnAvailable: null,
        }),

      joinSession: async (sessionId: string, playerName: string) => {
        const state = get();
        if (!state.session || state.session.id !== sessionId) return null;
        if (state.session.status === 'ended') return null;

        const name = playerName.trim().slice(0, 40);
        if (!name) return null;

        const role = chooseRole(state.players);

        const player: Player = {
          id: generateId(),
          name,
          sessionId,
          role,
          // Покупателям деньги в этой версии не нужны: balance = 0.
          balance: role === 'seller' ? 1000 : 0,
          usefulnessPoints: 0,
          createdAt: Date.now(),
        };

        if (isSupabaseConfigured) {
          const client = getSupabase();
          if (!client) {
            set({ syncError: 'Нет подключения к серверу.' });
            return null;
          }

          const pointsMode = await detectPointsColumn(client, set, get);
          const basePayload: Record<string, unknown> = {
            id: player.id,
            session_id: player.sessionId,
            name: player.name,
            role: player.role,
            balance: player.balance,
            // Резервное хранилище очков, если колонки usefulness_points нет.
            goods: { __usefulness_points: 0 },
          };
          const payload =
            pointsMode === false
              ? basePayload
              : { ...basePayload, usefulness_points: player.usefulnessPoints };

          let { error } = await client.from('players').insert(payload);

          // Старая база без колонки usefulness_points — повторяем без неё.
          if (error && error.code === '42703' && pointsMode !== false) {
            set({ pointsColumnAvailable: false });
            const retry = await client.from('players').insert(basePayload);
            error = retry.error;
          } else if (!error && pointsMode === null) {
            set({ pointsColumnAvailable: true });
          }

          if (error) {
            console.error('Player insert error:', error);
            set({ syncError: 'Не удалось сохранить участника на сервере.' });
            return null;
          }
        }

        set((current) => ({
          players: [...current.players.filter((p) => p.id !== player.id), player],
          currentPlayerId: player.id,
          savedPlayerData: player,
          syncError: null,
          lastSyncAt: Date.now(),
        }));

        // Подтягиваем актуальный список (на случай, если за это время
        // подключились другие игроки). Не блокируем вход.
        if (isSupabaseConfigured) void get().syncFromSupabase();

        return player;
      },

      leaveSession: () => set({ currentPlayerId: null }),

      restoreSession: () => {
        const { savedPlayerData, session } = get();
        if (!savedPlayerData || !session) return false;
        if (session.status === 'ended') return false;
        set({ currentPlayerId: savedPlayerData.id });
        return true;
      },

      setCurrentPlayer: (id: string | null) => {
        const { players } = get();
        set({
          currentPlayerId: id || null,
          savedPlayerData: id
            ? players.find((p) => p.id === id) || null
            : get().savedPlayerData,
        });
      },

      creditPlayer: async (playerId: string, amount: number, kind: CreditKind) => {
        const state = get();
        const session = state.session;

        if (!session) return { ok: false, error: 'Сессия не выбрана.' };
        if (session.status === 'ended') return { ok: false, error: 'Сессия завершена.' };

        const player = state.players.find((p) => p.id === playerId);
        if (!player) return { ok: false, error: 'Участник не найден.' };

        const expectedRole: PlayerRole = kind === 'money' ? 'seller' : 'buyer';
        if (player.role !== expectedRole) {
          return {
            ok: false,
            error:
              kind === 'money'
                ? 'Деньги начисляются только продавцам.'
                : 'Очки полезности начисляются только покупателям.',
          };
        }

        const value = Math.floor(Number(amount));
        if (!Number.isFinite(value) || value <= 0) {
          return { ok: false, error: 'Введите сумму больше нуля.' };
        }
        if (value > MAX_CREDIT) {
          return { ok: false, error: 'Слишком большая сумма.' };
        }

        const applyLocally = (updated: Player, newValue: number): CreditResult => {
          set((current) => ({
            players: current.players.map((p) => (p.id === updated.id ? updated : p)),
            savedPlayerData:
              current.savedPlayerData?.id === updated.id ? updated : current.savedPlayerData,
            syncError: null,
            lastSyncAt: Date.now(),
          }));
          return { ok: true, player: updated, value: newValue };
        };

        // Локальный режим — без сервера.
        if (!isSupabaseConfigured) {
          const updated: Player =
            kind === 'money'
              ? { ...player, balance: player.balance + value }
              : { ...player, usefulnessPoints: player.usefulnessPoints + value };
          return applyLocally(
            updated,
            kind === 'money' ? updated.balance : updated.usefulnessPoints
          );
        }

        const client = getSupabase();
        if (!client) return { ok: false, error: 'Нет подключения к серверу.' };

        let pointsMode = state.pointsColumnAvailable;
        if (kind === 'points' && pointsMode === null) {
          pointsMode = await detectPointsColumn(client, set, get);
        }

        // Начисление с оптимистической блокировкой: обновляем строку только
        // если значение не изменилось с момента чтения. Это защищает от
        // потери начислений, когда над одним игроком работают с разных устройств.
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const { data: fresh, error: readError } = await client
            .from('players')
            .select('*')
            .eq('id', playerId)
            .eq('session_id', session.id)
            .maybeSingle();

          if (readError) {
            console.error('Credit read error:', readError);
            return { ok: false, error: 'Не удалось прочитать данные участника.' };
          }
          if (!fresh) {
            return { ok: false, error: 'Участник не найден в этой сессии.' };
          }
          if (fresh.role !== expectedRole) {
            return {
              ok: false,
              error:
                kind === 'money'
                  ? 'Деньги начисляются только продавцам.'
                  : 'Очки полезности начисляются только покупателям.',
            };
          }

          const freshGoods =
            fresh.goods && typeof fresh.goods === 'object'
              ? (fresh.goods as Record<string, unknown>)
              : {};
          const goodsPoints = Number(freshGoods.__usefulness_points) || 0;
          const columnPoints = Number(fresh.usefulness_points) || 0;

          if (kind === 'money') {
            const currentValue = Number(fresh.balance) || 0;
            const nextValue = currentValue + value;

            const { data: updatedRow, error: updateError } = await client
              .from('players')
              .update({ balance: nextValue })
              .eq('id', playerId)
              .eq('balance', currentValue)
              .select('id')
              .maybeSingle();

            if (updateError) {
              console.error('Credit update error:', updateError);
              return { ok: false, error: 'Не удалось сохранить начисление.' };
            }

            if (updatedRow) {
              return applyLocally({ ...player, balance: nextValue }, nextValue);
            }

            await sleep(60 * (attempt + 1));
            continue;
          }

          if (pointsMode === false) {
            // Резервный режим: колонки usefulness_points нет, пишем в goods.
            const currentValue = goodsPoints;
            const nextValue = currentValue + value;
            const nextGoods = { ...freshGoods, __usefulness_points: nextValue };

            const { data: updatedRow, error: updateError } = await client
              .from('players')
              .update({ goods: nextGoods })
              .eq('id', playerId)
              .filter('goods', 'eq', JSON.stringify(freshGoods))
              .select('id')
              .maybeSingle();

            if (updateError) {
              console.error('Credit update error (goods fallback):', updateError);
              return { ok: false, error: 'Не удалось сохранить начисление.' };
            }

            if (updatedRow) {
              return applyLocally({ ...player, usefulnessPoints: nextValue }, nextValue);
            }

            await sleep(60 * (attempt + 1));
            continue;
          }

          // Основной режим: отдельная колонка usefulness_points.
          // goods тоже обновляем, чтобы резервное значение не отставало.
          const currentValue = Math.max(columnPoints, goodsPoints);
          const nextValue = currentValue + value;
          const nextGoods = { ...freshGoods, __usefulness_points: nextValue };

          const { data: updatedRow, error: updateError } = await client
            .from('players')
            .update({ usefulness_points: nextValue, goods: nextGoods })
            .eq('id', playerId)
            .eq('usefulness_points', columnPoints)
            .select('id')
            .maybeSingle();

          if (updateError) {
            if (updateError.code === '42703') {
              set({ pointsColumnAvailable: false });
              pointsMode = false;
              continue;
            }
            console.error('Credit update error:', updateError);
            return { ok: false, error: 'Не удалось сохранить начисление.' };
          }

          if (updatedRow) {
            return applyLocally({ ...player, usefulnessPoints: nextValue }, nextValue);
          }

          // Кто-то успел изменить значение — читаем заново.
          await sleep(60 * (attempt + 1));
        }

        return {
          ok: false,
          error: 'Данные участника только что изменились на другом устройстве. Повторите попытку.',
        };
      },

      syncFromSupabase: async () => {
        if (!isSupabaseConfigured) return;
        const state = get();
        if (!state.session) return;

        const client = getSupabase();
        if (!client) return;

        if (get().pointsColumnAvailable === null) {
          await detectPointsColumn(client, set, get);
        }

        try {
          const [sessionRes, playersRes] = await Promise.all([
            client.from('sessions').select('*').eq('id', state.session.id).maybeSingle(),
            client.from('players').select('*').eq('session_id', state.session.id),
          ]);

          const updates: Partial<GameState> = { lastSyncAt: Date.now() };

          if (sessionRes.data) {
            updates.session = mapSessionRow(sessionRes.data);
          }
          if (!playersRes.error && playersRes.data) {
            updates.players = playersRes.data.map(mapPlayerRow);
          }

          if (sessionRes.error || playersRes.error) {
            console.error('Sync error:', sessionRes.error || playersRes.error);
            updates.syncError = 'Не удалось синхронизировать данные.';
          } else {
            updates.syncError = null;
          }

          set(updates);
        } catch (error) {
          console.error('Sync from Supabase error:', error);
          set({ syncError: 'Не удалось синхронизировать данные.' });
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.session,
        players: state.players,
        currentPlayerId: state.currentPlayerId,
        savedPlayerData: state.savedPlayerData,
        staffSessionId: state.staffSessionId,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState || {}) as any;
        const players = Array.isArray(persisted.players)
          ? (persisted.players.map(normalizePlayer).filter(Boolean) as Player[])
          : [];

        return {
          ...currentState,
          session: normalizeSession(persisted.session),
          players,
          currentPlayerId: persisted.currentPlayerId ?? null,
          savedPlayerData: normalizePlayer(persisted.savedPlayerData),
          staffSessionId: persisted.staffSessionId ?? null,
        };
      },
    }
  )
);

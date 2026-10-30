import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';

export type PlayerRole = 'buyer' | 'seller';

export interface Player {
  id: string;
  name: string;
  sessionId: string;
  role: PlayerRole;
  balance: number;
  usefulnessPoints: number; // Очки полезности для покупателей
  goods: Record<string, number>;
  qrCode: string;
  dealsCount: number;
  salary: number;
  registered: boolean;
}

export interface Deal {
  id: string;
  sellerId: string;
  buyerId: string;
  goods: string;
  quantity: number;
  amount: number;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'rejected';
  sellerConfirmed: boolean;
  buyerConfirmed: boolean;
}

export interface GameEvent {
  id: string;
  title: string;
  description: string;
  timestamp: number;
  type: 'currency' | 'market' | 'random';
}

export interface CurrencyRate {
  currency: string;
  rate: number;
  change: number;
}

export type SessionStatus = 'waiting' | 'active' | 'paused' | 'ended';

export interface Session {
  id: string;
  code: string;
  name: string;
  status: SessionStatus;
  phase: number;
  timer: number;
  phaseDuration: number;
  createdAt: number;
}

interface GameState {
  // Session
  session: Session | null;
  
  // Players
  players: Player[];
  currentPlayerId: string | null;
  savedPlayerData: Player | null;
  
  // Deals
  deals: Deal[];
  pendingDeal: Deal | null;
  
  // Game
  timerRunning: boolean;
  
  // Events
  events: GameEvent[];
  currencyRates: CurrencyRate[];
  
  // Admin
  isAdmin: boolean;
  isAuthenticated: boolean;
  adminLogin: string;
  adminPassword: string;
  
  // Supabase
  isSupabaseConnected: boolean;
  
  // Session actions
  createSession: (name?: string) => Promise<Session>;
  loadSessionByCode: (code: string) => Promise<Session | null>;
  joinSession: (sessionId: string, playerName: string) => Player | null;
  leaveSession: () => void;
  endSession: () => void;
  restoreSession: () => boolean;
  
  // Player actions
  setCurrentPlayer: (id: string) => void;
  
  // Deal actions
  createDeal: (sellerId: string, buyerId: string, goods: string, quantity: number, amount: number) => void;
  confirmDeal: (dealId: string, playerId: string) => void;
  rejectDeal: (dealId: string) => void;
  
  // Phase actions
  startPhase: (duration: number) => void;
  pausePhase: () => void;
  resumePhase: () => void;
  endPhase: () => void;
  tickTimer: () => void;
  
  // Event actions
  addEvent: (event: Omit<GameEvent, 'id' | 'timestamp'>) => void;
  updateCurrencyRate: (currency: string, rate: number) => void;
  
  // Admin actions
  setAdmin: (isAdmin: boolean) => void;
  login: (login: string, password: string) => boolean;
  logout: () => void;
  setAdminCredentials: (login: string, password: string) => void;
  
  // Bank
  paySalary: () => void;
  deposit: (playerId: string, amount: number) => void;
  withdraw: (playerId: string, amount: number) => void;
  
  // Sync
  syncFromSupabase: () => Promise<void>;
  pushToSupabase: () => Promise<void>;
}

const generateId = () => uuidv4();
const generateSessionCode = () => Math.random().toString(36).substr(2, 6).toUpperCase();

const initialCurrencyRates: CurrencyRate[] = [
  { currency: 'USD', rate: 90.5, change: 0 },
  { currency: 'EUR', rate: 98.2, change: 0 },
  { currency: 'BTC', rate: 65000, change: 0 },
  { currency: 'Золото', rate: 5800, change: 0 },
];

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      session: null,
      players: [],
      currentPlayerId: null,
      savedPlayerData: null,
      deals: [],
      pendingDeal: null,
      timerRunning: false,
      events: [],
      currencyRates: initialCurrencyRates,
      isAdmin: false,
      isAuthenticated: false,
      adminLogin: 'admin',
      adminPassword: 'admin',
      isSupabaseConnected: isSupabaseConfigured,

      // Синхронизация ИЗ Supabase (загрузка данных)
      syncFromSupabase: async () => {
        if (!isSupabaseConfigured) return;
        const client = getSupabase();
        if (!client) return;
        const state = get();
        if (!state.session) return;

        try {
          const [sessionRes, playersRes, dealsRes, eventsRes, ratesRes] = await Promise.all([
            client.from('sessions').select('*').eq('id', state.session.id).single(),
            client.from('players').select('*').eq('session_id', state.session.id),
            client.from('deals').select('*').eq('session_id', state.session.id),
            client.from('events').select('*').eq('session_id', state.session.id).order('created_at', { ascending: false }),
            client.from('currency_rates').select('*').eq('session_id', state.session.id),
          ]);

          const updates: any = {};

          if (sessionRes.data) {
            updates.session = {
              id: sessionRes.data.id,
              code: sessionRes.data.code,
              name: sessionRes.data.name,
              status: sessionRes.data.status,
              phase: sessionRes.data.phase,
              timer: sessionRes.data.timer,
              phaseDuration: sessionRes.data.phase_duration,
              createdAt: new Date(sessionRes.data.created_at).getTime(),
            };
          }

          if (playersRes.data) {
            updates.players = playersRes.data.map((db: any) => ({
              id: db.id,
              name: db.name,
              sessionId: db.session_id,
              role: db.role,
              balance: db.balance,
              goods: db.goods,
              qrCode: db.id,
              dealsCount: db.deals_count,
              salary: db.salary,
              registered: true,
            }));
          }

          if (dealsRes.data) {
            updates.deals = dealsRes.data.map((db: any) => ({
              id: db.id,
              sellerId: db.seller_id,
              buyerId: db.buyer_id,
              goods: db.goods,
              quantity: db.quantity,
              amount: db.amount,
              timestamp: new Date(db.created_at).getTime(),
              status: db.status,
              sellerConfirmed: db.seller_confirmed,
              buyerConfirmed: db.buyer_confirmed,
            }));
          }

          if (eventsRes.data) {
            updates.events = eventsRes.data.map((db: any) => ({
              id: db.id,
              title: db.title,
              description: db.description,
              timestamp: new Date(db.created_at).getTime(),
              type: db.type,
            }));
          }

          if (ratesRes.data && ratesRes.data.length > 0) {
            updates.currencyRates = ratesRes.data.map((r: any) => ({
              currency: r.currency,
              rate: Number(r.rate),
              change: Number(r.change),
            }));
          }

          set(updates);
        } catch (e) {
          console.error('Sync from Supabase error:', e);
        }
      },

      // Синхронизация В Supabase (отправка данных)
      pushToSupabase: async () => {
        if (!isSupabaseConfigured) return;
        const client = getSupabase();
        if (!client) return;
        const state = get();
        if (!state.session) return;

        try {
          // Обновляем сессию
          const sessionPayload = {
            id: state.session.id,
            code: state.session.code,
            name: state.session.name,
            status: state.session.status,
            phase: state.session.phase,
            timer: state.session.timer,
            phase_duration: state.session.phaseDuration,
          };
          console.log('📤 Pushing session to Supabase:', sessionPayload);
          const { data: sessionResult, error: sessionError } = await client
            .from('sessions')
            .upsert(sessionPayload)
            .select();
          
          if (sessionError) {
            console.error('❌ Session upsert error:', sessionError);
          } else {
            console.log('✅ Session saved to Supabase:', sessionResult);
          }

          // Обновляем игроков
          for (const p of state.players) {
            const { error: playerError } = await client.from('players').upsert({
              id: p.id,
              session_id: state.session.id,
              name: p.name,
              role: p.role,
              balance: p.balance,
              usefulness_points: p.usefulnessPoints,
              goods: p.goods,
              deals_count: p.dealsCount,
              salary: p.salary,
            });
            if (playerError) console.error('❌ Player upsert error:', playerError);
          }

          // Обновляем сделки
          for (const d of state.deals) {
            const { error: dealError } = await client.from('deals').upsert({
              id: d.id,
              session_id: state.session.id,
              seller_id: d.sellerId,
              buyer_id: d.buyerId,
              goods: d.goods,
              quantity: d.quantity,
              amount: d.amount,
              status: d.status,
              seller_confirmed: d.sellerConfirmed,
              buyer_confirmed: d.buyerConfirmed,
            });
            if (dealError) console.error('❌ Deal upsert error:', dealError);
          }

          // Обновляем события
          for (const e of state.events) {
            const { error: eventError } = await client.from('events').upsert({
              id: e.id,
              session_id: state.session.id,
              title: e.title,
              description: e.description,
              type: e.type,
            });
            if (eventError) console.error('❌ Event upsert error:', eventError);
          }

          // Обновляем курсы валют
          for (const r of state.currencyRates) {
            const { error: rateError } = await client.from('currency_rates').upsert({
              session_id: state.session.id,
              currency: r.currency,
              rate: r.rate,
              change: r.change,
            }, { onConflict: 'session_id,currency' });
            if (rateError) console.error('❌ Currency rate upsert error:', rateError);
          }
        } catch (e) {
          console.error('Push to Supabase error:', e);
        }
      },

      createSession: async (name?: string): Promise<Session> => {
        const session: Session = {
          id: generateId(),
          code: generateSessionCode(),
          name: name || 'Игровая сессия',
          status: 'waiting',
          phase: 0,
          timer: 600,
          phaseDuration: 600,
          createdAt: Date.now(),
        };
        set({ session, isAdmin: true, isAuthenticated: true, players: [], deals: [], events: [] });
        
        // Push в Supabase и ждём результат
        console.log('📤 Creating session, pushing to Supabase...');
        await get().pushToSupabase();
        
        // Проверяем, что сессия действительно сохранилась
        if (isSupabaseConfigured) {
          const client = getSupabase();
          if (client) {
            const { data, error } = await client
              .from('sessions')
              .select('id, code')
              .eq('id', session.id)
              .single();
            
            if (error || !data) {
              console.error('❌ Session was NOT saved to Supabase!', error);
            } else {
              console.log('✅ Session confirmed in Supabase:', data);
            }
          }
        }
        
        return session;
      },

      loadSessionByCode: async (code: string) => {
        console.log('🔍 Loading session by code:', code);
        console.log('🔍 isSupabaseConfigured:', isSupabaseConfigured);
        
        const upperCode = code.toUpperCase();

        // 1. Сначала ищем в localStorage (для случая, когда сессия создана на этом же устройстве)
        try {
          const storageKey = 'econom-strategy-storage';
          const rawStorage = localStorage.getItem(storageKey);
          if (rawStorage) {
            const parsed = JSON.parse(rawStorage);
            const state = parsed?.state;
            if (state?.session && state.session.code === upperCode) {
              console.log('✅ Session found in localStorage:', state.session.code);
              const session = state.session as Session;
              set({
                session,
                players: state.players || [],
                deals: state.deals || [],
                events: state.events || [],
                currencyRates: state.currencyRates || initialCurrencyRates,
              });
              return session;
            }
          }
        } catch (e) {
          console.warn('⚠️ Error reading localStorage:', e);
        }

        // 2. Если Supabase не настроен — сессию не найти на другом устройстве
        if (!isSupabaseConfigured) {
          console.error('❌ Supabase not configured — cannot search remote sessions');
          return null;
        }
        
        const client = getSupabase();
        console.log('🔍 Supabase client:', client);
        
        if (!client) {
          console.error('❌ Supabase client is null');
          return null;
        }

        try {
          // Ищем сессию по коду в Supabase
          console.log('🔍 Querying sessions table for code:', upperCode);
          const { data: sessionData, error } = await client
            .from('sessions')
            .select('*')
            .eq('code', upperCode)
            .maybeSingle();

          console.log('🔍 Query result:', { sessionData, error });

          if (error) {
            console.error('❌ Session query error:', error.message, error.code);
            return null;
          }
          
          if (!sessionData) {
            console.warn('⚠️ Session not found in database for code:', upperCode);
            return null;
          }

          // Конвертируем в наш формат
          const session: Session = {
            id: sessionData.id,
            code: sessionData.code,
            name: sessionData.name,
            status: sessionData.status,
            phase: sessionData.phase,
            timer: sessionData.timer,
            phaseDuration: sessionData.phase_duration,
            createdAt: new Date(sessionData.created_at).getTime(),
          };

          // Загружаем связанные данные
          const [playersRes, dealsRes, eventsRes, ratesRes] = await Promise.all([
            client.from('players').select('*').eq('session_id', session.id),
            client.from('deals').select('*').eq('session_id', session.id),
            client.from('events').select('*').eq('session_id', session.id).order('created_at', { ascending: false }),
            client.from('currency_rates').select('*').eq('session_id', session.id),
          ]);

          const players = playersRes.data?.map((db: any) => ({
            id: db.id,
            name: db.name,
            sessionId: db.session_id,
            role: db.role,
            balance: db.balance,
            usefulnessPoints: db.usefulness_points || 0,
            goods: db.goods,
            qrCode: db.id,
            dealsCount: db.deals_count,
            salary: db.salary,
            registered: true,
          })) || [];

          const deals = dealsRes.data?.map((db: any) => ({
            id: db.id,
            sellerId: db.seller_id,
            buyerId: db.buyer_id,
            goods: db.goods,
            quantity: db.quantity,
            amount: db.amount,
            timestamp: new Date(db.created_at).getTime(),
            status: db.status,
            sellerConfirmed: db.seller_confirmed,
            buyerConfirmed: db.buyer_confirmed,
          })) || [];

          const events = eventsRes.data?.map((db: any) => ({
            id: db.id,
            title: db.title,
            description: db.description,
            timestamp: new Date(db.created_at).getTime(),
            type: db.type,
          })) || [];

          const currencyRates = ratesRes.data?.map((r: any) => ({
            currency: r.currency,
            rate: Number(r.rate),
            change: Number(r.change),
          })) || [];

          // Сохраняем всё локально
          set({
            session,
            players,
            deals,
            events,
            currencyRates: currencyRates.length > 0 ? currencyRates : initialCurrencyRates,
          });

          console.log('✅ Session loaded from Supabase:', session.code);
          return session;
        } catch (e) {
          console.error('Load session error:', e);
          return null;
        }
      },

      joinSession: (sessionId: string, playerName: string) => {
        const state = get();
        if (!state.session || state.session.id !== sessionId) return null;
        if (state.session.status === 'ended') return null;

        const id = generateId();
        const role: PlayerRole = Math.random() < 0.6 ? 'buyer' : 'seller';
        const player: Player = {
          id,
          name: playerName,
          sessionId,
          role,
          balance: 1000,
          usefulnessPoints: 0,
          goods: { 'Нефть': 0, 'Зерно': 5, 'Металл': 0, 'Техника': 0, 'Лекарства': 0 },
          qrCode: id,
          dealsCount: 0,
          salary: 200,
          registered: true,
        };
        set((s) => ({ 
          players: [...s.players, player], 
          currentPlayerId: id,
          isAuthenticated: false,
          isAdmin: false,
          savedPlayerData: player,
        }));
        
        // Push в Supabase
        get().pushToSupabase();
        
        return player;
      },

      leaveSession: () => {
        set({ currentPlayerId: null, isAdmin: false });
      },

      endSession: () => {
        const state = get();
        set({
          session: null,
          timerRunning: false,
          isAuthenticated: false,
          isAdmin: false,
          players: [],
          deals: [],
          events: [],
          savedPlayerData: null,
        });
        
        // Удаляем из Supabase
        if (isSupabaseConfigured && state.session) {
          const client = getSupabase();
          if (client) {
            client.from('sessions').delete().eq('id', state.session.id).then();
          }
        }
      },

      restoreSession: () => {
        const state = get();
        if (!state.savedPlayerData || !state.session) return false;
        const playerExists = state.players.find(p => p.id === state.savedPlayerData!.id);
        if (!playerExists) {
          set({ savedPlayerData: null, currentPlayerId: null });
          return false;
        }
        if (state.session.status === 'ended') return false;
        set({
          currentPlayerId: state.savedPlayerData.id,
          isAuthenticated: false,
          isAdmin: false,
        });
        return true;
      },

      setCurrentPlayer: (id: string) => {
        const state = get();
        const playerData = id ? state.players.find(p => p.id === id) || null : null;
        set({
          currentPlayerId: id || null,
          isAuthenticated: false,
          isAdmin: false,
          savedPlayerData: playerData,
        });
      },

      createDeal: (sellerId: string, buyerId: string, goods: string, quantity: number, amount: number) => {
        const deal: Deal = {
          id: generateId(),
          sellerId,
          buyerId,
          goods,
          quantity,
          amount,
          timestamp: Date.now(),
          status: 'pending',
          sellerConfirmed: false,
          buyerConfirmed: false,
        };
        set((state) => ({ deals: [...state.deals, deal], pendingDeal: deal }));
        get().pushToSupabase();
      },

      confirmDeal: (dealId: string, playerId: string) => {
        set((state) => {
          const deal = state.deals.find(d => d.id === dealId);
          if (!deal) return state;

          const isSeller = deal.sellerId === playerId;
          const isBuyer = deal.buyerId === playerId;
          if (!isSeller && !isBuyer) return state;

          const updatedDeal = {
            ...deal,
            sellerConfirmed: isSeller ? true : deal.sellerConfirmed,
            buyerConfirmed: isBuyer ? true : deal.buyerConfirmed,
          };

          const bothConfirmed = updatedDeal.sellerConfirmed && updatedDeal.buyerConfirmed;

          if (bothConfirmed) {
            const players = state.players.map(p => {
              if (p.id === deal.sellerId) {
                // Продавец получает деньги
                return {
                  ...p,
                  balance: p.balance + deal.amount,
                  goods: { ...p.goods, [deal.goods]: (p.goods[deal.goods] || 0) - deal.quantity },
                  dealsCount: p.dealsCount + 1,
                };
              }
              if (p.id === deal.buyerId) {
                // Покупатель получает очки полезности (равные сумме сделки) и товары
                return {
                  ...p,
                  balance: p.balance - deal.amount,
                  usefulnessPoints: p.usefulnessPoints + deal.amount,
                  goods: { ...p.goods, [deal.goods]: (p.goods[deal.goods] || 0) + deal.quantity },
                  dealsCount: p.dealsCount + 1,
                };
              }
              return p;
            });

            const deals = state.deals.map(d =>
              d.id === dealId ? { ...updatedDeal, status: 'confirmed' as const } : d
            );

            setTimeout(() => get().pushToSupabase(), 0);
            return { players, deals, pendingDeal: null };
          } else {
            const deals = state.deals.map(d => d.id === dealId ? updatedDeal : d);
            setTimeout(() => get().pushToSupabase(), 0);
            return { deals };
          }
        });
      },

      rejectDeal: (dealId: string) => {
        set((state) => ({
          deals: state.deals.map(d =>
            d.id === dealId ? { ...d, status: 'rejected' as const } : d
          ),
          pendingDeal: null,
        }));
        get().pushToSupabase();
      },

      startPhase: (duration: number) => {
        set((state) => ({
          session: state.session ? {
            ...state.session,
            phase: state.session.phase + 1,
            timer: duration,
            phaseDuration: duration,
            status: 'active' as SessionStatus,
          } : null,
          timerRunning: true,
        }));
        get().pushToSupabase();
      },

      pausePhase: () => set((state) => ({
        timerRunning: false,
        session: state.session ? { ...state.session, status: 'paused' as SessionStatus } : null,
      })),

      resumePhase: () => set((state) => ({
        timerRunning: true,
        session: state.session ? { ...state.session, status: 'active' as SessionStatus } : null,
      })),

      endPhase: () => {
        set((state) => ({
          timerRunning: false,
          session: state.session ? { ...state.session, timer: 0, status: 'ended' as SessionStatus } : null,
        }));
        get().paySalary();
        get().pushToSupabase();
      },

      tickTimer: () => {
        set((state) => {
          if (!state.timerRunning || !state.session || state.session.timer <= 0) return state;
          const newTimer = state.session.timer - 1;
          return {
            session: { ...state.session, timer: newTimer },
            timerRunning: newTimer > 0,
          };
        });
      },

      addEvent: (event) => {
        const newEvent: GameEvent = {
          ...event,
          id: generateId(),
          timestamp: Date.now(),
        };
        set((state) => ({ events: [newEvent, ...state.events] }));
        get().pushToSupabase();
      },

      updateCurrencyRate: (currency: string, rate: number) => {
        set((state) => ({
          currencyRates: state.currencyRates.map(c => {
            if (c.currency === currency) {
              const change = ((rate - c.rate) / c.rate) * 100;
              return { ...c, rate, change };
            }
            return c;
          }),
        }));
        get().pushToSupabase();
      },

      setAdmin: (isAdmin: boolean) => set({ isAdmin }),

      login: (login: string, password: string) => {
        const state = get();
        if (login === state.adminLogin && password === state.adminPassword) {
          set({ isAuthenticated: true, isAdmin: true, currentPlayerId: null });
          return true;
        }
        return false;
      },

      logout: () => {
        const state = get();
        const playerData = state.currentPlayerId
          ? state.players.find(p => p.id === state.currentPlayerId) || null
          : null;
        set({
          isAuthenticated: false,
          isAdmin: false,
          currentPlayerId: null,
          savedPlayerData: playerData,
        });
      },

      setAdminCredentials: (login: string, password: string) => {
        set({ adminLogin: login, adminPassword: password });
      },

      paySalary: () => {
        set((state) => ({
          players: state.players.map(p => {
            if (p.dealsCount > 0) {
              return { ...p, balance: p.balance + p.salary, dealsCount: 0 };
            }
            return p;
          }),
        }));
      },

      deposit: (playerId: string, amount: number) => {
        set((state) => ({
          players: state.players.map(p =>
            p.id === playerId ? { ...p, balance: p.balance + amount } : p
          ),
        }));
        get().pushToSupabase();
      },

      withdraw: (playerId: string, amount: number) => {
        set((state) => ({
          players: state.players.map(p =>
            p.id === playerId ? { ...p, balance: p.balance - amount } : p
          ),
        }));
        get().pushToSupabase();
      },
    }),
    {
      name: 'econom-strategy-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.session,
        players: state.players,
        deals: state.deals,
        events: state.events,
        currencyRates: state.currencyRates,
        isAuthenticated: state.isAuthenticated,
        adminLogin: state.adminLogin,
        adminPassword: state.adminPassword,
        currentPlayerId: state.currentPlayerId,
        savedPlayerData: state.savedPlayerData,
      }),
    }
  )
);

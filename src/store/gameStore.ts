import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type PlayerRole = 'buyer' | 'seller';

export interface Player {
  id: string;
  name: string;
  sessionId: string;
  role: PlayerRole;
  balance: number;
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
  
  // Session actions
  createSession: (name?: string) => Session;
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
}

const generateId = () => Math.random().toString(36).substr(2, 9);
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
      createSession: (name?: string) => {
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
        set({ session, isAdmin: true, players: [], deals: [], events: [] });
        return session;
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
          goods: { 'Нефть': 0, 'Зерно': 5, 'Металл': 0, 'Техника': 0, 'Лекарства': 0 },
          qrCode: id,
          dealsCount: 0,
          salary: 200,
          registered: true,
        };
        // Явно сбрасываем isAuthenticated чтобы игрок не конфликтовал с админом
        set((s) => ({ 
          players: [...s.players, player], 
          currentPlayerId: id,
          isAuthenticated: false,
          isAdmin: false
        }));
        return player;
      },

      leaveSession: () => {
        set({ currentPlayerId: null, isAdmin: false });
      },

      endSession: () => {
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
      },

      restoreSession: () => {
        const state = get();
        
        // Проверяем наличие сохраненных данных
        if (!state.savedPlayerData || !state.session) {
          return false;
        }

        // Проверяем, существует ли игрок в текущей сессии
        const playerExists = state.players.find(p => p.id === state.savedPlayerData!.id);
        
        if (!playerExists) {
          // Игрок не найден в сессии (сессия была сброшена или игрок удален)
          set({ savedPlayerData: null, currentPlayerId: null });
          return false;
        }

        // Проверяем, что сессия не завершена
        if (state.session.status === 'ended') {
          return false;
        }

        // Восстанавливаем сессию
        set({
          currentPlayerId: state.savedPlayerData.id,
          isAuthenticated: false,
          isAdmin: false,
        });

        return true;
      },

      setCurrentPlayer: (id: string) => {
        const state = get();
        // Находим данные игрока
        const playerData = id ? state.players.find(p => p.id === id) || null : null;
        
        // При установке игрока явно сбрасываем флаги админа и сохраняем данные
        set({ 
          currentPlayerId: id || null,
          isAuthenticated: false,
          isAdmin: false,
          savedPlayerData: playerData
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
      },

      confirmDeal: (dealId: string, playerId: string) => {
        set((state) => {
          const deal = state.deals.find(d => d.id === dealId);
          if (!deal) return state;

          // Определяем кто подтверждает
          const isSeller = deal.sellerId === playerId;
          const isBuyer = deal.buyerId === playerId;
          if (!isSeller && !isBuyer) return state;

          // Обновляем флаги подтверждения
          const updatedDeal = {
            ...deal,
            sellerConfirmed: isSeller ? true : deal.sellerConfirmed,
            buyerConfirmed: isBuyer ? true : deal.buyerConfirmed,
          };

          // Проверяем, подтвердили ли обе стороны
          const bothConfirmed = updatedDeal.sellerConfirmed && updatedDeal.buyerConfirmed;

          if (bothConfirmed) {
            // Обе стороны подтвердили — выполняем сделку
            const players = state.players.map(p => {
              if (p.id === deal.sellerId) {
                return {
                  ...p,
                  balance: p.balance + deal.amount,
                  goods: { ...p.goods, [deal.goods]: (p.goods[deal.goods] || 0) - deal.quantity },
                  dealsCount: p.dealsCount + 1,
                };
              }
              if (p.id === deal.buyerId) {
                return {
                  ...p,
                  balance: p.balance - deal.amount,
                  goods: { ...p.goods, [deal.goods]: (p.goods[deal.goods] || 0) + deal.quantity },
                  dealsCount: p.dealsCount + 1,
                };
              }
              return p;
            });

            const deals = state.deals.map(d => 
              d.id === dealId ? { ...updatedDeal, status: 'confirmed' as const } : d
            );

            return { players, deals, pendingDeal: null };
          } else {
            // Одна сторона подтвердила — ждём вторую
            const deals = state.deals.map(d => 
              d.id === dealId ? updatedDeal : d
            );
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
      },

      startPhase: (duration: number) => {
        set((state) => ({
          session: state.session ? { 
            ...state.session, 
            phase: state.session.phase + 1, 
            timer: duration, 
            phaseDuration: duration,
            status: 'active' as SessionStatus 
          } : null,
          timerRunning: true,
        }));
      },

      pausePhase: () => set((state) => ({ 
        timerRunning: false,
        session: state.session ? { ...state.session, status: 'paused' as SessionStatus } : null
      })),
      
      resumePhase: () => set((state) => ({ 
        timerRunning: true,
        session: state.session ? { ...state.session, status: 'active' as SessionStatus } : null
      })),

      endPhase: () => {
        set((state) => ({
          timerRunning: false,
          session: state.session ? { ...state.session, timer: 0, status: 'ended' as SessionStatus } : null,
        }));
        get().paySalary();
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
      },

      setAdmin: (isAdmin: boolean) => set({ isAdmin }),

      login: (login: string, password: string) => {
        const state = get();
        if (login === state.adminLogin && password === state.adminPassword) {
          // Явно сбрасываем currentPlayerId чтобы админ не конфликтовал с игроком
          set({ isAuthenticated: true, isAdmin: true, currentPlayerId: null });
          return true;
        }
        return false;
      },

      logout: () => {
        const state = get();
        // Сохраняем данные игрока перед выходом для возможного восстановления
        const playerData = state.currentPlayerId 
          ? state.players.find(p => p.id === state.currentPlayerId) || null
          : null;
        
        // Полный сброс всех флагов авторизации, но сохраняем данные игрока
        set({ 
          isAuthenticated: false, 
          isAdmin: false, 
          currentPlayerId: null,
          savedPlayerData: playerData
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
      },

      withdraw: (playerId: string, amount: number) => {
        set((state) => ({
          players: state.players.map(p => 
            p.id === playerId ? { ...p, balance: p.balance - amount } : p
          ),
        }));
      },
    }),
    {
      name: 'econom-strategy-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Сохраняем всё кроме временных состояний
        session: state.session,
        players: state.players,
        deals: state.deals,
        events: state.events,
        currencyRates: state.currencyRates,
        isAuthenticated: state.isAuthenticated,
        adminLogin: state.adminLogin,
        adminPassword: state.adminPassword,
        currentPlayerId: state.currentPlayerId,
        // Сохраняем данные текущего игрока для восстановления
        savedPlayerData: state.currentPlayerId ? state.players.find(p => p.id === state.currentPlayerId) : null,
        // Не сохраняем: isAdmin, timerRunning, pendingDeal
      }),
    }
  )
);

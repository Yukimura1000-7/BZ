import { create } from 'zustand';
import { supabase, type Database } from '../lib/supabase';

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
  session: Session | null;
  players: Player[];
  currentPlayerId: string | null;
  savedPlayerData: Player | null;
  deals: Deal[];
  pendingDeal: Deal | null;
  timerRunning: boolean;
  events: GameEvent[];
  currencyRates: CurrencyRate[];
  isAdmin: boolean;
  isAuthenticated: boolean;
  adminLogin: string;
  adminPassword: string;
  isSupabaseConnected: boolean;
  lastSyncTime: number;

  // Session
  createSession: (name?: string) => Promise<Session | null>;
  joinSession: (sessionId: string, playerName: string) => Promise<Player | null>;
  leaveSession: () => void;
  endSession: () => Promise<void>;
  restoreSession: () => boolean;
  loadSession: (code: string) => Promise<Session | null>;

  setCurrentPlayer: (id: string) => void;

  // Deals
  createDeal: (sellerId: string, buyerId: string, goods: string, quantity: number, amount: number) => Promise<void>;
  confirmDeal: (dealId: string, playerId: string) => Promise<void>;
  rejectDeal: (dealId: string) => Promise<void>;

  // Phase
  startPhase: (duration: number) => Promise<void>;
  pausePhase: () => Promise<void>;
  resumePhase: () => Promise<void>;
  endPhase: () => Promise<void>;
  tickTimer: () => void;

  // Events
  addEvent: (event: Omit<GameEvent, 'id' | 'timestamp'>) => Promise<void>;
  updateCurrencyRate: (currency: string, rate: number) => Promise<void>;

  // Admin
  setAdmin: (isAdmin: boolean) => void;
  login: (login: string, password: string) => Promise<boolean>;
  logout: () => void;
  setAdminCredentials: (login: string, password: string) => void;

  // Bank
  paySalary: () => Promise<void>;
  deposit: (playerId: string, amount: number) => Promise<void>;
  withdraw: (playerId: string, amount: number) => Promise<void>;

  // Sync
  syncFromSupabase: () => Promise<void>;
  checkSupabaseConnection: () => Promise<boolean>;
}

const generateId = () => Math.random().toString(36).substr(2, 9);
const generateSessionCode = () => Math.random().toString(36).substr(2, 6).toUpperCase();

const initialCurrencyRates: CurrencyRate[] = [
  { currency: 'USD', rate: 90.5, change: 0 },
  { currency: 'EUR', rate: 98.2, change: 0 },
  { currency: 'BTC', rate: 65000, change: 0 },
  { currency: 'Золото', rate: 5800, change: 0 },
];

// Helpers для конвертации между Supabase и app форматами
const dbSessionToApp = (db: any): Session => ({
  id: db.id,
  code: db.code,
  name: db.name,
  status: db.status,
  phase: db.phase,
  timer: db.timer,
  phaseDuration: db.phase_duration,
  createdAt: new Date(db.created_at).getTime(),
});

const dbPlayerToApp = (db: any): Player => ({
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
});

const dbDealToApp = (db: any): Deal => ({
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
});

const dbEventToApp = (db: any): GameEvent => ({
  id: db.id,
  title: db.title,
  description: db.description,
  timestamp: new Date(db.created_at).getTime(),
  type: db.type,
});

export const useGameStore = create<GameState>((set, get) => ({
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
  isSupabaseConnected: false,
  lastSyncTime: 0,

  checkSupabaseConnection: async () => {
    try {
      const { error } = await supabase.from('sessions').select('count').limit(1);
      const connected = !error;
      set({ isSupabaseConnected: connected });
      return connected;
    } catch {
      set({ isSupabaseConnected: false });
      return false;
    }
  },

  syncFromSupabase: async () => {
    const state = get();
    if (!state.session) return;

    try {
      // Загружаем всё параллельно
      const [sessionRes, playersRes, dealsRes, eventsRes, ratesRes] = await Promise.all([
        supabase.from('sessions').select('*').eq('id', state.session.id).single(),
        supabase.from('players').select('*').eq('session_id', state.session.id),
        supabase.from('deals').select('*').eq('session_id', state.session.id),
        supabase.from('events').select('*').eq('session_id', state.session.id).order('created_at', { ascending: false }),
        supabase.from('currency_rates').select('*').eq('session_id', state.session.id),
      ]);

      const updates: Partial<GameState> = { lastSyncTime: Date.now() };

      if (sessionRes.data) updates.session = dbSessionToApp(sessionRes.data);
      if (playersRes.data) updates.players = playersRes.data.map(dbPlayerToApp);
      if (dealsRes.data) updates.deals = dealsRes.data.map(dbDealToApp);
      if (eventsRes.data) updates.events = eventsRes.data.map(dbEventToApp);
      if (ratesRes.data && ratesRes.data.length > 0) {
        updates.currencyRates = ratesRes.data.map(r => ({
          currency: r.currency,
          rate: Number(r.rate),
          change: Number(r.change),
        }));
      }

      set(updates as any);
    } catch (e) {
      console.error('Sync error:', e);
    }
  },

  createSession: async (name?: string) => {
    const sessionName = name || 'Игровая сессия';
    const code = generateSessionCode();
    const state = get();

    try {
      // Пробуем создать в Supabase
      const { data, error } = await supabase
        .from('sessions')
        .insert([{
          code,
          name: sessionName,
          status: 'waiting',
          phase: 0,
          timer: 600,
          phase_duration: 600,
          admin_login: state.adminLogin,
          admin_password: state.adminPassword,
        }])
        .select()
        .single();

      if (error) throw error;

      const session = dbSessionToApp(data);

      // Создаём начальные курсы валют
      for (const rate of initialCurrencyRates) {
        await supabase.from('currency_rates').insert([{
          session_id: session.id,
          currency: rate.currency,
          rate: rate.rate,
          change: 0,
        }]);
      }

      set({
        session,
        isAdmin: true,
        isAuthenticated: true,
        players: [],
        deals: [],
        events: [],
        currencyRates: initialCurrencyRates,
      });

      return session;
    } catch (e) {
      console.error('Create session error:', e);
      // Fallback на localStorage
      const session: Session = {
        id: generateId(),
        code,
        name: sessionName,
        status: 'waiting',
        phase: 0,
        timer: 600,
        phaseDuration: 600,
        createdAt: Date.now(),
      };
      set({
        session,
        isAdmin: true,
        isAuthenticated: true,
        players: [],
        deals: [],
        events: [],
        currencyRates: initialCurrencyRates,
        isSupabaseConnected: false,
      });
      return session;
    }
  },

  loadSession: async (code: string) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (error || !data) return null;

      const session = dbSessionToApp(data);
      set({ session });

      // Сразу загружаем связанные данные
      await get().syncFromSupabase();

      return session;
    } catch (e) {
      console.error('Load session error:', e);
      return null;
    }
  },

  joinSession: async (sessionId: string, playerName: string) => {
    const state = get();
    if (!state.session || state.session.id !== sessionId) return null;
    if (state.session.status === 'ended') return null;

    const id = generateId();
    const role: PlayerRole = Math.random() < 0.6 ? 'buyer' : 'seller';

    try {
      const { data, error } = await supabase
        .from('players')
        .insert([{
          id,
          session_id: sessionId,
          name: playerName,
          role,
          balance: 1000,
          goods: { 'Нефть': 0, 'Зерно': 5, 'Металл': 0, 'Техника': 0, 'Лекарства': 0 },
          deals_count: 0,
          salary: 200,
        }])
        .select()
        .single();

      if (error) throw error;

      const player = dbPlayerToApp(data);

      set((s) => ({
        players: [...s.players, player],
        currentPlayerId: id,
        isAuthenticated: false,
        isAdmin: false,
        savedPlayerData: player,
      }));

      return player;
    } catch (e) {
      console.error('Join session error:', e);
      return null;
    }
  },

  leaveSession: () => set({ currentPlayerId: null, isAdmin: false }),

  endSession: async () => {
    const state = get();
    if (state.session) {
      try {
        await supabase.from('sessions').delete().eq('id', state.session.id);
      } catch (e) {
        console.error('End session error:', e);
      }
    }
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

  createDeal: async (sellerId: string, buyerId: string, goods: string, quantity: number, amount: number) => {
    const state = get();
    if (!state.session) return;

    const dealId = generateId();
    const deal: Deal = {
      id: dealId,
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

    try {
      await supabase.from('deals').insert([{
        id: dealId,
        session_id: state.session.id,
        seller_id: sellerId,
        buyer_id: buyerId,
        goods,
        quantity,
        amount,
        status: 'pending',
        seller_confirmed: false,
        buyer_confirmed: false,
      }]);
    } catch (e) {
      console.error('Create deal error:', e);
    }

    set((s) => ({ deals: [...s.deals, deal], pendingDeal: deal }));
  },

  confirmDeal: async (dealId: string, playerId: string) => {
    const state = get();
    const deal = state.deals.find(d => d.id === dealId);
    if (!deal || !state.session) return;

    const isSeller = deal.sellerId === playerId;
    const isBuyer = deal.buyerId === playerId;
    if (!isSeller && !isBuyer) return;

    const updatedDeal = {
      ...deal,
      sellerConfirmed: isSeller ? true : deal.sellerConfirmed,
      buyerConfirmed: isBuyer ? true : deal.buyerConfirmed,
    };

    const bothConfirmed = updatedDeal.sellerConfirmed && updatedDeal.buyerConfirmed;

    try {
      if (bothConfirmed) {
        // Обновляем сделку
        await supabase.from('deals').update({
          status: 'confirmed',
          seller_confirmed: true,
          buyer_confirmed: true,
        }).eq('id', dealId);

        // Обновляем игроков
        const seller = state.players.find(p => p.id === deal.sellerId);
        const buyer = state.players.find(p => p.id === deal.buyerId);

        if (seller) {
          await supabase.from('players').update({
            balance: seller.balance + deal.amount,
            goods: { ...seller.goods, [deal.goods]: (seller.goods[deal.goods] || 0) - deal.quantity },
            deals_count: seller.dealsCount + 1,
          }).eq('id', seller.id);
        }

        if (buyer) {
          await supabase.from('players').update({
            balance: buyer.balance - deal.amount,
            goods: { ...buyer.goods, [deal.goods]: (buyer.goods[deal.goods] || 0) + deal.quantity },
            deals_count: buyer.dealsCount + 1,
          }).eq('id', buyer.id);
        }
      } else {
        await supabase.from('deals').update({
          seller_confirmed: updatedDeal.sellerConfirmed,
          buyer_confirmed: updatedDeal.buyerConfirmed,
        }).eq('id', dealId);
      }
    } catch (e) {
      console.error('Confirm deal error:', e);
    }

    // Обновляем локально
    if (bothConfirmed) {
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

      set({ players, deals, pendingDeal: null });
    } else {
      const deals = state.deals.map(d => d.id === dealId ? updatedDeal : d);
      set({ deals });
    }
  },

  rejectDeal: async (dealId: string) => {
    const state = get();
    try {
      await supabase.from('deals').update({ status: 'rejected' }).eq('id', dealId);
    } catch (e) {
      console.error('Reject deal error:', e);
    }
    set((s) => ({
      deals: s.deals.map(d => d.id === dealId ? { ...d, status: 'rejected' as const } : d),
      pendingDeal: null,
    }));
  },

  startPhase: async (duration: number) => {
    const state = get();
    if (!state.session) return;

    const newPhase = state.session.phase + 1;
    try {
      await supabase.from('sessions').update({
        phase: newPhase,
        timer: duration,
        phase_duration: duration,
        status: 'active',
      }).eq('id', state.session.id);
    } catch (e) {
      console.error('Start phase error:', e);
    }

    set((s) => ({
      session: s.session ? {
        ...s.session,
        phase: newPhase,
        timer: duration,
        phaseDuration: duration,
        status: 'active',
      } : null,
      timerRunning: true,
    }));
  },

  pausePhase: async () => {
    const state = get();
    if (!state.session) return;
    try {
      await supabase.from('sessions').update({ status: 'paused' }).eq('id', state.session.id);
    } catch (e) {
      console.error('Pause phase error:', e);
    }
    set((s) => ({
      timerRunning: false,
      session: s.session ? { ...s.session, status: 'paused' } : null,
    }));
  },

  resumePhase: async () => {
    const state = get();
    if (!state.session) return;
    try {
      await supabase.from('sessions').update({ status: 'active' }).eq('id', state.session.id);
    } catch (e) {
      console.error('Resume phase error:', e);
    }
    set((s) => ({
      timerRunning: true,
      session: s.session ? { ...s.session, status: 'active' } : null,
    }));
  },

  endPhase: async () => {
    const state = get();
    if (!state.session) return;
    try {
      await supabase.from('sessions').update({ timer: 0, status: 'ended' }).eq('id', state.session.id);
    } catch (e) {
      console.error('End phase error:', e);
    }
    set((s) => ({
      timerRunning: false,
      session: s.session ? { ...s.session, timer: 0, status: 'ended' } : null,
    }));
    await get().paySalary();
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

  addEvent: async (event) => {
    const state = get();
    if (!state.session) return;

    const newEvent: GameEvent = {
      ...event,
      id: generateId(),
      timestamp: Date.now(),
    };

    try {
      await supabase.from('events').insert([{
        id: newEvent.id,
        session_id: state.session.id,
        title: event.title,
        description: event.description,
        type: event.type,
      }]);
    } catch (e) {
      console.error('Add event error:', e);
    }

    set((s) => ({ events: [newEvent, ...s.events] }));
  },

  updateCurrencyRate: async (currency: string, rate: number) => {
    const state = get();
    if (!state.session) return;

    const change = (() => {
      const current = state.currencyRates.find(c => c.currency === currency);
      return current ? ((rate - current.rate) / current.rate) * 100 : 0;
    })();

    try {
      await supabase.from('currency_rates').upsert({
        session_id: state.session.id,
        currency,
        rate,
        change,
      }, { onConflict: 'session_id,currency' });
    } catch (e) {
      console.error('Update currency rate error:', e);
    }

    set((s) => ({
      currencyRates: s.currencyRates.map(c =>
        c.currency === currency ? { ...c, rate, change } : c
      ),
    }));
  },

  setAdmin: (isAdmin: boolean) => set({ isAdmin }),

  login: async (login: string, password: string) => {
    const state = get();

    // Сначала проверяем локальные креды
    if (login === state.adminLogin && password === state.adminPassword) {
      // Если есть активная сессия — проверяем её креды
      if (state.session) {
        try {
          const { data } = await supabase
            .from('sessions')
            .select('admin_login, admin_password')
            .eq('id', state.session.id)
            .single();

          if (data && (login !== data.admin_login || password !== data.admin_password)) {
            return false;
          }
        } catch (e) {
          // Игнорируем ошибки
        }
      }

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

  paySalary: async () => {
    const state = get();
    const playersToPay = state.players.filter(p => p.dealsCount > 0);

    for (const p of playersToPay) {
      try {
        await supabase.from('players').update({
          balance: p.balance + p.salary,
          deals_count: 0,
        }).eq('id', p.id);
      } catch (e) {
        console.error('Pay salary error:', e);
      }
    }

    set((s) => ({
      players: s.players.map(p =>
        p.dealsCount > 0
          ? { ...p, balance: p.balance + p.salary, dealsCount: 0 }
          : p
      ),
    }));
  },

  deposit: async (playerId: string, amount: number) => {
    const state = get();
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    try {
      await supabase.from('players').update({
        balance: player.balance + amount,
      }).eq('id', playerId);
    } catch (e) {
      console.error('Deposit error:', e);
    }

    set((s) => ({
      players: s.players.map(p =>
        p.id === playerId ? { ...p, balance: p.balance + amount } : p
      ),
    }));
  },

  withdraw: async (playerId: string, amount: number) => {
    const state = get();
    const player = state.players.find(p => p.id === playerId);
    if (!player) return;

    try {
      await supabase.from('players').update({
        balance: player.balance - amount,
      }).eq('id', playerId);
    } catch (e) {
      console.error('Withdraw error:', e);
    }

    set((s) => ({
      players: s.players.map(p =>
        p.id === playerId ? { ...p, balance: p.balance - amount } : p
      ),
    }));
  },
}));

import { createClient } from '@supabase/supabase-js';

// Инициализация Supabase клиента
// Замени эти значения на свои из Supabase Dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Типы данных для Supabase
export interface Database {
  sessions: {
    id: string;
    code: string;
    name: string;
    status: 'waiting' | 'active' | 'paused' | 'ended';
    phase: number;
    timer: number;
    phase_duration: number;
    created_at: string;
    admin_login: string;
    admin_password: string;
  };
  players: {
    id: string;
    session_id: string;
    name: string;
    role: 'buyer' | 'seller';
    balance: number;
    goods: Record<string, number>;
    deals_count: number;
    salary: number;
    created_at: string;
  };
  deals: {
    id: string;
    session_id: string;
    seller_id: string;
    buyer_id: string;
    goods: string;
    quantity: number;
    amount: number;
    status: 'pending' | 'confirmed' | 'rejected';
    seller_confirmed: boolean;
    buyer_confirmed: boolean;
    created_at: string;
  };
  events: {
    id: string;
    session_id: string;
    title: string;
    description: string;
    type: 'currency' | 'market' | 'random';
    created_at: string;
  };
  currency_rates: {
    id: string;
    session_id: string;
    currency: string;
    rate: number;
    change: number;
  };
}

// Helper функции для работы с БД
export const db = {
  // Sessions
  async createSession(session: Database['sessions']) {
    const { data, error } = await supabase
      .from('sessions')
      .insert([session])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getSession(code: string) {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('code', code)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateSession(id: string, updates: Partial<Database['sessions']>) {
    const { data, error } = await supabase
      .from('sessions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Players
  async createPlayer(player: Database['players']) {
    const { data, error } = await supabase
      .from('players')
      .insert([player])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getPlayersBySession(sessionId: string) {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('session_id', sessionId);
    
    if (error) throw error;
    return data || [];
  },

  async updatePlayer(id: string, updates: Partial<Database['players']>) {
    const { data, error } = await supabase
      .from('players')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Deals
  async createDeal(deal: Database['deals']) {
    const { data, error } = await supabase
      .from('deals')
      .insert([deal])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getDealsBySession(sessionId: string) {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('session_id', sessionId);
    
    if (error) throw error;
    return data || [];
  },

  async updateDeal(id: string, updates: Partial<Database['deals']>) {
    const { data, error } = await supabase
      .from('deals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Events
  async createEvent(event: Database['events']) {
    const { data, error } = await supabase
      .from('events')
      .insert([event])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async getEventsBySession(sessionId: string) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Currency Rates
  async getCurrencyRates(sessionId: string) {
    const { data, error } = await supabase
      .from('currency_rates')
      .select('*')
      .eq('session_id', sessionId);
    
    if (error) throw error;
    return data || [];
  },

  async updateCurrencyRate(sessionId: string, currency: string, rate: number, change: number) {
    const { data, error } = await supabase
      .from('currency_rates')
      .upsert({ session_id: sessionId, currency, rate, change })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};

// Real-time подписки
export const realtime = {
  subscribeToSession(sessionId: string, callback: (session: Database['sessions']) => void) {
    return supabase
      .channel(`session:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, (payload) => {
        callback(payload.new as Database['sessions']);
      })
      .subscribe();
  },

  subscribeToPlayers(sessionId: string, callback: (players: Database['players'][]) => void) {
    return supabase
      .channel(`players:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `session_id=eq.${sessionId}` }, async () => {
        const players = await db.getPlayersBySession(sessionId);
        callback(players);
      })
      .subscribe();
  },

  subscribeToDeals(sessionId: string, callback: (deals: Database['deals'][]) => void) {
    return supabase
      .channel(`deals:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deals', filter: `session_id=eq.${sessionId}` }, async () => {
        const deals = await db.getDealsBySession(sessionId);
        callback(deals);
      })
      .subscribe();
  },

  subscribeToEvents(sessionId: string, callback: (events: Database['events'][]) => void) {
    return supabase
      .channel(`events:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `session_id=eq.${sessionId}` }, async () => {
        const events = await db.getEventsBySession(sessionId);
        callback(events);
      })
      .subscribe();
  },

  subscribeToCurrencyRates(sessionId: string, callback: (rates: Database['currency_rates'][]) => void) {
    return supabase
      .channel(`currency_rates:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'currency_rates', filter: `session_id=eq.${sessionId}` }, async () => {
        const rates = await db.getCurrencyRates(sessionId);
        callback(rates);
      })
      .subscribe();
  },
};

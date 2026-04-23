import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

const configError = {
  message: 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.',
};

function createThenableResult(data = null, error = null) {
  const result = { data, error };
  return {
    ...result,
    then(resolve) {
      return Promise.resolve(resolve(result));
    },
    catch() {
      return Promise.resolve(result);
    },
  };
}

function createMockQueryBuilder() {
  const builder = {
    select() {
      return builder;
    },
    insert() {
      return createThenableResult(null, configError);
    },
    upsert() {
      return createThenableResult(null, configError);
    },
    update() {
      return createThenableResult(null, configError);
    },
    delete() {
      return createThenableResult(null, configError);
    },
    eq() {
      return builder;
    },
    gte() {
      return builder;
    },
    lte() {
      return builder;
    },
    order() {
      return builder;
    },
    limit() {
      return builder;
    },
    single() {
      return createThenableResult(null, configError);
    },
    maybeSingle() {
      return createThenableResult(null, configError);
    },
    then(resolve) {
      return Promise.resolve(resolve({ data: [], error: configError }));
    },
    catch() {
      return Promise.resolve({ data: [], error: configError });
    },
  };

  return builder;
}

function createMockSupabaseClient() {
  return {
    isConfigured: false,
    auth: {
      async getSession() {
        return { data: { session: null }, error: null };
      },
      onAuthStateChange() {
        return {
          data: {
            subscription: {
              unsubscribe() {},
            },
          },
        };
      },
      async signInWithPassword() {
        return { data: null, error: configError };
      },
      async signUp() {
        return { data: null, error: configError };
      },
      async signOut() {
        return { error: null };
      },
    },
    from() {
      return createMockQueryBuilder();
    },
  };
}

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockSupabaseClient();

export const isSupabaseConfigured = hasSupabaseConfig;
export const supabaseConfigError = configError.message;

export default supabase;

const SUPABASE_URL = 'https://qhmcpmasljuhrcmjbqtn.supabase.co';

const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Lo9AkcZ8moOy_g96zf7TLA_c5MXsMgN';

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);
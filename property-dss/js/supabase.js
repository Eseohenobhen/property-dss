// ============================================================
// Supabase Client
// Replace the two values below with your own project credentials
// ============================================================

const SUPABASE_URL = window.ENV_SUPABASE_URL || 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = window.ENV_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

// Initialize
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Auth helpers ----
async function getSession() {
  const { data } = await db.auth.getSession();
  return data.session;
}

async function getCurrentUser() {
  const { data } = await db.auth.getUser();
  return data.user;
}

async function getUserProfile(userId) {
  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

// Redirect to login if not authenticated
async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = isInPagesDir() ? '../index.html' : 'index.html';
    return null;
  }
  return session;
}

// Redirect to dashboard if already authenticated
async function redirectIfAuth() {
  const session = await getSession();
  if (session) {
    window.location.href = 'pages/dashboard.html';
  }
}

function isInPagesDir() {
  return window.location.pathname.includes('/pages/');
}

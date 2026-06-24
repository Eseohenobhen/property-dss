// ============================================================
// auth.js — Login & Register
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
  // If already logged in, go to dashboard
  await redirectIfAuth();

  // Tab switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.tab === 'login') {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
      } else {
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
      }
    });
  });

  // ---- Login ----
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    setLoading(btn, true);
    errorEl.classList.add('hidden');

    const { data, error } = await db.auth.signInWithPassword({ email, password });

    if (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
      setLoading(btn, false);
      return;
    }

    window.location.href = 'pages/dashboard.html';
  });

  // ---- Register ----
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const role = document.querySelector('input[name="role"]:checked').value;
    const errorEl = document.getElementById('reg-error');
    const btn = document.getElementById('reg-btn');

    setLoading(btn, true);
    errorEl.classList.add('hidden');

    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role }
      }
    });

    if (error) {
      errorEl.textContent = error.message;
      errorEl.classList.remove('hidden');
      setLoading(btn, false);
      return;
    }

    // If email confirmation is disabled (check Supabase Auth settings), go straight to dashboard
    if (data.session) {
      window.location.href = 'pages/dashboard.html';
    } else {
      errorEl.style.background = 'rgba(46,196,182,0.1)';
      errorEl.style.borderColor = '#2ec4b6';
      errorEl.style.color = '#2ec4b6';
      errorEl.textContent = 'Account created! Check your email to confirm, then sign in.';
      errorEl.classList.remove('hidden');
      setLoading(btn, false);
    }
  });
});

function setLoading(btn, loading) {
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  btn.disabled = loading;
  text.classList.toggle('hidden', loading);
  loader.classList.toggle('hidden', !loading);
}

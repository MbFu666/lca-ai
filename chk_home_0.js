
// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.log('SW registration failed:', err));
  });
}

// Lazy loading for heavy libraries
const lazyLibs = {
  xlsx: { url: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', loaded: false },
  jspdf: { url: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', loaded: false },
  html2canvas: { url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', loaded: false }
};

async function loadLib(name) {
  if (lazyLibs[name].loaded) return true;
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = lazyLibs[name].url;
    script.onload = () => { lazyLibs[name].loaded = true; resolve(true); };
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

// ============================================
// Supabase Configuration
// ============================================
const SUPABASE_URL = 'https://pbisngkepszwzzjivxus.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBiaXNuZ2tlcHN6d3p6aml2eHVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM0NDQzMjQsImV4cCI6MjA5OTAyMDMyNH0.RV7GaTA7Wo2JIPMChh8j4ro7eXqZA9g_vCOnfjJ1bJY';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth state
let currentUser = null;

// Check auth state
async function checkAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    currentUser = session.user;
    localStorage.setItem('supabase_user', JSON.stringify(session.user));
    localStorage.setItem('supabase_token', session.access_token);
    updateAuthUI(true);
    // Load user data from Supabase
    await loadUserData();
  } else {
    // Check localStorage for cached session
    const cachedUser = localStorage.getItem('supabase_user');
    if (cachedUser) {
      currentUser = JSON.parse(cachedUser);
      updateAuthUI(true);
    }
  }
}

// Update UI based on auth state
function updateAuthUI(isLoggedIn) {
  const authSection = document.getElementById('authSection');
  if (!authSection) return;
  
  if (isLoggedIn && currentUser) {
    const name = currentUser.user_metadata?.full_name || 
                 currentUser.user_metadata?.name || 
                 currentUser.email || 'User';
    const picture = currentUser.user_metadata?.avatar_url || 
                   currentUser.user_metadata?.picture || '';
    
    authSection.innerHTML = '<a href="/cabinet.html" class="auth-btn" style="margin-right:8px">' +
      (picture ? '<img src="' + picture + '" class="auth-avatar" alt="">' : 
                 '<span class="auth-avatar-text">' + name.charAt(0).toUpperCase() + '</span>') +
      '<span>' + name + '</span></a>' +
      '<button class="auth-logout" onclick="logout()" title="Выйти">✕</button>';
  } else {
    authSection.innerHTML = '<a href="/login.html" class="auth-btn">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
      '<span>Войти</span></a>';
  }

  // Hide projects button for logged-out users
  const projBtn = document.getElementById('projectsBtn');
  if (projBtn) projBtn.style.display = isLoggedIn ? '' : 'none';
}

// Logout
async function logout() {
  await supabaseClient.auth.signOut();
  localStorage.removeItem('supabase_user');
  localStorage.removeItem('supabase_token');
  currentUser = null;
  updateAuthUI(false);
}

// Auth guard — redirect to login if not authenticated
function requireAuth(action) {
  if (currentUser) return true;
  const msg = {
    ru: 'Для этого действия нужно войти в аккаунт',
    en: 'Please login to continue',
    zh: '请先登录'
  }[currentLang] || 'Please login to continue';
  showToast(msg);
  setTimeout(() => { window.location.href = '/login.html'; }, 1500);
  return false;
}

// Load user data from Supabase
async function loadUserData() {
  if (!currentUser || !supabaseClient) return;
  
  try {
    console.log('[LCA] Loading user data from Supabase...');
    
    // Load history from Supabase (PRIMARY source)
    const { data: history, error: hErr } = await supabaseClient
      .from('user_history')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    
    if (hErr) console.error('[LCA] History load error:', hErr);
    
    if (history && history.length > 0) {
      // Cache in localStorage for fast access
      localStorage.setItem('lca-history', JSON.stringify(history.map(h => ({
        id: h.id,
        date: h.created_at,
        product: h.product_title,
        fu: h.functional_unit,
        total: h.total_co2eq,
        data: h.report_data
      }))));
      console.log('[LCA] History cached:', history.length, 'entries');
    } else {
      // Clear localStorage if Supabase is empty
      localStorage.removeItem('lca-history');
    }
    
    // Load projects from Supabase (PRIMARY source)
    const { data: projects, error: pErr } = await supabaseClient
      .from('user_projects')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });
    
    if (pErr) console.error('[LCA] Projects load error:', pErr);
    
    if (projects && projects.length > 0) {
      // Load calculations for each project
      const projectsWithCalcs = await Promise.all(projects.map(async (p) => {
        const { data: calcs } = await supabaseClient
          .from('project_calculations')
          .select('*')
          .eq('project_id', p.id)
          .order('created_at', { ascending: false });
        
        return {
          id: p.id,
          name: p.name,
          createdAt: p.created_at,
          calculations: (calcs || []).map(c => ({
            id: c.id,
            date: c.created_at,
            product: c.report_data?.product_title || '',
            total: c.report_data?.total_co2eq || 0,
            addedAt: c.created_at,
            data: c.report_data
          }))
        };
      }));
      
      // Cache in localStorage for fast access
      localStorage.setItem('lca-projects', JSON.stringify(projectsWithCalcs));
      console.log('[LCA] Projects cached:', projectsWithCalcs.length, 'projects');
    } else {
      // Clear localStorage if Supabase is empty
      localStorage.removeItem('lca-projects');
    }
  } catch (err) {
    console.error('[LCA] Error loading user data:', err);
  }
}

// Save calculation to Supabase
async function saveCalculation(report) {
  if (!currentUser) {
    console.error('[saveCalculation] currentUser is null');
    return;
  }
  if (!report) {
    console.error('[saveCalculation] report is null/undefined');
    return;
  }
  if (!supabaseClient) {
    console.error('[saveCalculation] supabaseClient is not initialized');
    return;
  }
  
  try {
    console.log('[saveCalculation] Inserting to Supabase...', { 
      userId: currentUser.id, 
      product: report.product_title 
    });
    const { data, error } = await supabaseClient.from('user_history').insert({
      user_id: currentUser.id,
      product_title: report.product_title,
      functional_unit: report.functional_unit,
      total_co2eq: report.total_co2eq,
      report_data: report
    });
    if (error) {
      console.error('[saveCalculation] Supabase insert error:', error);
    } else {
      console.log('[saveCalculation] Successfully saved to Supabase');
    }
  } catch (err) {
    console.error('[saveCalculation] Error saving calculation:', err);
  }
}

// Save project to Supabase
async function saveProject(projectName) {
  if (!currentUser) return null;
  
  try {
    const { data, error } = await supabaseClient.from('user_projects').insert({
      user_id: currentUser.id,
      name: projectName
    }).select().single();
    
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('Error saving project:', err);
    return null;
  }
}

// Save calculation to project
async function saveToProject(projectId, report) {
  console.log('[saveToProject] called with:', { projectId, currentUser: !!currentUser, reportDefined: report !== undefined, reportType: typeof report });

  if (!currentUser) {
    console.warn('[saveToProject] Aborted: currentUser is not set');
    return;
  }
  if (!projectId && projectId !== 0) {
    console.warn('[saveToProject] Aborted: projectId is invalid', projectId);
    return;
  }
  if (report === undefined || report === null) {
    console.warn('[saveToProject] Aborted: report is undefined/null');
    return;
  }

  const payload = {
    project_id: projectId,
    user_id: currentUser.id,
    report_data: report
  };
  console.log('[saveToProject] Inserting into project_calculations:', payload);

  try {
    const { data, error } = await supabaseClient.from('project_calculations').insert(payload).select();
    if (error) {
      console.error('[saveToProject] Supabase insert error:', error);
    } else {
      console.log('[saveToProject] Insert succeeded, returned rows:', data);
    }
  } catch (err) {
    console.error('[saveToProject] Exception during insert:', err);
  }
}

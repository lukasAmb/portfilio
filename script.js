// ===== Supabase config =====
const SUPABASE_URL = 'https://zazmvrzfwsrhvhekwixp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inphem12cnpmd3NyaHZoZWt3aXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1OTE3NTksImV4cCI6MjA3MDE2Nzc1OX0.N4W4dBROpsHf1cn3-FQKhCGWEAZ8VzCSp28XTl_gXmg';

// Use the global supabase object provided by the CDN, create a client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Admin username convenience (you can change)
const ADMIN_USERNAME = 'ambrizas';
const ADMIN_EMAIL_SUFFIX = '@example.com'; // username -> username@example.com

// ===== Elements =====
const projectsDiv = document.getElementById('projects');
const projectsSection = document.getElementById('projects-section');
const loginSection = document.getElementById('login-section');
const adminSection = document.getElementById('admin-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const adminForm = document.getElementById('admin-form');
const adminLoginBtn = document.getElementById('admin-login-btn');
const cancelLoginBtn = document.getElementById('cancel-login');

// ===== Load projects =====
async function loadProjects() {
  projectsDiv.innerHTML = 'Loading projects...';
  const { data: projects, error } = await supabaseClient
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading projects:', error);
    projectsDiv.innerHTML = 'Failed to load projects.';
    return;
  }

  if (!projects || projects.length === 0) {
    projectsDiv.innerHTML = 'No projects yet.';
    return;
  }

  projectsDiv.innerHTML = '';
  projects.forEach(proj => {
    const div = document.createElement('div');
    div.className = 'project';
    div.innerHTML = `
      <img src="${proj.image_url}" alt="${proj.title}" />
      <div class="project-info">
        <h3>${escapeHtml(proj.title)}</h3>
        <p>${escapeHtml(proj.description)}</p>
        <a href="${escapeAttr(proj.link)}" target="_blank" rel="noopener">View Project</a>
      </div>
    `;
    projectsDiv.appendChild(div);
  });
}

// Small helpers to avoid naive HTML injection if inputs are weird
function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
function escapeAttr(str = '') {
  return String(str).replaceAll('"', '&quot;');
}

// ===== Auth & UI control =====
async function checkUser() {
  const { data } = await supabaseClient.auth.getUser();
  const user = data?.user ?? null;

  if (user) {
    // Logged in
    loginSection.style.display = 'none';
    projectsSection.style.display = 'none';
    adminSection.style.display = 'block';
    adminLoginBtn.style.display = 'none';
  } else {
    // Logged out
    adminSection.style.display = 'none';
    loginSection.style.display = 'none';
    projectsSection.style.display = 'block';
    adminLoginBtn.style.display = 'block';
  }
}

function showLogin() {
  loginError.textContent = '';
  loginSection.style.display = 'block';
  projectsSection.style.display = 'none';
  adminSection.style.display = 'none';
  adminLoginBtn.style.display = 'none';
}
function showProjects() {
  loginSection.style.display = 'none';
  adminSection.style.display = 'none';
  projectsSection.style.display = 'block';
  adminLoginBtn.style.display = 'block';
}

// ===== Login handler (accepts "ambrizas" or full email) =====
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';

  let emailInput = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!emailInput || !password) {
    loginError.textContent = 'Enter username/email and password.';
    return;
  }

  // If user typed a short username (no @), convert to email
  if (!emailInput.includes('@')) {
    emailInput = `${emailInput}${ADMIN_EMAIL_SUFFIX}`;
  }

  // Try sign in
  let { error } = await supabaseClient.auth.signInWithPassword({ email: emailInput, password });

  // If sign-in failed and the input is the admin username's email, try to auto-create (helpful first-time)
  if (error) {
    // Only auto-create for the admin account (prevents open signups via this fallback)
    if (emailInput.toLowerCase() === `${ADMIN_USERNAME}${ADMIN_EMAIL_SUFFIX}`) {
      const { error: signUpError } = await supabaseClient.auth.signUp({ email: emailInput, password });
      if (signUpError) {
        loginError.textContent = 'Login failed: ' + signUpError.message;
        return;
      }
      // After signup, sign in
      const { error: signInAfter } = await supabaseClient.auth.signInWithPassword({ email: emailInput, password });
      if (signInAfter) {
        loginError.textContent = 'Login failed after signup: ' + signInAfter.message;
        return;
      }
    } else {
      loginError.textContent = 'Login failed: ' + error.message;
      return;
    }
  }

  // Success
  await checkUser();
  await loadProjects();
});

// ===== Logout =====
logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  showProjects();
  await loadProjects();
});

// ===== Admin / Cancel buttons =====
adminLoginBtn.addEventListener('click', () => showLogin());
cancelLoginBtn.addEventListener('click', () => showProjects());

// ===== Admin upload form =====
adminForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const link = document.getElementById('link').value.trim();
  const imageFile = document.getElementById('image').files[0];

  if (!title || !description || !link || !imageFile) {
    alert('Please fill all fields and select an image.');
    return;
  }

  // Upload image to Storage
  const fileExt = imageFile.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = fileName;

  const { data: uploadData, error: uploadError } = await supabaseClient.storage
    .from('project-images')
    .upload(filePath, imageFile, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    alert('Error uploading image: ' + uploadError.message);
    return;
  }

  // Get public URL
  const { data: publicUrlData, error: urlError } = supabaseClient.storage
    .from('project-images')
    .getPublicUrl(filePath);

  if (urlError) {
    alert('Error getting image URL: ' + urlError.message);
    return;
  }

  const publicUrl = publicUrlData.publicUrl;

  // Insert project into DB
  const { error: insertError } = await supabaseClient
    .from('projects')
    .insert([{
      title,
      description,
      link,
      image_url: publicUrl
    }]);

  if (insertError) {
    alert('Error saving project: ' + insertError.message);
    return;
  }

  // Reset & reload
  adminForm.reset();
  await loadProjects();
  alert('Project uploaded!');
});

// ===== Init =====
(async () => {
  await checkUser();
  await loadProjects();
})();

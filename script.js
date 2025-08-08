// =========================
// Supabase credentials
// =========================
const { createClient } = supabase;
const SUPABASE_URL = 'https://zazmvrzfwsrhvhekwixp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inphem12cnpmd3NyaHZoZWt3aXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1OTE3NTksImV4cCI6MjA3MDE2Nzc1OX0.N4W4dBROpsHf1cn3-FQKhCGWEAZ8VzCSp28XTl_gXmg';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =========================
// Elements
// =========================
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

// =========================
// Load projects
// =========================
async function loadProjects() {
  projectsDiv.innerHTML = 'Loading projects...';
  const { data: projects, error } = await supabaseClient
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    projectsDiv.innerHTML = 'Failed to load projects.';
    console.error(error);
    return;
  }

  if (!projects.length) {
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
        <h3>${proj.title}</h3>
        <p>${proj.description}</p>
        <a href="${proj.link}" target="_blank" rel="noopener">View Project</a>
      </div>
    `;
    projectsDiv.appendChild(div);
  });
}

// =========================
// Check logged-in user
// =========================
async function checkUser() {
  const { data: { user } } = await supabaseClient.auth.getUser();

  if (user) {
    loginSection.style.display = 'none';
    projectsSection.style.display = 'none';
    adminSection.style.display = 'block';
    adminLoginBtn.style.display = 'none';
  } else {
    adminSection.style.display = 'none';
    loginSection.style.display = 'none';
    projectsSection.style.display = 'block';
    adminLoginBtn.style.display = 'block';
  }
}

// =========================
// Show login form
// =========================
function showLogin() {
  loginError.textContent = '';
  loginSection.style.display = 'block';
  projectsSection.style.display = 'none';
  adminSection.style.display = 'none';
  adminLoginBtn.style.display = 'none';
}

// Show projects
function showProjects() {
  loginSection.style.display = 'none';
  adminSection.style.display = 'none';
  projectsSection.style.display = 'block';
  adminLoginBtn.style.display = 'block';
}

// =========================
// Login form submit
// =========================
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  loginError.textContent = '';

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value.trim();

  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    loginError.textContent = 'Login failed: ' + error.message;
    return;
  }

  await checkUser();
  loadProjects();
});

// Logout button
logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  showProjects();
  loadProjects();
});

// Admin login button
adminLoginBtn.addEventListener('click', () => {
  showLogin();
});

// Cancel login button
cancelLoginBtn.addEventListener('click', () => {
  showProjects();
});

// =========================
// Admin form submit (upload project)
// =========================
adminForm.addEventListener('submit', async e => {
  e.preventDefault();

  const title = document.getElementById('title').value.trim();
  const description = document.getElementById('description').value.trim();
  const link = document.getElementById('link').value.trim();
  const imageFile = document.getElementById('image').files[0];

  if (!title || !description || !link || !imageFile) {
    alert('Please fill all fields and select an image.');
    return;
  }

  // Upload image
  const fileExt = imageFile.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabaseClient.storage
    .from('project-images')
    .upload(filePath, imageFile);

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

  // Save project to DB
  const { error: insertError } = await supabaseClient
    .from('projects')
    .insert({
      title,
      description,
      link,
      image_url: publicUrlData.publicUrl
    });

  if (insertError) {
    alert('Error saving project: ' + insertError.message);
    return;
  }

  // Reset form & reload
  adminForm.reset();
  loadProjects();
});

// =========================
// Init
// =========================
(async () => {
  await checkUser();
  await loadProjects();
})();

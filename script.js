// =============================
// Supabase Init
// =============================
const SUPABASE_URL = 'https://zazmvrzfwsrhvhekwixp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inphem12cnpmd3NyaHZoZWt3aXhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1OTE3NTksImV4cCI6MjA3MDE2Nzc1OX0.N4W4dBROpsHf1cn3-FQKhCGWEAZ8VzCSp28XTl_gXmg';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =============================
// DOM Elements
// =============================
const projectsContainer = document.getElementById('projects');
const adminLoginBtn = document.getElementById('admin-login-btn');
const loginSection = document.getElementById('login-section');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const cancelLoginBtn = document.getElementById('cancel-login');
const adminSection = document.getElementById('admin-section');
const adminForm = document.getElementById('admin-form');
const logoutBtn = document.getElementById('logout-btn');

// =============================
// Show all projects
// =============================
async function loadProjects() {
  projectsContainer.innerHTML = 'Loading...';
  const { data, error } = await supabaseClient.from('projects').select('*');
  if (error) {
    projectsContainer.innerHTML = 'Error loading projects';
    console.error(error);
    return;
  }
  projectsContainer.innerHTML = '';
  data.forEach(proj => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.innerHTML = `
      <img src="${proj.image_url}" alt="${proj.title}">
      <h3>${proj.title}</h3>
      <p>${proj.description}</p>
      <a href="${proj.link}" target="_blank">View Project</a>
    `;
    projectsContainer.appendChild(card);
  });
}

// =============================
// Event Listeners
// =============================
adminLoginBtn.addEventListener('click', () => {
  loginSection.style.display = 'block';
  document.getElementById('projects-section').style.display = 'none';
});

cancelLoginBtn.addEventListener('click', () => {
  loginSection.style.display = 'none';
  document.getElementById('projects-section').style.display = 'block';
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginError.textContent = error.message;
    return;
  }
  
  loginSection.style.display = 'none';
  adminSection.style.display = 'block';
});

logoutBtn.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
  adminSection.style.display = 'none';
  document.getElementById('projects-section').style.display = 'block';
});

// =============================
// Handle Admin Upload
// =============================
adminForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const title = document.getElementById('title').value;
  const description = document.getElementById('description').value;
  const link = document.getElementById('link').value;
  const imageFile = document.getElementById('image').files[0];

  // Upload image to storage
  const { data: imgData, error: imgError } = await supabaseClient
    .storage
    .from('images')
    .upload(`projects/${Date.now()}_${imageFile.name}`, imageFile);

  if (imgError) {
    console.error(imgError);
    return;
  }

  const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/images/${imgData.path}`;

  // Insert into database
  const { error: dbError } = await supabaseClient.from('projects').insert([
    { title, description, link, image_url: imageUrl }
  ]);

  if (dbError) {
    console.error(dbError);
    return;
  }

  alert('Project uploaded!');
  adminForm.reset();
  loadProjects();
});

// =============================
// Init
// =============================
loadProjects();

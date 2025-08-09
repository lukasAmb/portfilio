// ======= CONFIGURE YOUR SUPABASE =======
const SUPABASE_URL = "https://YOUR-PROJECT-URL.supabase.co";
const SUPABASE_KEY = "YOUR-ANON-KEY"; // Use anon public key
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ======= DOM ELEMENTS =======
const projectsDiv = document.getElementById("projects");
const adminLoginBtn = document.getElementById("admin-login-btn");
const loginSection = document.getElementById("login-section");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const cancelLoginBtn = document.getElementById("cancel-login");

const adminSection = document.getElementById("admin-section");
const adminForm = document.getElementById("admin-form");
const logoutBtn = document.getElementById("logout-btn");

// ======= LOAD PROJECTS =======
async function loadProjects() {
  projectsDiv.innerHTML = "<p>Loading projects...</p>";

  const { data, error } = await supabaseClient
    .from("projects")
    .select("*")
    .order("id", { ascending: false });

  if (error) {
    console.error(error);
    projectsDiv.innerHTML = "<p>Error loading projects.</p>";
    return;
  }

  if (data.length === 0) {
    projectsDiv.innerHTML = "<p>No projects yet.</p>";
    return;
  }

  projectsDiv.innerHTML = "";
  data.forEach(project => {
    const projectEl = document.createElement("div");
    projectEl.classList.add("project");

    projectEl.innerHTML = `
      <img src="${project.image_url}" alt="${project.title}" />
      <div class="project-info">
        <h3>${project.title}</h3>
        <p>${project.description}</p>
        <a href="${project.link}" target="_blank">View Project</a>
      </div>
    `;
    projectsDiv.appendChild(projectEl);
  });
}

// ======= SHOW LOGIN FORM =======
adminLoginBtn.addEventListener("click", () => {
  loginSection.style.display = "block";
});

// ======= CANCEL LOGIN =======
cancelLoginBtn.addEventListener("click", () => {
  loginSection.style.display = "none";
  loginError.textContent = "";
});

// ======= LOGIN ADMIN =======
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginError.textContent = "Login failed. Check your credentials.";
    return;
  }

  loginSection.style.display = "none";
  adminSection.style.display = "block";
  adminLoginBtn.style.display = "none";
});

// ======= LOGOUT ADMIN =======
logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  adminSection.style.display = "none";
  adminLoginBtn.style.display = "block";
});

// ======= UPLOAD PROJECT =======
adminForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const link = document.getElementById("link").value;
  const imageFile = document.getElementById("image").files[0];

  // Upload image to storage
  const filePath = `${Date.now()}_${imageFile.name}`;
  const { data: imgData, error: imgError } = await supabaseClient
    .storage
    .from("project-images")
    .upload(filePath, imageFile);

  if (imgError) {
    alert("Image upload failed.");
    console.error(imgError);
    return;
  }

  const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/project-images/${filePath}`;

  // Insert into database
  const { error } = await supabaseClient
    .from("projects")
    .insert([{ title, description, link, image_url: imageUrl }]);

  if (error) {
    alert("Project upload failed.");
    console.error(error);
    return;
  }

  alert("Project uploaded!");
  adminForm.reset();
  loadProjects();
});

// ======= ON PAGE LOAD =======
loadProjects();


import { supabase } from "../supabase.js";

const message = document.getElementById("dashboardMessage");
const logoutButton = document.getElementById("logoutButton");

// Memeriksa login dan hak akses admin
async function checkAdmin() {
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError || !sessionData.session) {
    window.location.href = "login.html";
    return false;
  }

  const { data, error } = await supabase.rpc("is_admin");

  if (error || data !== true) {
    message.textContent = "Akun tidak memiliki akses administrator.";
    await supabase.auth.signOut();
    window.location.href = "login.html";
    return false;
  }

  return true;
}

// Mengambil jumlah data dari database
async function loadStatistics() {
  message.textContent = "";

  const results = await Promise.all([
    supabase
      .from("templates")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("categories")
      .select("*", { count: "exact", head: true }),

    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
  ]);

  const [templates, categories, orders] = results;

  document.getElementById("totalTemplates").textContent =
    templates.error ? "-" : templates.count;

  document.getElementById("totalCategories").textContent =
    categories.error ? "-" : categories.count;

  document.getElementById("totalOrders").textContent =
    orders.error ? "-" : orders.count;

    const tableNames = ["templates", "categories", "orders"];

    const errors = results
      .map((result, index) => {
        if (result.error) {
          return tableNames[index] + ": " + result.error.message;
        }
        return null;
      })
      .filter(Boolean);

  if (errors.length) {
    message.textContent =
      "Sebagian statistik belum dapat dimuat: " + errors.join(" | ");
    console.error("Kesalahan statistik:", errors);
  }
}

// Tombol logout
logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  logoutButton.textContent = "Keluar...";

  const { error } = await supabase.auth.signOut();

  if (error) {
    message.textContent = "Gagal logout: " + error.message;
    logoutButton.disabled = false;
    logoutButton.textContent = "Logout";
    return;
  }

  window.location.href = "login.html";
});

// Menjalankan dashboard
async function initDashboard() {
  try {
    const allowed = await checkAdmin();

    if (!allowed) return;

    await loadStatistics();

  } catch (error) {
    console.error(error);
    message.textContent = "Terjadi kesalahan: " + error.message;
  }
}

initDashboard();

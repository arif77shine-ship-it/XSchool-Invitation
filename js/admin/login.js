
import { supabase } from "../supabase.js";

const loginForm = document.getElementById("loginForm");
const loginButton = document.getElementById("loginButton");
const loginMessage = document.getElementById("loginMessage");

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  loginButton.disabled = true;
  loginButton.textContent = "MEMERIKSA...";
  loginMessage.textContent = "";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    const { data: adminStatus, error: adminError } =
      await supabase.rpc("is_admin");

    if (adminError || adminStatus !== true) {
      await supabase.auth.signOut();
      throw new Error("Akun ini belum terdaftar sebagai administrator.");
    }

    loginMessage.style.color = "#72d69a";
    loginMessage.textContent = "Login berhasil. Membuka dashboard...";

    window.location.href = "dashboard.html";

  } catch (error) {
    loginMessage.style.color = "#ff8585";
    loginMessage.textContent = error.message;

  } finally {
    loginButton.disabled = false;
    loginButton.textContent = "LOGIN ADMIN";
  }
});


import { supabase } from "./supabase.js";

// ======================================
// ELEMEN WEBSITE
// ======================================

const categoryList = document.getElementById("categoryList");
const templateGrid = document.getElementById("templateGrid");
const loading = document.getElementById("loading");
const emptyState = document.getElementById("emptyState");

const orderModal = document.getElementById("orderModal");
const orderForm = document.getElementById("orderForm");
const closeModal = document.getElementById("closeModal");
const formMessage = document.getElementById("formMessage");

let allTemplates = [];
let activeCategory = "all";

// ======================================
// FORMAT HARGA
// ======================================

function formatPrice(price) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(price || 0);
}

// ======================================
// AMANKAN TEKS HTML
// ======================================

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

// ======================================
// VALIDASI LINK
// ======================================

function safeURL(value) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol)
      ? url.href
      : "";
  } catch {
    return "";
  }
}

// ======================================
// AMBIL KATEGORI
// ======================================

async function loadCategories() {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name");

  if (error) {
    throw new Error("Gagal mengambil kategori: " + error.message);
  }

  categoryList.innerHTML = `
    <button class="category-btn active"
      data-category="all">Semua</button>
  `;

  data.forEach(category => {
    const button = document.createElement("button");
    button.className = "category-btn";
    button.dataset.category = category.slug;
    button.textContent = category.name;
    categoryList.appendChild(button);
  });
}

// ======================================
// AMBIL TEMPLATE DARI DATABASE
// ======================================

async function loadTemplates() {
  const { data, error } = await supabase
    .from("templates")
    .select(`
      id,
      name,
      description,
      price,
      image_url,
      demo_url,
      is_premium,
      categories (
        name,
        slug
      )
    `)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Gagal mengambil template: " + error.message);
  }

  allTemplates = data || [];
  renderTemplates();
}

// ======================================
// TAMPILKAN TEMPLATE
// ======================================

function renderTemplates() {
  const filtered = activeCategory === "all"
    ? allTemplates
    : allTemplates.filter(item =>
        item.categories?.slug === activeCategory
      );

  templateGrid.innerHTML = "";
  emptyState.hidden = filtered.length > 0;

  filtered.forEach(item => {
    const imageURL = safeURL(item.image_url);
    const demoURL = safeURL(item.demo_url);

    const card = document.createElement("article");
    card.className = "template-card";

    card.innerHTML = `
      <img
        class="template-image"
        src="${escapeHTML(imageURL)}"
        alt="${escapeHTML(item.name)}"
        loading="lazy"
      >

      <div class="template-info">
        <p class="template-category">
          ${escapeHTML(item.categories?.name || "Undangan")}
        </p>

        <h3>${escapeHTML(item.name)}</h3>

        <p class="template-description">
          ${escapeHTML(item.description || "")}
        </p>

        <p class="template-price">
          ${formatPrice(item.price)}
        </p>

        <div class="template-actions">
          ${
            demoURL
              ? `<a class="btn-outline demo-link"
                    href="${escapeHTML(demoURL)}"
                    target="_blank"
                    rel="noopener noreferrer">LIHAT DEMO</a>`
              : `<span class="btn-outline">DEMO SEGERA</span>`
          }

          <button class="btn-outline order-button"
            type="button">PESAN</button>
        </div>
      </div>
    `;

    const image = card.querySelector(".template-image");

    image.addEventListener("error", () => {
      image.src = "https://placehold.co/600x750/171717/c9a45c?text=Luxury+Invitation";
    }, { once: true });

    card.querySelector(".order-button").addEventListener("click", () => {
      openOrderModal(item);
    });

    templateGrid.appendChild(card);
  });
}

// ======================================
// FILTER KATEGORI
// ======================================

categoryList.addEventListener("click", event => {
  const button = event.target.closest(".category-btn");
  if (!button) return;

  activeCategory = button.dataset.category;

  categoryList.querySelectorAll(".category-btn")
    .forEach(btn => btn.classList.remove("active"));

  button.classList.add("active");
  renderTemplates();
});

// ======================================
// MODAL PEMESANAN
// ======================================

function openOrderModal(template) {
  document.getElementById("orderTemplateId").value = template.id;
  document.getElementById("orderTemplateName").value = template.name;
  document.getElementById("orderPrice").value = template.price || 0;

  document.getElementById("selectedTemplate").textContent =
    `Template: ${template.name} | ${formatPrice(template.price)}`;

  formMessage.textContent = "";
  orderModal.classList.add("show");
  orderModal.setAttribute("aria-hidden", "false");
}

function hideOrderModal() {
  orderModal.classList.remove("show");
  orderModal.setAttribute("aria-hidden", "true");
}

closeModal.addEventListener("click", hideOrderModal);

orderModal.addEventListener("click", event => {
  if (event.target === orderModal) hideOrderModal();
});

// ======================================
// SIMPAN PESANAN KE DATABASE
// ======================================

orderForm.addEventListener("submit", async event => {
  event.preventDefault();

  const submitButton = document.getElementById("submitOrder");
  submitButton.disabled = true;
  submitButton.textContent = "MENYIMPAN...";

  formMessage.textContent = "";

  const templateId = document.getElementById("orderTemplateId").value;
  const templateName = document.getElementById("orderTemplateName").value;
  const price = Number(document.getElementById("orderPrice").value);

  const customerName = document.getElementById("customerName").value.trim();
  const customerPhone = document.getElementById("customerPhone").value.trim();
  const eventDate = document.getElementById("eventDate").value || null;
  const notes = document.getElementById("orderNotes").value.trim();

  try {
    const { error } = await supabase
      .from("orders")
      .insert({
        customer_name: customerName,
        customer_phone: customerPhone,
        template_id: templateId,
        template_name: templateName,
        price: price,
        event_date: eventDate,
        notes: notes,
        status: "baru"
      });

    if (error) throw error;

    formMessage.textContent =
      "Pesanan berhasil disimpan. Terima kasih telah memesan!";

    orderForm.reset();

    setTimeout(() => {
      hideOrderModal();
    }, 1800);

  } catch (error) {
    console.error("Order error:", error);
    formMessage.textContent =
      "Pesanan belum berhasil disimpan. Periksa koneksi atau pengaturan database.";
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "KIRIM PESANAN";
  }
});

// ======================================
// MENU MOBILE
// ======================================

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

menuToggle.addEventListener("click", () => {
  navLinks.classList.toggle("open");
});

navLinks.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
  });
});

// ======================================
// JALANKAN WEBSITE
// ======================================

async function initWebsite() {
  try {
    loading.hidden = false;
    templateGrid.innerHTML = "";

    await loadCategories();
    await loadTemplates();

  } catch (error) {
    console.error(error);
    loading.textContent =
      "Koleksi belum dapat dimuat. Periksa konfigurasi Supabase dan database.";
  } finally {
    loading.hidden = true;
  }
}

initWebsite();

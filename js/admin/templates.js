
import { supabase } from "../supabase.js";

// =====================================
// 1. ELEMEN HTML
// =====================================

const templateForm = document.getElementById("templateForm");
const templateName = document.getElementById("templateName");
const categoryId = document.getElementById("categoryId");
const description = document.getElementById("description");
const price = document.getElementById("price");
const templateImage = document.getElementById("templateImage");
const imagePreview = document.getElementById("imagePreview");
const demoUrl = document.getElementById("demoUrl");
const isPremium = document.getElementById("isPremium");
const saveButton = document.getElementById("saveButton");
const formMessage = document.getElementById("formMessage");
const templateList = document.getElementById("templateList");

const BUCKET_NAME = "template-images";

let categoriesCache = [];
let editingTemplateId = null;
let editingImageUrl = "";
let previewUrl = null;


// =====================================
// 2. TOMBOL BATAL EDIT
// Dibuat otomatis oleh JavaScript
// =====================================

const cancelButton = document.createElement("button");

cancelButton.type = "button";
cancelButton.textContent = "Batal Edit";
cancelButton.style.display = "none";
cancelButton.style.marginLeft = "10px";

saveButton.insertAdjacentElement("afterend", cancelButton);


// =====================================
// 3. PESAN NOTIFIKASI
// =====================================

function showMessage(message, isError = false) {
    formMessage.textContent = message;
    formMessage.style.color = isError ? "red" : "green";
}


// =====================================
// 4. PEMERIKSAAN LOGIN
// =====================================

async function checkAdminSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    if (!data.session) {
        throw new Error("Silakan login terlebih dahulu.");
    }

    return data.session;
}


// =====================================
// 5. MENGAMBIL KATEGORI
// =====================================

async function loadCategories() {
    const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

    if (error) throw error;

    categoriesCache = data || [];

    categoryId.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Pilih Kategori";

    categoryId.appendChild(placeholder);

    categoriesCache.forEach(category => {
        const option = document.createElement("option");

        option.value = category.id;
        option.textContent = category.name;

        categoryId.appendChild(option);
    });
}


// =====================================
// 6. PREVIEW GAMBAR
// =====================================

function clearPreview() {
    imagePreview.replaceChildren();

    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
    }
}

function showImagePreview(source) {
    clearPreview();

    const img = document.createElement("img");

    img.src = source;
    img.alt = "Preview template";
    img.style.width = "200px";
    img.style.maxWidth = "100%";
    img.style.borderRadius = "10px";
    img.style.marginTop = "10px";

    imagePreview.appendChild(img);
}

templateImage.addEventListener("change", function () {
    const file = this.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showMessage("File harus berupa gambar.", true);
        this.value = "";
        return;
    }

    if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = null;
    }

    previewUrl = URL.createObjectURL(file);

    showImagePreview(previewUrl);
});


// =====================================
// 7. UPLOAD GAMBAR
// =====================================

async function uploadTemplateImage(file) {
    const extension = file.name.split(".").pop().toLowerCase();

    const allowedExtensions = ["jpg", "jpeg", "png", "webp"];

    if (!allowedExtensions.includes(extension)) {
        throw new Error("Format gambar harus JPG, PNG, atau WEBP.");
    }

    const fileName = `${crypto.randomUUID()}.${extension}`;

    const filePath = `templates/${fileName}`;

    const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false
        });

    if (error) throw error;

    const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

    return {
        imageUrl: data.publicUrl,
        filePath
    };
}


// =====================================
// 8. MENGAMBIL LOKASI FOTO DI STORAGE
// =====================================

function getStoragePath(imageUrl) {
    if (!imageUrl) return null;

    const marker =
        `/storage/v1/object/public/${BUCKET_NAME}/`;

    const position = imageUrl.indexOf(marker);

    if (position === -1) return null;

    return decodeURIComponent(
        imageUrl.substring(position + marker.length)
    );
}


// =====================================
// 9. MENGHAPUS FOTO STORAGE
// =====================================


async function removeStorageImage(imageUrl) {
    console.log("URL gambar:", imageUrl);

    const path = getStoragePath(imageUrl);

    console.log("Lokasi file:", path);

    if (!path) {
        console.warn("Lokasi gambar tidak ditemukan!");
        return;
    }

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([path]);

    console.log("Hasil penghapusan:", data);
    console.log("Error Storage:", error);

    if (error) throw error;
}



// =====================================
// 10. RESET FORM
// =====================================

function resetForm() {
    templateForm.reset();

    editingTemplateId = null;
    editingImageUrl = "";

    templateImage.required = true;

    saveButton.textContent = "Simpan Template";

    cancelButton.style.display = "none";

    clearPreview();
}


// =====================================
// 11. MEMBUKA MODE EDIT
// =====================================

function editTemplate(template) {
    editingTemplateId = template.id;
    editingImageUrl = template.image_url || "";

    templateName.value = template.name;
    categoryId.value = template.category_id || "";
    description.value = template.description || "";
    price.value = template.price || 0;
    demoUrl.value = template.demo_url || "";
    isPremium.checked = Boolean(template.is_premium);

    // Foto tidak wajib dipilih ulang saat edit
    templateImage.required = false;
    templateImage.value = "";

    if (editingImageUrl) {
        showImagePreview(editingImageUrl);
    } else {
        clearPreview();
    }

    saveButton.textContent = "Simpan Perubahan";
    cancelButton.style.display = "inline-block";

    showMessage("Mode edit: " + template.name);

    templateForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


// =====================================
// 12. BATAL EDIT
// =====================================

cancelButton.addEventListener("click", function () {
    resetForm();
    showMessage("Edit dibatalkan.");
});


// =====================================
// 13. MENAMPILKAN DAFTAR TEMPLATE
// =====================================

async function loadTemplates() {
    const { data, error } = await supabase
        .from("templates")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) throw error;

    templateList.replaceChildren();

    if (!data || data.length === 0) {
        templateList.textContent = "Belum ada template.";
        return;
    }

    data.forEach(template => {
        const card = document.createElement("div");

        card.style.border = "1px solid #ddd";
        card.style.borderRadius = "10px";
        card.style.padding = "15px";
        card.style.marginBottom = "15px";

        // Foto
        if (template.image_url) {
            const img = document.createElement("img");

            img.src = template.image_url;
            img.alt = template.name;
            img.style.width = "180px";
            img.style.maxWidth = "100%";
            img.style.borderRadius = "8px";

            card.appendChild(img);
        }

        // Nama
        const title = document.createElement("h3");
        title.textContent = template.name;

        // Kategori
        const category = categoriesCache.find(
            item => item.id === template.category_id
        );

        const categoryText = document.createElement("p");
        categoryText.textContent =
            "Kategori: " + (category?.name || "Tidak diketahui");

        // Harga
        const priceText = document.createElement("p");

        priceText.textContent =
            "Harga: " +
            Number(template.price || 0).toLocaleString("id-ID", {
                style: "currency",
                currency: "IDR",
                maximumFractionDigits: 0
            });

        // Deskripsi
        const descriptionText = document.createElement("p");
        descriptionText.textContent = template.description || "";

        // Premium
        const premiumText = document.createElement("p");

        premiumText.textContent = template.is_premium
            ? "Template Premium"
            : "Template Reguler";

        // Status
        const statusText = document.createElement("p");

        statusText.textContent = template.is_active
            ? "Status: Aktif"
            : "Status: Tidak Aktif";

        card.append(
            title,
            categoryText,
            priceText,
            descriptionText,
            premiumText,
            statusText
        );

        // Demo
        if (template.demo_url) {
            const demoLink = document.createElement("a");

            demoLink.href = template.demo_url;
            demoLink.target = "_blank";
            demoLink.rel = "noopener noreferrer";
            demoLink.textContent = "Lihat Demo";

            card.appendChild(demoLink);
        }

        // Tombol Edit
        const editButton = document.createElement("button");

        editButton.type = "button";
        editButton.textContent = "Edit";
        editButton.style.marginRight = "10px";

        editButton.addEventListener("click", function () {
            editTemplate(template);
        });

        // Tombol Hapus
        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.textContent = "Hapus";
        deleteButton.style.background = "#b91c1c";
        deleteButton.style.color = "white";

        deleteButton.addEventListener("click", function () {
            deleteTemplate(template);
        });

        card.append(editButton, deleteButton);

        templateList.appendChild(card);
    });
}


// =====================================
// 14. MENYIMPAN TEMPLATE BARU / EDIT
// =====================================

templateForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    saveButton.disabled = true;

    let uploadedFilePath = null;
    let databaseSaved = false;

    const isEditing = Boolean(editingTemplateId);
    const oldImageUrl = editingImageUrl;

    try {
        await checkAdminSession();

        const file = templateImage.files[0];

        let newImageUrl = oldImageUrl;

        // Upload jika ada foto baru
        if (file) {
            const uploaded = await uploadTemplateImage(file);

            uploadedFilePath = uploaded.filePath;
            newImageUrl = uploaded.imageUrl;
        }

        if (!isEditing && !file) {
            throw new Error("Silakan pilih gambar template.");
        }

        const templateData = {
            name: templateName.value.trim(),
            category_id: categoryId.value,
            description: description.value.trim(),
            price: Number(price.value),
            image_url: newImageUrl,
            demo_url: demoUrl.value.trim(),
            is_premium: isPremium.checked
        };

        let result;

        if (isEditing) {
            result = await supabase
                .from("templates")
                .update(templateData)
                .eq("id", editingTemplateId);
        } else {
            result = await supabase
                .from("templates")
                .insert(templateData);
        }

        if (result.error) throw result.error;

        databaseSaved = true;

        let message = isEditing
            ? "Template berhasil diperbarui!"
            : "Template berhasil disimpan!";

        // Hapus foto lama jika diganti
        if (
            isEditing &&
            file &&
            oldImageUrl &&
            oldImageUrl !== newImageUrl
        ) {
            try {
                await removeStorageImage(oldImageUrl);
            } catch (storageError) {
                console.error("Foto lama belum terhapus:", storageError);

                message += " Namun foto lama belum bisa dihapus dari Storage.";
            }
        }

        resetForm();

        showMessage(message);

        await loadTemplates();

    } catch (error) {
        console.error("Gagal menyimpan template:", error);
        console.error("Detail error:", JSON.stringify(error, null, 2));

        // Bersihkan foto baru jika database gagal menyimpan
        if (uploadedFilePath && !databaseSaved) {
            const { error: removeError } = await supabase.storage
                .from(BUCKET_NAME)
                .remove([uploadedFilePath]);

            if (removeError) {
                console.error("Gagal membersihkan foto baru:", removeError);
            }
        }

        showMessage(error.message || "Terjadi kesalahan.", true);

    } finally {
        saveButton.disabled = false;
    }
});


// =====================================
// 15. MENGHAPUS TEMPLATE
// =====================================

async function deleteTemplate(template) {
    const confirmation = confirm(
        `Yakin ingin menghapus template "${template.name}"?`
    );

    if (!confirmation) return;

    try {
        await checkAdminSession();

        const { error } = await supabase
            .from("templates")
            .delete()
            .eq("id", template.id);

        if (error) throw error;

        let message = "Template berhasil dihapus dari database.";

        // Hapus foto dari Storage
        try {
            await removeStorageImage(template.image_url);
        } catch (storageError) {
            console.error("Foto belum terhapus:", storageError);

            message += " Foto di Storage belum bisa dihapus.";
        }

        showMessage(message);

        await loadTemplates();

    } catch (error) {
        console.error("Gagal menghapus template:", error);

        showMessage(error.message || "Gagal menghapus template.", true);
    }
}


// =====================================
// 16. MEMULAI HALAMAN
// =====================================

async function initTemplates() {
    try {
        await checkAdminSession();

        await loadCategories();

        await loadTemplates();

        console.log("Manajemen template berhasil dimuat.");

    } catch (error) {
        console.error("Gagal memuat halaman:", error);

        showMessage(error.message || "Gagal memuat data.", true);
    }
}

initTemplates();


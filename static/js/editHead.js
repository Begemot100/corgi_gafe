// Открытие и закрытие модального окна
function openEditModal() {
    document.getElementById("editCompanyModal").style.display = "flex";
}

function closeEditModal() {
    document.getElementById("editCompanyModal").style.display = "none";
}

// Открытие модального окна по кнопке "Editar perfil"
document.querySelector(".edit-profile-btn").addEventListener("click", openEditModal);

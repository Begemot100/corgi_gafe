// modal-handling.js

let selectedLogId = null;
let currentEmployeeId = null;

// Открытие основного модального окна
// modal-handling.js

// Открытие модального окна с опциями
function toggleModal(event) {
    const modal = document.getElementById('modal');  // Основное модальное окно с опциями
    if (!modal) {
        console.error("Modal element not found!");
        return;
    }

    // Закрытие модального окна, если оно уже открыто
    if (modal.style.display === 'block') {
        modal.style.display = 'none';
    } else {
        const buttonRect = event.target.getBoundingClientRect();  // Получаем координаты иконки
        // Устанавливаем позицию модального окна относительно иконки
        modal.style.top = `${buttonRect.bottom + window.scrollY}px`;
        modal.style.left = `${buttonRect.left + window.scrollX}px`;
        modal.style.display = 'block';  // Открываем модальное окно
    }
}

// Закрытие модального окна
function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'none';
    }
}


// Открытие модального окна редактирования времени
function openEditModal(employeeId) {
    const editModal = document.getElementById('editTimeModal');
    const optionsModal = document.getElementById('modal');

    if (!editModal) return;

    if (optionsModal && optionsModal.style.display === 'block') {
        optionsModal.style.display = 'none';
    }

    editModal.style.display = 'block';
    currentEmployeeId = employeeId;
}

// Закрытие модального окна редактирования времени
function closeEditModal() {
    const editModal = document.getElementById('editTimeModal');
    if (editModal) {
        editModal.style.display = 'none';
    }
}

// Закрытие модальных окон при клике вне области
window.addEventListener('click', function (event) {
    const modal = document.getElementById('modal');
    const editTimeModal = document.getElementById('editTimeModal');

    if (!event.target.closest('.modal-content')) {
        if (modal && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
        if (editTimeModal && editTimeModal.style.display === 'block') {
            editTimeModal.style.display = 'none';
        }
    }
});

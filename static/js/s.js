// Получаем элементы
const openRegisterModal = document.getElementById('openRegisterModal');
const registerModal = document.getElementById('registerModal');
const cancelButton = document.getElementById('cancelButton');

// Открыть модальное окно
openRegisterModal.addEventListener('click', () => {
    registerModal.style.display = 'flex';
});

// Закрыть модальное окно
cancelButton.addEventListener('click', () => {
    registerModal.style.display = 'none';
});

// Закрытие при клике вне модального окна
window.addEventListener('click', (event) => {
    if (event.target === registerModal) {
        registerModal.style.display = 'none';
    }
});

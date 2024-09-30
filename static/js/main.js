// Логика для открытия модального окна при нажатии на "Edit"
document.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', (event) => {
        const employeeId = event.target.dataset.id; // Получаем ID сотрудника из data-атрибута
        const firstName = event.target.dataset.firstName;
        const lastName = event.target.dataset.lastName;
        const phone = event.target.dataset.phone;
        const position = event.target.dataset.position;
        const startDate = event.target.dataset.startDate;
        const endDate = event.target.dataset.endDate;
        const section = event.target.dataset.section;

        // Открываем модальное окно с текущими данными
        modal.style.display = 'flex';
        modalTitle.textContent = 'Редактировать сотрудника';
        modalSubmitBtn.textContent = 'Сохранить изменения';

        // Заполняем поля формы текущими данными
        document.getElementById('first_name').value = firstName || ''; // Проверяем, чтобы не было undefined
        document.getElementById('last_name').value = lastName || '';
        document.getElementById('phone').value = phone || '';
        document.getElementById('position').value = position || '';
        document.getElementById('start_date').value = startDate || '';
        document.getElementById('end_date').value = endDate || '';
        document.getElementById('section').value = section || 'Кухня'; // Default значение

        // Изменяем действие формы для отправки данных на обновление
        employeeForm.action = `/edit/${employeeId}`;
    });
});

// Получаем элементы для работы с модальным окном подтверждения удаления
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const deleteMessage = document.getElementById('delete-message');
let employeeIdToDelete = null;

// Логика для открытия модального окна при нажатии на "Delete"
document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', (event) => {
        employeeIdToDelete = event.target.dataset.id; // Получаем ID сотрудника
        const employeeName = event.target.dataset.name; // Имя сотрудника

        // Открываем модальное окно с сообщением
        deleteModal.style.display = 'flex';
        deleteMessage.textContent = `Вы уверены, что хотите удалить сотрудника ${employeeName}?`;
    });
});

// Логика для подтверждения удаления сотрудника
confirmDeleteBtn.addEventListener('click', () => {
    // Отправляем запрос на сервер для удаления сотрудника
    fetch(`/delete/${employeeIdToDelete}`, {
        method: 'POST', // POST-запрос для удаления
        headers: {
            'Content-Type': 'application/json'
        },
    }).then(response => {
        if (response.ok) {
            // Если сотрудник успешно удален, перезагружаем страницу
            window.location.reload();
        } else {
            console.error('Ошибка при удалении сотрудника');
        }
    });
});

// Закрытие модального окна при нажатии на "x" или кнопку "Отменить"
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        deleteModal.style.display = 'none';
    });
});

// Закрытие модального окна при клике вне его области
window.addEventListener('click', (event) => {
    if (event.target === deleteModal) {
        deleteModal.style.display = 'none';
    }
});

// Получаем элементы для кнопок фильтрации
const filterButtons = document.querySelectorAll('.filter-btn');
const kitchenSection = document.querySelector('.kitchen-section');
const hallSection = document.querySelector('.hall-section');

// Логика переключения видимости секций
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Удаляем активный класс у всех кнопок
        filterButtons.forEach(btn => btn.classList.remove('active'));

        // Добавляем активный класс к нажатой кнопке
        button.classList.add('active');

        // Проверяем, какая кнопка была нажата, и показываем/скрываем секции
        if (button.id === 'show-all') {
            kitchenSection.style.display = 'table';
            hallSection.style.display = 'table';
        } else if (button.id === 'show-hall') {
            kitchenSection.style.display = 'none';
            hallSection.style.display = 'table';
        } else if (button.id === 'show-kitchen') {
            kitchenSection.style.display = 'table';
            hallSection.style.display = 'none';
        }
    });
});

// Получаем элементы для работы с модальным окном
const modal = document.getElementById('modal');
const openModalBtn = document.getElementById('open-modal-btn');
const closeModalBtn = document.querySelector('.close');
const modalTitle = document.getElementById('modal-title');
const modalSubmitBtn = document.getElementById('modal-submit-btn');
const employeeForm = document.getElementById('employee-form');

// Открытие модального окна для добавления нового сотрудника
openModalBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
    modalTitle.textContent = 'Добавить сотрудника';
    modalSubmitBtn.textContent = 'Добавить сотрудника';
    employeeForm.action = "/add"; // Убедитесь, что обработчик маршрута правильный

    // Очищаем поля формы
    document.getElementById('first_name').value = '';
    document.getElementById('last_name').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('position').value = '';
    document.getElementById('start_date').value = '';
    document.getElementById('end_date').value = '';
    document.getElementById('section').value = 'Кухня'; // Default value
});

// Закрытие модального окна при нажатии на "x"
closeModalBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

// Закрытие модального окна при клике вне его области
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Обработка редактирования сотрудника и заполнение формы данными
document.querySelectorAll('.edit-btn').forEach(button => {
    button.addEventListener('click', (event) => {
        document.getElementById('modal-title').textContent = 'Edit Employee';

        // Получение данных сотрудника из data-атрибутов
        const employeeId = event.target.dataset.id;
        const fullName = event.target.dataset.fullName;
        const nie = event.target.dataset.nie;
        const phone = event.target.dataset.phone;
        const position = event.target.dataset.position;
        const startDate = event.target.dataset.startDate;
        const endDate = event.target.dataset.endDate;
        const hoursPerWeek = event.target.dataset.hoursPerWeek;
        const daysPerWeek = event.target.dataset.daysPerWeek;
        const email = event.target.dataset.email;
        const section = event.target.dataset.section;

        // Открытие модального окна
        const modal = document.getElementById('modal');
        modal.style.display = 'flex';

        // Заполнение формы данными сотрудника
        document.getElementById('full_name').value = fullName || '';
        document.getElementById('nie').value = nie || '';
        document.getElementById('phone').value = phone || '';
        document.getElementById('position').value = position || '';
        document.getElementById('start_date').value = startDate || '';
        document.getElementById('end_date').value = endDate || '';
        document.getElementById('hours_per_week').value = hoursPerWeek || '';
        document.getElementById('days_per_week').value = daysPerWeek || '';
        document.getElementById('email').value = email || '';
        document.getElementById('section').value = section || 'Cocina'; // Default to Cocina

        // Установка действия формы для редактирования сотрудника
        document.getElementById('employee-form').action = `/edit/${employeeId}`;
    });
});

// Обработка добавления нового сотрудника
const openModalBtn = document.getElementById('open-modal-btn');
openModalBtn.addEventListener('click', () => {
    const modal = document.getElementById('modal');
    modal.style.display = 'flex'; // Показываем модальное окно

    document.getElementById('modal-title').textContent = 'New Employee';
    document.getElementById('employee-form').action = "/add";

    // Очистка полей формы
    document.getElementById('full_name').value = '';
    document.getElementById('nie').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('position').value = '';
    document.getElementById('start_date').value = '';
    document.getElementById('end_date').value = '';
    document.getElementById('hours_per_week').value = '';
    document.getElementById('days_per_week').value = '';
    document.getElementById('email').value = '';
    document.getElementById('section').value = 'Cocina'; // Default to Cocina
});

// Закрытие модального окна
const closeModalBtn = document.querySelector('.close');
closeModalBtn.addEventListener('click', () => {
    const modal = document.getElementById('modal');
    modal.style.display = 'none'; // Закрываем модальное окно
});

// Закрытие модального окна при клике вне его
window.addEventListener('click', (event) => {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Обработка фильтров сотрудников
const filterButtons = document.querySelectorAll('.filter-btn');
const kitchenSection = document.querySelector('.kitchen-section');
const hallSection = document.querySelector('.hall-section');

// Фильтрация сотрудников
filterButtons.forEach(button => {
    button.addEventListener('click', () => {
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

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

// Обработка выпадения меню действий
document.querySelectorAll('.action-btn').forEach(button => {
    button.addEventListener('click', (event) => {
        const dropdown = event.target.nextElementSibling;
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    });
});

window.addEventListener('click', (event) => {
    if (!event.target.matches('.action-btn')) {
        document.querySelectorAll('.dropdown-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }
});

// Логика для удаления сотрудника
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const deleteMessage = document.getElementById('delete-message');
let employeeIdToDelete = null;

document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', (event) => {
        employeeIdToDelete = event.target.dataset.id;
        const employeeName = event.target.dataset.name;

        // Открыть модальное окно удаления
        deleteModal.style.display = 'flex';
        deleteMessage.textContent = `Are you sure you want to delete ${employeeName}?`;
    });
});

confirmDeleteBtn.addEventListener('click', () => {
    fetch(`/delete/${employeeIdToDelete}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    }).then(response => {
        if (response.ok) {
            window.location.reload();
        } else {
            console.error('Error deleting employee');
        }
    });
});

// Закрытие модальных окон
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
        deleteModal.style.display = 'none';
        modal.style.display = 'none';
    });
});

window.addEventListener('click', (event) => {
    if (event.target === deleteModal || event.target === modal) {
        deleteModal.style.display = 'none';
        modal.style.display = 'none';
    }
});

// Очистка формы при выборе даты
document.querySelectorAll('input[type="date"]').forEach(input => {
    input.addEventListener('change', () => {
        input.blur();
    });
});

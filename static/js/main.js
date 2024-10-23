// Функция для отображения всех сотрудников (Sala и Cocina)
function showAllEmployees() {
    console.log("Функция showAllEmployees вызвана");  // Лог в консоль
    document.getElementById('section-title').textContent = ''; // Убираем заголовок секции
    document.getElementById('sala-employees').style.display = 'block'; // Отображаем сотрудников зала (Sala)
    document.getElementById('cocina-employees').style.display = 'block'; // Отображаем сотрудников кухни (Cocina)
}

// Функция для отображения сотрудников зала (Sala)
function showSalaEmployees() {
    document.getElementById('section-title').textContent = 'Sala'; // Устанавливаем заголовок секции
    document.getElementById('sala-employees').style.display = 'block'; // Показываем Sala
    document.getElementById('cocina-employees').style.display = 'none'; // Скрываем Cocina
}

// Функция для отображения сотрудников кухни (Cocina)
function showCocinaEmployees() {
    document.getElementById('section-title').textContent = 'Cocina'; // Устанавливаем заголовок секции
    document.getElementById('sala-employees').style.display = 'none'; // Скрываем Sala
    document.getElementById('cocina-employees').style.display = 'block'; // Показываем Cocina
}

// Логика фильтрации секций
document.addEventListener('DOMContentLoaded', function() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const sectionTitle = document.getElementById('section-title'); // Заголовок для секции

    // Логика фильтрации секций
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Удаляем класс active у всех кнопок и добавляем только к выбранной
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Получаем ID кнопки для определения фильтра
            const filterType = button.id;

            if (filterType === 'show-all') {
                // Показываем всех сотрудников (и Sala, и Cocina)
                showAllEmployees();
            } else if (filterType === 'show-hall') {
                // Показываем только Sala сотрудников
                showSalaEmployees();
            } else if (filterType === 'show-kitchen') {
                // Показываем только Cocina сотрудников
                showCocinaEmployees();
            }
        });
    });

    // Вызываем функцию отображения всех сотрудников при загрузке страницы
    showAllEmployees(); // По умолчанию показываем всех сотрудников
});

// Function to open the Action Modal for Edit/Delete
function openActionModal(employeeId) {
    const actionModal = document.getElementById('action-modal1');
    actionModal.style.display = 'flex';

    // Attach employee ID to action buttons
    document.getElementById('edit-action').onclick = () => {
        openEditEmployeeModal(employeeId); // Открываем окно редактирования сотрудника
        closeActionModal(); // Закрываем Action Modal
    };
    document.getElementById('delete-action').onclick = () => {
        triggerDelete(employeeId); // Выполняем удаление сотрудника
        closeActionModal(); // Закрываем Action Modal
    };
}

function closeActionModal() {
    const actionModal = document.getElementById('action-modal1');
    actionModal.style.display = 'none';
}

// Function to open modal for editing an existing employee
function openEditEmployeeModal(employeeId) {
    // Fetch employee data from server or use dataset
    fetch(`/get_employee_data/${employeeId}`)
        .then(response => response.json())
        .then(employeeData => {
            // Use the employee data to fill the form
            openModal('Edit Employee', `/edit/${employeeId}`, employeeData);
        })
        .catch(error => console.error('Error fetching employee data:', error));
}

// Function to open the main modal for adding/editing employees
function openModal(title, formAction, employeeData = {}) {
    const modal = document.getElementById('modal'); // Окно редактирования/добавления сотрудника
    modal.style.display = 'flex';
    document.getElementById('modal-title').textContent = title;
    document.getElementById('employee-form').action = formAction;

    // Заполняем поля формы, если данные сотрудника переданы
    document.getElementById('full_name').value = employeeData.fullName || '';
    document.getElementById('nie').value = employeeData.nie || '';
    document.getElementById('phone').value = employeeData.phone || '';
    document.getElementById('position').value = employeeData.position || '';
    document.getElementById('email').value = employeeData.email || '';
    document.getElementById('start_date').value = employeeData.startDate || '';
    document.getElementById('end_date').value = employeeData.endDate || '';
    document.getElementById('section').value = employeeData.section || '';
    document.getElementById('hours_per_week').value = employeeData.hoursPerWeek || '';
    document.getElementById('days_per_week').value = employeeData.daysPerWeek || '';
    document.getElementById('work_start_time').value = employeeData.workStartTime || '';
    document.getElementById('work_end_time').value = employeeData.workEndTime || '';
}

// Function to trigger employee delete
function triggerDelete(employeeId) {
    closeActionModal(); // Закрываем Action Modal
    if (confirm("Are you sure you want to delete this employee?")) {
        fetch(`/delete/${employeeId}`, {
            method: 'POST'
        }).then(response => {
            if (response.ok) {
                window.location.reload(); // Обновляем страницу после успешного удаления
            } else {
                console.error('Error deleting employee');
            }
        });
    }
}

// Attach action modal opening to ellipsis button (троеточие)
document.querySelectorAll('.ellipsis-btn').forEach(button => {
    button.addEventListener('click', (event) => {
        const employeeId = event.target.dataset.id;
        openActionModal(employeeId); // Открываем Action Modal, а не окно редактирования
    });
});

// Open modal for adding a new employee
document.getElementById('open-modal-btn').addEventListener('click', () => {
    openModal('New Employee', '/add');
});

// Close modal
function closeModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
}

document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', closeModal);
});

window.addEventListener('click', (event) => {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        closeModal();
    }
});

// Функция для отправки формы редактирования/добавления сотрудника
document.getElementById('employee-form').addEventListener('submit', function(event) {
    event.preventDefault(); // Отключаем стандартную отправку формы

    const formData = new FormData(this);
    const actionUrl = this.action; // Получаем URL действия из атрибута action формы

    fetch(actionUrl, {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert(data.message);  // Выводим сообщение, если оно есть в ответе
        }

        // Перенаправляем пользователя на страницу админки после успешного обновления
        window.location.href = '/admin';  // Замените '/admin' на нужный URL
    })
    .catch(error => {
        console.error('Ошибка при сохранении данных сотрудника:', error);
        alert('Произошла ошибка. Пожалуйста, попробуйте снова.');
    });
});

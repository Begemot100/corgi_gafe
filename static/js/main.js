document.addEventListener('DOMContentLoaded', function() {

    // Функция для открытия модального окна
    function openModal(title, formAction, employeeData = {}) {
        const modal = document.getElementById('modal');
        modal.style.display = 'flex';
        document.getElementById('modal-title').textContent = title;
        document.getElementById('employee-form').action = formAction;

        // Заполнение полей формы, если предоставлены данные
        document.getElementById('full_name').value = employeeData.fullName || '';
        document.getElementById('nie').value = employeeData.nie || '';
        document.getElementById('phone').value = employeeData.phone || '';
        document.getElementById('position').value = employeeData.position || '';
        document.getElementById('email').value = employeeData.email || '';
    }

    // Открытие модального окна для редактирования сотрудника
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const employeeData = {
                fullName: event.currentTarget.dataset.fullName,
                nie: event.currentTarget.dataset.nie,
                phone: event.currentTarget.dataset.phone,
                position: event.currentTarget.dataset.position,
                email: event.currentTarget.dataset.email
            };
            const employeeId = event.target.dataset.id;
            openModal('Edit Employee', `/edit/${employeeId}`, employeeData);
        });
    });

    // Открытие модального окна для добавления нового сотрудника
    document.getElementById('open-modal-btn').addEventListener('click', () => {
        openModal('New Employee', '/add');
    });

    // Закрытие модального окна
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

    // Обработка фильтрации сотрудников
    const filterButtons = document.querySelectorAll('.filter-btn');
    const employeeCards = document.querySelectorAll('.employee-card');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const filterType = button.id;

            employeeCards.forEach(card => {
                const employeeSection = card.dataset.section;
                if (filterType === 'show-all') {
                    card.style.display = 'block';
                } else if (filterType === 'show-hall') {
                    card.style.display = employeeSection === 'Sala' ? 'block' : 'none';
                } else if (filterType === 'show-kitchen') {
                    card.style.display = employeeSection === 'Cocina' ? 'block' : 'none';
                }
            });
        });
    });

    // Логика для удаления сотрудника с подтверждением
    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    const deleteMessage = document.getElementById('delete-message');
    let employeeIdToDelete = null;

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            employeeIdToDelete = event.target.dataset.id;
            const employeeName = event.target.dataset.name;

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

    // Закрытие модального окна удаления
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', () => {
            deleteModal.style.display = 'none';
            closeModal();
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === deleteModal || event.target === modal) {
            deleteModal.style.display = 'none';
            closeModal();
        }
    });

    // Очистка формы при выборе даты
    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.addEventListener('change', () => {
            input.blur();
        });
    });
});

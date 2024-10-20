document.addEventListener('DOMContentLoaded', function() {
    // Переменные для фильтров
    const filterButtons = document.querySelectorAll('.filter-btn');
    const cocinaEmployees = document.getElementById('cocina-employees');
    const salaEmployees = document.getElementById('sala-employees');
    const sectionTitle = document.querySelector('.section-title'); // Надпись для секции

    // Логика фильтрации секций
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Удаляем класс active у всех кнопок и добавляем только к выбранной
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Получаем ID кнопки для определения фильтра
            const filterType = button.id;

            if (filterType === 'show-all') {
                // Показываем обе секции и возвращаем исходные заголовки
                cocinaEmployees.style.display = 'block';
                salaEmployees.style.display = 'block';
                sectionTitle.textContent = 'Cocina'; // Восстанавливаем исходную надпись
            } else if (filterType === 'show-hall') {
                // Скрываем Cocina, поднимаем Sala и изменяем заголовок
                cocinaEmployees.style.display = 'none';
                salaEmployees.style.display = 'block';
                sectionTitle.textContent = 'Sala'; // Изменяем надпись на "Sala"
            } else if (filterType === 'show-kitchen') {
                // Скрываем Sala, показываем только Cocina и изменяем заголовок
                cocinaEmployees.style.display = 'block';
                salaEmployees.style.display = 'none';
                sectionTitle.textContent = 'Cocina'; // Изменяем надпись на "Cocina"
            }
        });
    });

    // General function to open modal with employee data for add or edit
    function openModal(title, formAction, employeeData = {}) {
        const modal = document.getElementById('modal');
        modal.style.display = 'flex';
        document.getElementById('modal-title').textContent = title;
        document.getElementById('employee-form').action = formAction;

        // Fill form fields if employee data is provided
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

    // Attach open modal function to edit buttons
    document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const employeeId = event.target.dataset.id;
            openEditEmployeeModal(employeeId);
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

    // Function for Action Modal (Edit/Delete)
    document.querySelectorAll('.ellipsis-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const employeeId = event.target.dataset.id;
            openActionModal(employeeId);
        });
    });

    document.querySelectorAll('.cancel-btn').forEach(button => {
        button.addEventListener('click', closeModal);
    });

    // Function to open the Action Modal for Edit/Delete
    function openActionModal(employeeId) {
        const actionModal = document.getElementById('action-modal1');
        actionModal.style.display = 'flex';

        // Attach employee ID to action buttons
        document.getElementById('edit-action').onclick = () => {
            openEditEmployeeModal(employeeId);
            closeActionModal(); // Close the action modal
        };
        document.getElementById('delete-action').onclick = () => {
            triggerDelete(employeeId);
            closeActionModal(); // Close the action modal
        };
    }

    function closeActionModal() {
        const actionModal = document.getElementById('action-modal1');
        actionModal.style.display = 'none';
    }

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', closeActionModal);
    });

    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('action-modal1')) {
            closeActionModal();
        }
    });

    function triggerDelete(employeeId) {
        closeActionModal();
        if (confirm("Are you sure you want to delete this employee?")) {
            fetch(`/delete/${employeeId}`, {
                method: 'POST'
            }).then(response => {
                if (response.ok) {
                    window.location.reload();
                } else {
                    console.error('Error deleting employee');
                }
            });
        }
    }

    // Handle the form submission for Edit and Add modals
    document.getElementById('employee-form').addEventListener('submit', function(event) {
        event.preventDefault(); // Prevent the default form submission

        const formData = new FormData(this);
        const actionUrl = this.action;

        fetch(actionUrl, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (response.ok) {
                closeModal(); // Close the modal after successful save
                window.location.href = '/admin'; // Redirect to the admin panel
            } else {
                console.error('Error saving employee data');
            }
        })
        .catch(error => console.error('Error:', error));
    });
});

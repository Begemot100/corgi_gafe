document.addEventListener('DOMContentLoaded', function() {
    const editScheduleBtn = document.querySelector('.edit-schedule-btn');

    if (editScheduleBtn) {
        editScheduleBtn.addEventListener('click', toggleCheckboxes);
    } else {
        console.error("Кнопка 'Edit Schedule' не найдена.");
    }
});

function toggleCheckboxes() {
    document.querySelectorAll('.checkbox-input').forEach(function(employeeCheckbox) {
        const employeeId = employeeCheckbox.id.split('_')[1];
        const selectAllBtn = document.querySelector(`#employee_${employeeId} ~ .logs-container .select-all-btn`);
        const newScheduleBtn = document.querySelector(`#employee_${employeeId} ~ .logs-container .new-schedule-btn`);
        const employeeRowCheckboxes = document.querySelectorAll(`.log-row-${employeeId} .checkbox-cell`);
        const checkboxHeader = document.querySelector(`#employee_${employeeId} ~ .logs-container .checkbox-header`);

        if (employeeCheckbox.checked) {
            checkboxHeader.style.display = 'table-cell';
            employeeRowCheckboxes.forEach(cell => cell.style.display = 'table-cell');
            selectAllBtn.style.display = 'inline-block';
            newScheduleBtn.style.display = 'inline-block'; // Показать "New Schedule" вместе с "Выбрать все"
        } else {
            checkboxHeader.style.display = 'none';
            employeeRowCheckboxes.forEach(cell => cell.style.display = 'none');
            selectAllBtn.style.display = 'none';
            newScheduleBtn.style.display = 'none'; // Скрыть "New Schedule" если сотрудник не выбран
        }
    });
}

function selectAllEmployeeCheckboxes(employeeId) {
    const checkboxes = document.querySelectorAll(`.log-row-${employeeId} .date-checkbox`);
    const selectAllBtn = document.querySelector(`#employee_${employeeId} ~ .logs-container .select-all-btn`);
    const allChecked = Array.from(checkboxes).every(checkbox => checkbox.checked);

    checkboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
    });

    selectAllBtn.textContent = allChecked ? 'Выбрать все' : 'Снять выделение';
}

function openNewScheduleModal() {
    const modal = document.getElementById('newscheduleModal');
    if (modal) {
        modal.style.display = 'block';
    } else {
        console.error("Модальное окно 'newscheduleModal' не найдено.");
    }
}

function closeNewScheduleModal() {
    const modal = document.getElementById('newscheduleModal');
    if (modal) {
        modal.style.display = 'none';
    }
}


function applyRandomSchedule() {
    const checkInStart = document.getElementById('checkInStart').value;
    const checkInEnd = document.getElementById('checkInEnd').value;
    const checkOutStart = document.getElementById('checkOutStart').value;
    const checkOutEnd = document.getElementById('checkOutEnd').value;

    const updates = []; // Здесь собираем данные для отправки

    document.querySelectorAll('.date-checkbox:checked').forEach(function(checkbox) {
        const logId = checkbox.id.split('-')[2];
        const randomCheckIn = getRandomTime(checkInStart, checkInEnd);
        const randomCheckOut = getRandomTime(checkOutStart, checkOutEnd);

        // Обновляем отображение времени на странице
        document.getElementById(`check-in-time-${logId}`).textContent = randomCheckIn;
        document.getElementById(`check-out-time-${logId}`).textContent = randomCheckOut;

        // Добавляем данные для отправки на сервер
        updates.push({ logId: logId, checkIn: randomCheckIn, checkOut: randomCheckOut });
    });

    // Отправка обновленных данных на сервер
    fetch('/update_times', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ updates: updates })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log("Данные сохранены на сервере");
            // Здесь можно вызвать функцию для пересчета Total и других значений
        } else {
            console.error("Ошибка при сохранении данных на сервере");
        }
    })
    .catch(error => console.error("Ошибка при запросе:", error));

    closeNewScheduleModal();
}


// Функция для генерации случайного времени в диапазоне
function getRandomTime(start, end) {
    console.log("Функция applyRandomSchedule вызвана");

    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);

    const startDate = new Date();
    startDate.setHours(startHour, startMinute, 0, 0);

    const endDate = new Date();
    endDate.setHours(endHour, endMinute, 0, 0);

    const randomTime = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));

    return randomTime.toTimeString().slice(0, 5); // Форматируем как HH:MM
}

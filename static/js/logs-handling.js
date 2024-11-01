// logs-handling.js

let employeeLogs = {};  // Логи по датам для текущего сотрудника

// Загрузка логов сотрудников
function loadEmployeeLogs(employeeId) {
    fetch(`/get_employee_logs/${employeeId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                employeeLogs[employeeId] = data.logs;
                const dateSelect = document.getElementById('editDate');
                dateSelect.innerHTML = '';

                data.logs.forEach(log => {
                    const option = document.createElement('option');
                    option.value = log.date;
                    option.textContent = log.date;
                    dateSelect.appendChild(option);
                });

                if (data.logs.length > 0) {
                    updateSelectedLogData(data.logs[0].date, data.logs);
                }

                dateSelect.addEventListener('change', function () {
                    updateSelectedLogData(this.value, data.logs);
                });
            } else {
                console.error('Ошибка получения логов сотрудника');
            }
        })
        .catch(error => console.error('Ошибка загрузки логов сотрудника:', error));
}

// Обновление данных по выбранной дате
function updateSelectedLogData(selectedDate, logs) {
    const selectedLog = logs.find(log => log.date === selectedDate);
    if (selectedLog) {
        document.getElementById('editCheckIn').value = selectedLog.check_in_time || '';
        document.getElementById('editCheckOut').value = selectedLog.check_out_time || '';
        selectedLogId = selectedLog.log_id;
    } else {
        selectedLogId = null;
        alert("Ошибка: выберите корректную дату для редактирования.");
    }
}

// Сохранение отредактированного времени
function saveEditedTime() {
    const checkInTime = document.getElementById('editCheckIn').value;
    const checkOutTime = document.getElementById('editCheckOut').value;

    if (selectedLogId) {
        fetch(`/update_check_time/${selectedLogId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ check_in_time: checkInTime, check_out_time: checkOutTime })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                updateLogDisplay(selectedLogId, checkInTime, checkOutTime, data.worked_hours);
                closeEditModal();
            } else {
                console.error('Ошибка при сохранении времени');
            }
        })
        .catch(error => console.error('Ошибка при отправке запроса:', error));
    } else {
        alert('Не удалось сохранить изменения. Пожалуйста, выберите корректный лог.');
    }
}

// Обновление отображения логов на странице
function updateLogDisplay(logId, checkIn, checkOut, workedHours) {
    document.getElementById(`check-in-time-${logId}`).textContent = checkIn;
    document.getElementById(`check-out-time-${logId}`).textContent = checkOut;
    document.getElementById(`daily-hours-${logId}`).textContent = formatWorkedHours(workedHours);
}

// Форматирование часов работы
function formatWorkedHours(worked_hours) {
    const hours = Math.floor(worked_hours);
    const minutes = Math.round((worked_hours - hours) * 60);
    return `${hours}h ${minutes}min`;
}

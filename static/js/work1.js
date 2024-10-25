

let selectedLogId = null;
let employeeLogs = {}; // Сохраняем логи по датам для текущего сотрудника
let currentEmployeeId = null; // Сохраняем текущего выбранного сотрудника
//let allSelected = false;


// Функция для открытия/закрытия выбранного меню по id
function toggleDropdown(menuId) {
    const dropdownMenu = document.getElementById(menuId);
    if (dropdownMenu) {
        dropdownMenu.classList.toggle("show");
    } else {
        console.error(`Элемент с id ${menuId} не найден`);
    }
}

// Функция для открытия/закрытия основного модального окна с опциями
function toggleModal() {
    const modal = document.getElementById('modal'); // Окно с опциями

    if (!modal) return; // Проверка на существование

    // Переключаем видимость модального окна
    modal.style.display = modal.style.display === 'none' || modal.style.display === '' ? 'block' : 'none';
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.style.display = 'none';
    }
}
// Функция для открытия модального окна редактирования времени
function openEditModal(employeeId) {
    const editModal = document.getElementById('editTimeModal');
    const optionsModal = document.getElementById('modal'); // Окно с опциями

    if (!editModal) return; // Проверка на существование

    // Закрываем окно с опциями, если оно открыто
    if (optionsModal && optionsModal.style.display === 'block') {
        optionsModal.style.display = 'none';
    }

    // Открываем окно редактирования времени
    editModal.style.display = 'block';
}

// Функция для закрытия модального окна редактирования времени
function closeEditModal() {
    const editModal = document.getElementById('editTimeModal');
    if (editModal) {
        editModal.style.display = 'none';
    }
}
// Получение ID выбранного сотрудника и открытие модального окна
function getSelectedEmployeeAndOpenEditModal() {
    const checkboxes = document.querySelectorAll('.checkbox-input');
    let selectedEmployeeIds = [];

    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedEmployeeIds.push(checkbox.id.split('_')[1]);
        }
    });

    // Проверяем количество выбранных сотрудников
    if (selectedEmployeeIds.length === 0) {
        alert('Пожалуйста, выберите хотя бы одного сотрудника');
    } else if (selectedEmployeeIds.length > 1) {
        alert('Пожалуйста, выберите только одного сотрудника для редактирования');
    } else {
        const employeeId = selectedEmployeeIds[0]; // Получаем выбранного сотрудника
        currentEmployeeId = employeeId; // Присваиваем выбранного сотрудника
        console.log('Текущий выбранный сотрудник: ', currentEmployeeId);

        loadEditModal(employeeId); // Открывает и загружает модальное окно редактирования
    }
}
function loadEditModal(employeeId) {
    console.log('Загрузка модального окна...');
    fetch('/edit_modal')
        .then(response => response.text())
        .then(html => {
            document.getElementById('editTimeModalContainer').innerHTML = html;
            const editModal = document.getElementById('editTimeModal');
            if (editModal) {
                editModal.style.display = 'block'; // Отображаем модальное окно после загрузки

                // Загружаем даты в выпадающий список
                loadEmployeeLogs(employeeId);
            } else {
                console.error("editTimeModal не найден после загрузки.");
            }
        })
        .catch(error => console.error('Ошибка загрузки модального окна:', error));
}
function loadEmployeeLogs(employeeId) {
    fetch(`/get_employee_logs/${employeeId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const dateSelect = document.getElementById('editDate');
                dateSelect.innerHTML = ''; // Очищаем выпадающий список

                data.logs.forEach(log => {
                    const option = document.createElement('option');
                    option.value = log.date;
                    option.textContent = log.date;
                    dateSelect.appendChild(option);
                });

                // Обновляем время для первой даты
                if (data.logs.length > 0) {
                    updateSelectedLogData(data.logs[0].date, data.logs);
                }

                // Обработчик события изменения даты
                dateSelect.addEventListener('change', function() {
                    updateSelectedLogData(this.value, data.logs);
                });

                // Вызов пересчета после загрузки логов
                recalculateAndUpdateSummary();
            } else {
                console.error('Ошибка получения логов сотрудника');
            }
        })
        .catch(error => console.error('Ошибка загрузки логов сотрудника:', error));
}

function updateSelectedLogData(selectedDate, logs) {
    const selectedLog = logs.find(log => log.date === selectedDate);
    if (selectedLog) {
        document.getElementById('editCheckIn').value = selectedLog.check_in_time || '';
        document.getElementById('editCheckOut').value = selectedLog.check_out_time || '';
        selectedLogId = selectedLog.log_id;
    } else {
        selectedLogId = null;
        console.error("Log не найден для выбранной даты");
        alert("Ошибка: выберите корректную дату для редактирования.");
    }
}
function updateHolidayStatus(logId, status) {
    const formattedStatus = status.replace(/(^|\s)\S/g, letter => letter.toUpperCase()).replace("Workingday", "Working day");

    fetch(`/update_holiday_status/${logId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ holiday_status: formattedStatus })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            console.log(`Статус для ${logId} обновлен: ${formattedStatus}`);
        } else {
            console.error('Ошибка при обновлении статуса');
        }
    })
    .catch(error => console.error('Ошибка:', error));
}
function formatWorkedHours(worked_hours) {
    const hours = Math.floor(worked_hours);
    const minutes = Math.round((worked_hours - hours) * 60);
    return `${hours}h ${minutes}min`;
}
function saveEditedTime() {
    const checkInTime = document.getElementById('editCheckIn').value;
    const checkOutTime = document.getElementById('editCheckOut').value;

    console.log("Попытка сохранить данные:", {
        checkInTime: checkInTime,
        checkOutTime: checkOutTime,
        selectedLogId: selectedLogId
    });

    if (selectedLogId) {
        fetch(`/update_check_time/${selectedLogId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ check_in_time: checkInTime, check_out_time: checkOutTime })
        })
        .then(response => response.json())
        .then(data => {
            if (data && data.success) {
                // Обновляем интерфейс без перезагрузки страницы
                updateLogUI(selectedLogId, checkInTime, checkOutTime, data.worked_hours);
                recalculateAndUpdateSummary();  // Обновляем сумму дней и часов



                // Закрываем модальное окно после успешного обновления
                closeEditModal();
            } else {
                console.error('Ошибка при сохранении времени:', data.message || 'Неизвестная ошибка');
            }
        })
        .catch(error => {
            console.error('Ошибка при отправке запроса:', error);
        });
    } else {
        console.error('selectedLogId не установлен');
        alert('Не удалось сохранить изменения. Пожалуйста, выберите корректный лог.');
    }
}

function updateLogUI(logId, checkInTime, checkOutTime, workedHours) {
    const checkInElement = document.getElementById(`check-in-time-${logId}`);
    const checkOutElement = document.getElementById(`check-out-time-${logId}`);
    const dailyHoursElement = document.getElementById(`daily-hours-${logId}`);

    checkInElement.textContent = checkInTime || '--:--';
    checkOutElement.textContent = checkOutTime || '--:--';
    dailyHoursElement.textContent = workedHours ? `${Math.floor(workedHours)}h ${Math.round((workedHours % 1) * 60)}min` : '--:--';
}


function recalculateAndUpdateSummary() {
    document.querySelectorAll('.employee-log').forEach(employeeLog => {
        const employeeId = employeeLog.getAttribute('data-employee-id');

        if (employeeId) {
            const totalHoursElement = document.getElementById(`total-hours-${employeeId}`);
            const totalDaysElement = document.getElementById(`total-days-${employeeId}`);
            const paidHolidaysElement = document.getElementById(`paid-holidays-${employeeId}`);
            const unpaidHolidaysElement = document.getElementById(`unpaid-holidays-${employeeId}`);

            if (totalHoursElement && totalDaysElement && paidHolidaysElement && unpaidHolidaysElement) {
                let totalHours = 0;
                let totalDays = 0;
                let paidHolidays = 0;
                let unpaidHolidays = 0;

                // Суммируем часы для каждого сотрудника
                employeeLog.querySelectorAll('.daily-hours').forEach(hourCell => {
                    const timeText = hourCell.textContent.trim();
                    if (timeText.includes('h')) {
                        const [hours, minutes] = timeText.split('h').map(part => part.trim());

                        const parsedHours = parseInt(hours, 10) || 0;
                        const parsedMinutes = parseInt(minutes, 10) || 0;

                        if (!isNaN(parsedHours) && !isNaN(parsedMinutes)) {
                            totalHours += parsedHours + (parsedMinutes / 60);
                        }
                    }
                });

                // Подсчитываем количество рабочих дней и отпусков
                employeeLog.querySelectorAll('.log-row').forEach(row => {
                    const holidayStatus = row.querySelector('select[name="holiday_type"]').value;

                    if (holidayStatus !== 'Unpaid') {
                        totalDays++;
                    }
                    if (holidayStatus === 'Paid') {
                        paidHolidays++;
                    } else if (holidayStatus === 'Unpaid') {
                        unpaidHolidays++;
                    }
                });

                // Округляем итоговое количество часов до двух знаков
                totalHours = parseFloat(totalHours.toFixed(2));

                const displayHours = Math.floor(totalHours);
                const displayMinutes = Math.round((totalHours % 1) * 60);

                if (!isNaN(displayHours) && !isNaN(displayMinutes)) {
                    totalHoursElement.textContent = `${displayHours}h ${displayMinutes}min`;
                } else {
                    totalHoursElement.textContent = '0h 0min';
                }

                totalDaysElement.textContent = totalDays;
                paidHolidaysElement.textContent = paidHolidays;
                unpaidHolidaysElement.textContent = unpaidHolidays;

            } else {
                console.error(`Не найдены элементы для employeeId ${employeeId}`);
            }
        } else {
            console.error('employeeId не найден в data-атрибутах');
        }
    });
}

function closeEditModal() {
    const editModal = document.getElementById('editTimeModal');
    if (editModal) {
        editModal.style.display = 'none';
        console.log("Модальное окно закрыто."); // Отладка: проверка закрытия окна
    } else {
        console.error("Не найден элемент с id 'editTimeModal'");
    }
}

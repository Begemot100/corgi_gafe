let selectedLogId = null;
let employeeLogs = {}; // Сохраняем логи по датам для текущего сотрудника
let currentEmployeeId = null; // Сохраняем текущего выбранного сотрудника



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
function openEditModal(event, employeeId) {
    const editModal = document.getElementById('editTimeModal');
    const optionsModal = document.getElementById('modal'); // Окно с опциями

    if (!editModal) return; // Проверка на существование

    // Закрываем окно с опциями, если оно открыто
    if (optionsModal && optionsModal.style.display === 'block') {
        optionsModal.style.display = 'none';
    }
    const buttonRect = event.target.getBoundingClientRect();

    editModal.style.top = `${buttonRect.top + window.scrollY}px`; // Выравнивание по вертикали
    editModal.style.left = `${buttonRect.left + window.scrollX - editModal.offsetWidth - 10}px`; // Слева от троеточия с отступом в 10px


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

document.querySelectorAll('.ellipsis-btn').forEach(button => {
    button.addEventListener('click', (event) => {
        const employeeId = event.target.dataset.id;
        openEditModal(event, employeeId); // Открываем модальное окно при клике на троеточие
    });
});


function formatDate(date) {
    if (!date) {
        console.error('Date is undefined or null');
        return '';  // Возвращаем пустую строку или любое значение по умолчанию
    }

    return date.toISOString().split('T')[0];  // Если дата валидна, продолжаем форматировать
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
            console.log(data.logs); // Логи для отладки
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
            } else {
                console.error('Ошибка получения логов сотрудника');
            }
        })
        .catch(error => console.error('Ошибка загрузки логов сотрудника:', error));
}
function resetLogData(logId) {
    // Обнуляем время check-in и check-out
    document.getElementById(`check-in-time-${logId}`).textContent = '--:--';
    document.getElementById(`check-out-time-${logId}`).textContent = '--:--';

    // Обнуляем отработанные часы
    document.getElementById(`daily-hours-${logId}`).textContent = '0h 0min';

    console.log(`Лог ${logId} был успешно обнулен.`);
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


function updateSelectedLogData(selectedDate, logs) {
    console.log("Доступные логи:", logs);
    console.log("Выбранная дата:", selectedDate);

    // Проверка, что logs является массивом
    if (!Array.isArray(logs)) {
        console.error('Logs is not an array:', logs);
        return;
    }

    // Поиск выбранного лога
    const selectedLog = logs.find(log => log.date === selectedDate);

    if (selectedLog) {
        console.log('Выбран лог:', selectedLog); // Отладка
        document.getElementById('editCheckIn').value = selectedLog.check_in_time || '';
        document.getElementById('editCheckOut').value = selectedLog.check_out_time || '';
        selectedLogId = selectedLog.log_id; // Установка ID лога
    } else {
        selectedLogId = null; // Сбрасываем selectedLogId, если лог не найден
        console.error("Log не найден для выбранной даты");
        alert("Ошибка: выберите корректную дату для редактирования.");
    }
}


function updateHolidayStatus(logId, status) {
    // Логируем статус для отладки
    console.log(`Статус передан в updateHolidayStatus: ${status}`);

    // Если выбран статус 'unpaid', запрашиваем подтверждение
    if (status === 'unpaid') {
        const confirmReset = confirm("¿Está seguro de que desea cambiar el estado a No pagado? Esta acción restablecerá los datos de los registros.");

        if (confirmReset) {
            console.log('El usuario ha confirmado el cambio de estado No pagado.');
            resetLogData(logId);  // Если пользователь подтвердил, обнуляем данные
        } else {
            console.log('Пользователь отменил действие.');
            // Если отменили, возвращаем статус на предыдущий
            const selectElement = document.getElementById(`log-${logId}`);
            selectElement.value = 'workingday'; // Меняем статус обратно на рабочий день или другой по умолчанию
            return; // Завершаем выполнение, если отменили действие
        }
    }

    // Продолжаем обновление статуса на сервере
    const formattedStatus = status.replace(/(^|\s)\S/g, letter => letter.toUpperCase()).replace("Workingday", "Working day");

    console.log(`Отправка данных на сервер для обновления статуса: ${formattedStatus}`);

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
            console.log(`Статус для ${logId} успешно обновлен: ${formattedStatus}`);
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
// Функция для обновления summary для конкретного сотрудника
function updateEmployeeSummary(employeeId, totalHours, totalDays, paidHolidays, unpaidHolidays) {
    // Обновляем отображение Total Hours, Total Days и отпусков
    const totalHoursElement = document.getElementById(`total-hours-${employeeId}`);
    const totalDaysElement = document.getElementById(`total-days-${employeeId}`);
    const paidHolidaysElement = document.getElementById(`paid-holidays-${employeeId}`);
    const unpaidHolidaysElement = document.getElementById(`unpaid-holidays-${employeeId}`);

    if (totalHoursElement) totalHoursElement.textContent = totalHours || '0h 0min';
    if (totalDaysElement) totalDaysElement.textContent = totalDays || '0';
    if (paidHolidaysElement) paidHolidaysElement.textContent = paidHolidays || '0';
    if (unpaidHolidaysElement) unpaidHolidaysElement.textContent = unpaidHolidays || '0';

    console.log(`Обновлено для сотрудника ${employeeId}:`, {
        totalHours,
        totalDays,
        paidHolidays,
        unpaidHolidays
    });
}



function recalculateAndUpdateSummary() {
    console.log("Пересчитываем summary...");

    // Обходим каждого сотрудника
    document.querySelectorAll('.employee-log').forEach(employeeLog => {
        const employeeId = employeeLog.getAttribute('data-employee-id');

        if (!employeeId) {
            console.error("Не найден ID сотрудника");
            return;
        }

        // Итоговые данные для сотрудника
        let totalHours = 0;
        let totalDays = 0;
        let paidHolidays = 0;
        let unpaidHolidays = 0;

        // Проходим по каждому логу сотрудника
        employeeLog.querySelectorAll('.log-row').forEach(row => {
            const checkInTime = row.querySelector('.check-in-time')?.textContent.trim() || '--:--';
            const checkOutTime = row.querySelector('.check-out-time')?.textContent.trim() || '--:--';
            const holidayStatus = row.querySelector('select[name="holiday_type"]')?.value || 'workingday';

            console.log(`Обрабатываем лог сотрудника ${employeeId}:`, { checkInTime, checkOutTime, holidayStatus });

            // Учитываем только дни с валидными временами
            if (checkInTime !== '--:--' && checkOutTime !== '--:--') {
                totalDays++;
                const hoursWorked = parseFloat(row.querySelector('.daily-hours')?.textContent || '0') || 0;
                totalHours += hoursWorked;
            }

            // Считаем типы отпусков
            if (holidayStatus === 'Paid') {
                paidHolidays++;
            } else if (holidayStatus === 'Unpaid') {
                unpaidHolidays++;
            }
        });

        // Обновляем summary в DOM
        document.getElementById(`total-hours-${employeeId}`).textContent = `${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}min`;
        document.getElementById(`total-days-${employeeId}`).textContent = totalDays;
        document.getElementById(`paid-holidays-${employeeId}`).textContent = paidHolidays;
        document.getElementById(`unpaid-holidays-${employeeId}`).textContent = unpaidHolidays;

        console.log(`Summary для сотрудника ${employeeId}:`, { totalHours, totalDays, paidHolidays, unpaidHolidays });
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


function closeEditModal() {
    const editModal = document.getElementById('editTimeModal');
    if (editModal) {
        editModal.style.display = 'none';
    } else {
        console.error("Не найден элемент с id 'editTimeModal'");
    }
}

// Функции для работы с фильтрацией по датам и группам
function toggleDropdown(menuId) {
    const dropdownMenu = document.getElementById(menuId);
    if (dropdownMenu) {
        dropdownMenu.classList.toggle("show");
    } else {
        console.error(`Элемент с id ${menuId} не найден`);
    }
}



function applyFilter(filterType) {
    window.location.href = `/work?filter=${filterType}`;
}

function applyDateFilter() {
    const selectedDate = document.getElementById("datePicker").value;
    if (selectedDate) {
        window.location.href = `/work?date=${selectedDate}`;
    }
}

// Управление выбором всех сотрудников
function selectAllEmployees() {
    const checkboxes = document.querySelectorAll('.checkbox-input');
    checkboxes.forEach(checkbox => checkbox.checked = !allSelected);
    allSelected = !allSelected;
}

function exportExcel() {
    // Получаем ID выбранных сотрудников
    const selectedEmployees = Array.from(document.querySelectorAll('input.checkbox-input:checked')).map(input => input.id.split('_')[1]);

    if (selectedEmployees.length === 0) {
        alert("Пожалуйста, выберите хотя бы одного сотрудника для экспорта.");
        return;
    }

    // Собираем ID видимых строк логов (работаем только с теми логами, которые отображаются)
    const visibleLogRows = Array.from(document.querySelectorAll('.employee-log .logs-table tbody tr')).filter(row => {
        return row.style.display !== 'none' && row.getAttribute('data-log-id');
    });
    const selectedWorkLogIds = visibleLogRows.map(row => row.getAttribute('data-log-id'));

    if (selectedWorkLogIds.length === 0) {
        alert("Нет видимых логов для экспорта.");
        return;
    }

    // Проверка данных перед отправкой
    console.log('Selected Employees:', selectedEmployees);
    console.log('Selected Work Logs:', selectedWorkLogIds);

    // Отправляем данные на сервер для экспорта
    fetch('/export_excel', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ employee_ids: selectedEmployees, work_log_ids: selectedWorkLogIds })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error("Ошибка при создании файла Excel");
        }
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'work_logs.xlsx');
        document.body.appendChild(link);
        link.click();
        link.parentNode.removeChild(link);
    })
    .catch(error => {
        console.error('Ошибка при экспорте в Excel:', error);
    });
}


document.addEventListener('DOMContentLoaded', function() {

    const filterButtons = document.querySelectorAll('.filter-option');
    filterButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            event.preventDefault();  // Предотвращаем стандартное поведение
            event.stopPropagation();  // Останавливаем распространение события

            const filterType = button.getAttribute('data-filter');
//            applyFilter(filterType);
        });
    });
    // Логика для фильтрации по дате
    function applyFilter(filterType) {
        console.log("Applying filter:", filterType);

        const today = new Date();
        let startDate, endDate;

        // Определяем диапазон дат на основе выбранного фильтра
        if (filterType === 'today') {
            startDate = today;
            endDate = today;
        } else if (filterType === 'yesterday') {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 1);
            endDate = startDate;
        } else if (filterType === 'last_7_days') {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);
            endDate = today;
        } else if (filterType === 'last_30_days') {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 30);
            endDate = today;
        } else if (filterType === 'previous_month') {
            const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(firstDayOfCurrentMonth);
            endDate.setDate(endDate.getDate() - 1);
            startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        } else if (filterType === 'current_month') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = today;
        }

        // Преобразуем даты в строку формата YYYY-MM-DD для сравнения
        const formatDateString = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const startDateStr = formatDateString(startDate);
        const endDateStr = formatDateString(endDate);
        // Применение фильтра к строкам таблицы
        console.log("Applying filter:", filterType, "Start:", startDate, "End:", endDate);

        // Применяем фильтр по датам для каждой строки
        document.querySelectorAll('.employee-log .logs-table tbody tr').forEach(row => {
            const logDate = row.getAttribute('data-log-date');
            console.log(`Дата лога: ${logDate}, Диапазон: ${startDateStr} - ${endDateStr}`);

            if (logDate >= startDateStr && logDate <= endDateStr) {
                row.style.display = '';  // Показать строку
            } else {
                row.style.display = 'none';  // Скрыть строку
            }

        });


    // Обновляем отображение выбранного диапазона
    document.getElementById('selectedDateDisplay').textContent = `${filterType.replace('_', ' ').toUpperCase()}: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    }
    // Обработчики событий для кнопок фильтрации
    document.querySelectorAll('.dropdown-menu a').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const filterType = link.getAttribute('onclick').split('\'')[1]; // Получаем тип фильтра из атрибута onclick
            applyFilter(filterType);
        });
    });

    // Фильтрация по конкретной дате из datePicker
    document.getElementById('datePicker').addEventListener('change', function() {
        const selectedDate = this.value;
        applyFilterByDate(selectedDate);
    });

    function applyFilterByDate(date) {
        console.log("Выбранная дата для фильтрации:", date);
        document.querySelectorAll('.employee-log .logs-table tbody tr').forEach(row => {
            const logDate = row.getAttribute('data-log-date');
            console.log("Дата строки:", logDate);
            if (logDate === selectedDate) {
                row.style.display = ''; // Показать строку
            } else {
                row.style.display = 'none'; // Скрыть строку
            }
        });
        document.getElementById('selectedDateDisplay').textContent = `Date: ${date}`;
    }



    // Логика для обновления цвета фона выбора отпуска
    const holidaySelects = document.querySelectorAll('select[name="holiday_type"]');

    // Функция для обновления цвета фона
    function updateSelectBackground(selectElement) {
        if (selectElement.value === 'paid') {
            selectElement.style.backgroundColor = '#FEDB5B';
        } else if (selectElement.value === 'unpaid') {
            selectElement.style.backgroundColor = '#DD8137';
            selectElement.style.color = '#FFFFFF';
        } else {
            selectElement.style.backgroundColor = ''; // Сброс до стандартного
            selectElement.style.color = ''; // Сброс до стандартного
        }
    }

    // Инициализация фона при загрузке страницы
    holidaySelects.forEach(select => {
        updateSelectBackground(select);

        // Слушатель на изменение для обновления фона
        select.addEventListener('change', function() {
            updateSelectBackground(select);
        });
    });
});

// Закрытие модальных окон и меню при клике вне их области
window.addEventListener('click', function(event) {
    const modal = document.getElementById('modal');
    const dropdownMenu = document.getElementById("dropdown-menu");
    const groupDropdownMenu = document.getElementById("group-dropdown-menu");

    if (!event.target.closest('.dot-icon') && !event.target.closest('.filter-btn')) {
        if (modal && modal.style.display === 'block') { modal.style.display = 'none'; }
        if (dropdownMenu && dropdownMenu.classList.contains('show')) { dropdownMenu.classList.remove('show'); }
        if (groupDropdownMenu && groupDropdownMenu.classList.contains('show')) { groupDropdownMenu.classList.remove('show'); }
    }
});
document.querySelector('.dot-icon').addEventListener('click', function(event) {
    const modal = document.getElementById('editTimeModal');
    const buttonRect = event.target.getBoundingClientRect(); // Получаем координаты кнопки троеточия

    // Вычисляем позицию для модального окна
    modal.style.top = `${buttonRect.bottom + window.scrollY}px`;
    modal.style.left = `${buttonRect.left + window.scrollX}px`;



    modal.style.display = 'block';

});

// Закрытие модального окна


function resetFilter() {
    // Сбрасываем выбранную дату
    document.getElementById("datePicker").value = '';
    document.getElementById("selectedDateDisplay").textContent = ''; // Очищаем отображаемую дату
    // Перенаправляем на страницу с логами без фильтров
    window.location.href = '/work';
}

function calculateTotalHours() {
    let totalHours = 0;

    // Проходим по всем логам сотрудников
    for (const date in employeeLogs) {
        // Проверяем, если у нас есть рабочие часы для этой даты
        if (employeeLogs[date]) {
            totalHours += employeeLogs[date].worked_hours || 0; // Суммируем часы, если они есть
        }
    }

    // Преобразуем общее количество часов в формат "Xh Ymin"
    const hours = Math.floor(totalHours); // Целые часы
    const minutes = Math.round((totalHours - hours) * 60); // Остаток в минутах
    totalHours = parseFloat(totalHours.toFixed(2));


    // Формируем строку для отображения
    return `${hours}h ${minutes}min`;
}
function updateTotalHours() {
    let totalHours = 0;

    // Проходим по всем элементам рабочих часов для выбранного сотрудника
    document.querySelectorAll('.employee-log .logs-table tbody tr .daily-hours').forEach(hourCell => {
        const timeText = hourCell.textContent.trim();

        if (timeText.includes('h')) {
            const [hours, minutes] = timeText.split('h').map(part => part.trim());

            // Суммируем часы и минуты, проверяем корректность значений
            const parsedHours = parseInt(hours, 10) || 0;
            const parsedMinutes = parseInt(minutes, 10) || 0;
            totalHours += parsedHours + (parsedMinutes / 60);
        }
    });

    // Округляем итоговое количество часов до двух знаков
    totalHours = Math.round(totalHours * 100) / 100;
    totalHours = parseFloat(totalHours.toFixed(2));

    // Обновляем отображение на странице
    const totalHoursElement = document.getElementById(`total-hours-${currentEmployeeId}`);
    if (totalHoursElement) {
        const displayHours = Math.floor(totalHours);  // Целые часы
        const displayMinutes = Math.round((totalHours % 1) * 60);  // Остаток в минутах
        totalHours = parseFloat(totalHours.toFixed(2));

        totalHoursElement.textContent = `${displayHours}h ${displayMinutes}min`;
    }
}


function toggleCheckboxes() {
    // Находим все элементы с классом .checkbox-input
    const checkboxes = document.querySelectorAll('.checkbox-input');
    checkboxes.forEach(checkbox => {
        // Переключаем видимость чекбоксов
        checkbox.style.display = checkbox.style.display === 'none' ? 'inline-block' : 'none';
    });
}
function showCustomRange() {
    document.getElementById('customRangePicker').style.display = 'block';
}

function applyCustomRange() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (startDate && endDate) {
        window.location.href = `/work?start_date=${startDate}&end_date=${endDate}`;
    } else {
        alert('Por favor, selecciona un rango de fechas válido.');
    }
}
function applyFilter(filterType, label) {
    console.log("Selected filter:", filterType); // Отладка
    document.getElementById('filterButton').textContent = label;

    if (filterType === 'custom') {
        console.log("Displaying custom range picker"); // Отладка
        document.getElementById('customRangePicker').style.display = 'flex'; // Показать блок выбора диапазона
    } else {
        document.getElementById('customRangePicker').style.display = 'none'; // Скрыть блок выбора диапазона для других фильтров
    }
}

function applyCustomRange() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (startDate && endDate) {
        window.location.href = `/work?start_date=${startDate}&end_date=${endDate}`;
    } else {
        alert('Por favor, selecciona un rango de fechas válido.');
    }
}

function applyFilter(filterType, filterLabel = '') {
    const url = new URL('/api/work_logs', window.location.origin);
    let today = new Date();
    let startDate = null, endDate = null;

    // Обновляем текст кнопки фильтра, если передан label
    if (filterLabel) {
        document.getElementById('filterButton').textContent = filterLabel;
    }

    // Логика работы с фильтрами
    if (filterType === 'custom') {
        console.log("Отображение выбора диапазона дат (custom)");
        document.getElementById('customRangePicker').style.display = 'flex'; // Показать выбор диапазона
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        if (startDate && endDate) {
            url.searchParams.append('start_date', startDate);
            url.searchParams.append('end_date', endDate);
            filterLogsByDateRange(startDate, endDate);
        }
    } else {
        document.getElementById('customRangePicker').style.display = 'none'; // Скрыть выбор диапазона

        // Определяем диапазон дат в зависимости от выбранного фильтра
        if (filterType === 'today') {
            startDate = today;
            endDate = today;
        } else if (filterType === 'yesterday') {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 1);
            endDate = startDate;
        } else if (filterType === 'last_7_days') {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 7);
            endDate = today;
        } else if (filterType === 'last_30_days') {
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 30);
            endDate = today;
        } else if (filterType === 'previous_month') {
            const firstDayOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(firstDayOfCurrentMonth);
            endDate.setDate(endDate.getDate() - 1);
            startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        } else if (filterType === 'current_month') {
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = today;
        }

        // Преобразуем даты в строки формата YYYY-MM-DD, если они определены
        if (startDate && endDate) {
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            url.searchParams.append('start_date', startDateStr);
            url.searchParams.append('end_date', endDateStr);

            // Логируем диапазон дат
            console.log(`Применяем фильтр: ${filterType}, от ${startDateStr} до ${endDateStr}`);

            // Обновляем отображаемую информацию о выбранных датах
            document.getElementById('selectedDateDisplay').textContent = `${startDateStr} - ${endDateStr}`;

            // Применяем фильтр по датам
            filterLogsByDateRange(startDateStr, endDateStr);
        }
    }

    // Выполняем запрос к API для получения данных
    fetch(url)
        .then(response => response.json())
        .then(data => {
            // Обновляем таблицу логов
            updateWorkLogs(data.logs);

            // Обновляем блок "Summary"
            updateSummaries(data.summary);
        })
        .catch(error => console.error('Ошибка загрузки данных:', error));
}


// Функция для фильтрации логов по дате и обновления summary для каждого сотрудника
function filterLogsByDateRange(startDate, endDate) {
    console.log(`Фильтруем по диапазону: ${startDate} - ${endDate}`);

    // Перебираем всех сотрудников
    document.querySelectorAll('.employee-log').forEach(employeeLog => {
        const employeeId = employeeLog.getAttribute('data-employee-id');
        let totalHours = 0;
        let totalDays = 0;
        let paidHolidays = 0;
        let unpaidHolidays = 0;

        // Фильтруем строки логов сотрудника
        employeeLog.querySelectorAll('.log-row').forEach(row => {
            const logDate = new Date(row.getAttribute('data-log-date'));
            const checkInTime = row.querySelector('.check-in-time')?.textContent.trim() || '--:--';
            const checkOutTime = row.querySelector('.check-out-time')?.textContent.trim() || '--:--';
            const holidayStatus = row.querySelector('select[name="holiday_type"]')?.value || 'workingday';

            // Проверяем, попадает ли дата лога в выбранный диапазон
            if (logDate >= new Date(startDate) && logDate <= new Date(endDate)) {
                row.style.display = ''; // Показать лог

                // Учитываем "Unpaid" дни независимо от прочерков
                if (holidayStatus === 'Unpaid') {
                    unpaidHolidays++;
                }

                // Учитываем только дни с валидным временем (без прочерков)
                if (checkInTime !== '--:--' && checkOutTime !== '--:--') {
                    totalDays++;
                    const workedHours = parseFloat(row.querySelector('.daily-hours')?.textContent || '0') || 0;
                    totalHours += workedHours;
                }

                // Учитываем отпуска "Paid"
                if (holidayStatus === 'Paid') {
                    paidHolidays++;
                }
            } else {
                row.style.display = 'none'; // Скрыть лог, если он вне диапазона
            }
        });

        // Обновляем summary для текущего сотрудника
        updateEmployeeSummary(
            employeeId,
            `${Math.floor(totalHours)}h ${Math.round((totalHours % 1) * 60)}min`,
            totalDays,
            paidHolidays,
            unpaidHolidays
        );
    });
}


function applyCustomRange() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (startDate && endDate) {
        filterLogsByDateRange(startDate, endDate);
    } else {
        alert('Пожалуйста, выберите корректный диапазон дат.');
    }
}



function applyDateFilter() {
    const selectedDate = document.getElementById("datePicker").value;
    if (selectedDate) {
        window.location.href = `/work?date=${selectedDate}`;
    }
}
function toggleCustomRange() {
    const customRangePicker = document.getElementById('customRangePicker');

    // Проверяем текущее состояние элемента и переключаем его видимость
    if (customRangePicker.style.display === 'none' || customRangePicker.style.display === '') {
        customRangePicker.style.display = 'block';
    } else {
        customRangePicker.style.display = 'none';
    }
}

//// Пример вызова toggleCustomRange при выборе "Rango Personalizado"
//document.getElementById('filterButton').addEventListener('click', function() {
//    applyFilter('custom', 'Rango Personalizado');
//    toggleCustomRange();  // Показываем или скрываем календарь
//});
function toggleFilter(filterType, label) {
    const customRangePicker = document.getElementById('customRangePicker');
    const datePicker = document.getElementById('datePicker');

    // Если выбран кастомный фильтр, показываем диапазон
    if (filterType === 'custom') {
        customRangePicker.style.display = 'block';
        datePicker.style.display = 'none';  // скрываем обычный календарь
    } else {
        customRangePicker.style.display = 'none';
        datePicker.style.display = 'inline-block';  // показываем обычный календарь, если выбран не кастомный фильтр
    }

    // Обновляем кнопку фильтра для отображения текущего фильтра
    document.getElementById('filterButton').textContent = label;
}

window.addEventListener('click', function(event) {
    const modal = document.getElementById('modal');
    const editTimeModal = document.getElementById('editTimeModal');

    // Закрываем окно с опциями, если клик был вне области модального окна
    if (modal && modal.style.display === 'block' && !event.target.closest('.dot-icon') && !event.target.closest('.modal-content')) {
        modal.style.display = 'none';
    }

    // Закрываем окно редактирования времени, если клик был вне области модального окна
    if (editTimeModal && editTimeModal.style.display === 'block' && !event.target.closest('.modal-content')) {
        editTimeModal.style.display = 'none';
    }
});

// Функция для добавления пустого лога, если не было чек-ина
function addEmptyLogIfNotCheckedIn(employeeId, date) {
    fetch('/add_empty_log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, date: date })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log(`Лог для сотрудника ${employeeId} за ${date} добавлен с прочерками.`);
        } else {
            console.error('Ошибка добавления пустого лога:', data.message);
        }
    })
    .catch(error => console.error('Ошибка:', error));
}

// Проверка и добавление пустого лога, если чек-ин не сделан
function checkAndAddEmptyLog() {
    const currentDate = new Date().toISOString().split('T')[0];

    document.querySelectorAll('.employee-log').forEach(employeeLog => {
        const employeeId = employeeLog.getAttribute('data-employee-id');
        let logExistsWithCheckIn = false;

        employeeLog.querySelectorAll('.log-row').forEach(row => {
            const logDate = row.getAttribute('data-log-date');
            const checkInTime = row.querySelector('.check-in-time').textContent;
            if (logDate === currentDate && checkInTime !== '--:--') {
                logExistsWithCheckIn = true;
            }
        });

        // Добавляем пустой лог, если чек-ин не был выполнен
        if (!logExistsWithCheckIn) {
            addEmptyLogIfNotCheckedIn(employeeId, currentDate);
        }
    });
}

// Создаем новый пустой лог для следующего дня
function addNewDayLog() {
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayString = nextDay.toISOString().split('T')[0];

    document.querySelectorAll('.employee-log').forEach(employeeLog => {
        const employeeId = employeeLog.getAttribute('data-employee-id');
        addEmptyLogIfNotCheckedIn(employeeId, nextDayString);
    });
}

// Запускаем проверку и добавление нового дня при загрузке
window.addEventListener('load', () => {
    checkAndAddEmptyLog(); // Проверка текущего дня
    addNewDayLog();        // Создание нового лога для следующего дня
});



document.querySelectorAll('select[name="holiday_type"]').forEach(select => {
    select.addEventListener('change', function() {
        const logRow = this.closest('tr');  // Используем селектор строки таблицы
        if (logRow) {
            const logId = logRow.getAttribute('data-log-id');  // Получаем ID лога
            const status = this.value;
            updateHolidayStatus(logId, status);  // Обновляем статус
        } else {
            console.error("log_row не найден");
        }
    });
});


function fetchAndUpdateTotals() {
    fetch('/api/log_totals')
        .then(response => response.json())
        .then(data => {
            Object.entries(data).forEach(([employeeId, totals]) => {
                // Универсальная функция для обновления элемента
                const updateElement = (id, value) => {
                    const element = document.getElementById(id);
                    if (element && value !== undefined) {
                        element.textContent = value;
                    }
                };

                // Обновляем данные для каждого сотрудника
                updateElement(`total-hours-${employeeId}`, totals.total_hours);
                updateElement(`total-days-${employeeId}`, totals.total_days);
                updateElement(`paid-holidays-${employeeId}`, totals.paid_holidays);
                updateElement(`unpaid-holidays-${employeeId}`, totals.unpaid_holidays);

                console.log(`Данные обновлены для сотрудника ${employeeId}:`, totals);
            });
        })
        .catch(error => console.error('Ошибка при получении итогов логов:', error));
}


// Автоматически обновляем итоги каждые 10 секунд
setInterval(fetchAndUpdateTotals, 5000);

// Также можно обновить итоги при загрузке страницы
document.addEventListener('DOMContentLoaded', fetchAndUpdateTotals);

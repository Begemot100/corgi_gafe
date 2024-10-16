let selectedLogId = null;
let employeeLogs = {}; // Сохраняем логи по датам для текущего сотрудника
let currentEmployeeId = null; // Сохраняем текущего выбранного сотрудника
let allSelected = false;

// Функция для открытия/закрытия выбранного меню по id
function toggleDropdown(menuId) {
    const dropdownMenu = document.getElementById(menuId);
    if (dropdownMenu) {
        dropdownMenu.classList.toggle("show");
    } else {
        console.error(`Элемент с id ${menuId} не найден`);
    }
}

// Функция для открытия/закрытия основного модального окна
function toggleModal() {
    const modal = document.getElementById('modal');
    const dotIcon = document.querySelector('.dot-icon'); // Троеточие

    if (!modal || !dotIcon) return;
    // Получаем координаты троеточия
    const rect = dotIcon.getBoundingClientRect();

    // Устанавливаем позицию модального окна под троеточием
    modal.style.top = `${rect.bottom + window.scrollY - 170}px`; // смещение вниз
    modal.style.left = `${rect.left + window.scrollX - 1000}px`; // выравнивание слева под троеточие
    modal.style.display = modal.style.display === 'none' ? 'block' : 'none';

}
// Функция для закрытия модального окна
function closeEditModal() {
    const editModal = document.getElementById('editTimeModal');
    if (editModal) {
        editModal.style.display = 'none';
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

        loadEditModal(employeeId); // Открывает и загружает модальное окно редактирования
    }
}

// Функция загрузки и отображения модального окна для редактирования


function openEditModal(employeeId) {
    currentEmployeeId = employeeId;
    const editModal = document.getElementById('editTimeModal');
    const rect = document.querySelector('.dot-icon').getBoundingClientRect(); // координаты базового элемента

    // Устанавливаем окно по центру экрана
    editModal.style.position = 'fixed';
    editModal.style.top = '50%';
    editModal.style.left = '50%';
    editModal.style.transform = 'translate(-50%, -50%)';

    // Отображаем окно
    editModal.style.display = 'block';
}

//function updateSelectedLogData(selectedDate, logs) {
//    console.log("Доступные логи:", logs);
//    console.log("Выбранная дата:", selectedDate);
//
//    const selectedLog = logs.find(log => log.date === selectedDate);
//    if (selectedLog) {
//        console.log('Выбран лог:', selectedLog); // Отладка
//        document.getElementById('editCheckIn').value = selectedLog.check_in_time || '';
//        document.getElementById('editCheckOut').value = selectedLog.check_out_time || '';
//        selectedLogId = selectedLog.log_id; // Установка ID лога
//    } else {
//        selectedLogId = null; // Сбрасываем selectedLogId, если лог не найден
//        console.error("Log не найден для выбранной даты");
//        alert("Ошибка: выберите корректную дату для редактирования.");
//    }
//}


// Обновление статуса праздника
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
            console.log("Ответ от сервера:", data);
            if (data && data.success) {
                // Обновляем часы для текущего лога
                const dailyHoursElement = document.getElementById(`daily-hours-${selectedLogId}`);
                if (dailyHoursElement) {
                    const hours = Math.floor(data.worked_hours);
                    const minutes = Math.round((data.worked_hours % 1) * 60);
                    dailyHoursElement.textContent = `${hours}h ${minutes}min`;
                }

                // Пересчитываем и обновляем Total Hours и Summary
                recalculateAndUpdateTotalHours();
                recalculateAndUpdateSummaryContainer();

                // Принудительно закрываем модальное окно после сохранения
                closeEditModal();
            } else {
                console.error('Ошибка при сохранении времени:', data ? data.message : 'Неизвестная ошибка');
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


function closeEditModal() {
    const editModal = document.getElementById('editTimeModal');
    if (editModal) {
        editModal.style.display = 'none';
        console.log("Модальное окно закрыто."); // Отладка: проверка закрытия окна
    } else {
        console.error("Не найден элемент с id 'editTimeModal'");
    }
}


function recalculateAndUpdateTotalHours() {
    let totalHours = 0;

    // Перебираем все элементы с классом `daily-hours` и суммируем значения
    document.querySelectorAll('.daily-hours').forEach(element => {
        const timeText = element.textContent.trim();
        const [hours, minutes] = timeText.split('h').map(part => parseInt(part.trim(), 10) || 0);
        totalHours += hours + (minutes / 60);
    });

    // Округляем до двух знаков после запятой
    const roundedTotalHours = parseFloat(totalHours.toFixed(2));

    // Обновляем общее количество часов
    const totalHoursElement = document.querySelector('.total-hours-display');
    if (totalHoursElement) {
        const displayHours = Math.floor(roundedTotalHours);
        const displayMinutes = Math.round((roundedTotalHours % 1) * 60);
        totalHoursElement.textContent = `${displayHours}h ${displayMinutes}min`;
    }
}

// Функция для пересчета и обновления контейнера Summary
function recalculateAndUpdateSummaryContainer() {
    let totalHours = 0;
    let totalDays = 0;
    let paidHolidays = 0;
    let unpaidHolidays = 0;
    document.querySelectorAll('.employee-log .logs-table tbody tr').forEach(row => {
        const dailyHoursText = row.querySelector('.daily-hours').textContent.trim();
        const holidayStatus = row.querySelector('select[name="holiday_type"]').value;
        if (dailyHoursText) {
            const [hours, minutes] = dailyHoursText.split('h').map(part => parseInt(part.trim(), 10) || 0);
            totalHours += hours + (minutes / 60);
            totalDays += 1;
        }
        if (holidayStatus === 'Paid') {
            paidHolidays += 1;
        } else if (holidayStatus === 'Unpaid') {
            unpaidHolidays += 1;
        }
    });
    totalHours = parseFloat(totalHours.toFixed(2));
    const totalHoursElement = document.querySelector('.total-hours-display');
    const totalDaysElement = document.querySelector('.total-days-display');
    const paidHolidaysElement = document.querySelector('.paid-holidays-display');
    const unpaidHolidaysElement = document.querySelector('.unpaid-holidays-display');
    if (totalHoursElement) {
        const displayHours = Math.floor(totalHours);
        const displayMinutes = Math.round((totalHours % 1) * 60);
        totalHoursElement.textContent = `${displayHours}h ${displayMinutes}min`;
    }
    if (totalDaysElement) totalDaysElement.textContent = totalDays;
    if (paidHolidaysElement) paidHolidaysElement.textContent = paidHolidays;
    if (unpaidHolidaysElement) unpaidHolidaysElement.textContent = unpaidHolidays;
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

function applyGroupFilter() {
    const cocinaChecked = document.getElementById('filterCocina').checked;
    const salaChecked = document.getElementById('filterSala').checked;

    let groupFilters = [];

    // Проверяем, какие группы выбраны
    if (cocinaChecked) groupFilters.push('cocina');
    if (salaChecked) groupFilters.push('sala');

    // Перенаправляем на страницу с выбранными группами
    if (groupFilters.length > 0) {
        window.location.href = `/work?groups=${groupFilters.join(',')}`;
    } else {
        window.location.href = '/work'; // Если не выбрано ни одной группы, показываем всех сотрудников
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
    const selectedEmployees = Array.from(document.querySelectorAll('input.checkbox-input:checked')).map(input => input.id.split('_')[1]);

    if (selectedEmployees.length === 0) {
        alert("Пожалуйста, выберите хотя бы одного сотрудника для экспорта.");
        return;
    }

    fetch('/export_excel', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ employee_ids: selectedEmployees })
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
            applyFilter(filterType);
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
document.querySelector('#dotButton').addEventListener('click', function(event) {
    const modal = document.getElementById('editTimeModal');

    // Установка позиции модального окна
    const selectLabel = document.querySelector('.select-label');
    const labelRect = selectLabel.getBoundingClientRect();

    // Расчет позиции модального окна
    modal.style.left = `${labelRect.left}px`; // Позиция по оси X
    modal.style.top = `${labelRect.bottom + window.scrollY}px`; // Позиция по оси Y с учетом прокрутки

    // Показать модальное окно и оверлей
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

    // Формируем строку для отображения
    return `${hours}h ${minutes}min`;
}
function updateTotalHours() {
    let totalHours = 0;

    // Проходим по всем элементам рабочих часов для выбранного сотрудника
    document.querySelectorAll('.employee-log .logs-table tbody tr .daily-hours').forEach(hourCell => {
        const timeText = hourCell.textContent.trim();
        const [hours, minutes] = timeText.split('h').map(part => part.trim());

        // Суммируем часы и минуты
        totalHours += parseInt(hours, 10) + (parseInt(minutes, 10) / 60);
    });

    // Обновляем отображение на странице
    const totalHoursElement = document.getElementById(`total-hours-${currentEmployeeId}`);
    if (totalHoursElement) {
        const displayHours = Math.floor(totalHours);
        const displayMinutes = Math.round((totalHours % 1) * 60);
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

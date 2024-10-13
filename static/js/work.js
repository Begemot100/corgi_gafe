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
    if (modal) {
        modal.style.display = (modal.style.display === 'block') ? 'none' : 'block';
    } else {
        console.error("Элемент модального окна не найден");
    }
}

// Функция открытия модального окна редактирования времени
function openEditModal(employeeId) {
    currentEmployeeId = employeeId;
    document.getElementById('editTimeModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editTimeModal').style.display = 'none';
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
        openEditModal(selectedEmployeeIds[0]); // Открываем модальное окно для одного выбранного сотрудника
    }
}

// Функция загрузки и отображения модального окна для редактирования
function loadEditModal() {
    fetch('/edit_modal')
        .then(response => response.text())
        .then(html => {
            document.getElementById('editModalContainer').innerHTML = html;
            document.getElementById('editTimeModal').style.display = 'block';
        })
        .catch(error => console.error('Ошибка загрузки модального окна:', error));
}

// Функция открытия модального окна редактирования времени
function openEditModal(employeeId) {
    currentEmployeeId = employeeId;
    employeeLogs = {};

    fetch(`/get_employee_logs/${employeeId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                data.logs.forEach(log => {
                    employeeLogs[log.date] = {
                        logId: log.log_id,
                        checkInTime: log.check_in_time || '--:--',
                        checkOutTime: log.check_out_time || '--:--',
                        worked_hours: log.worked_hours
                    };
                });

                const dateSelect = document.getElementById('editDate');
                dateSelect.innerHTML = '<option value="">-- Выберите дату --</option>';

                for (const date in employeeLogs) {
                    const option = document.createElement('option');
                    option.value = date;
                    option.textContent = date;
                    dateSelect.appendChild(option);
                }

                document.getElementById('editCheckIn').value = '';
                document.getElementById('editCheckOut').value = '';
                document.getElementById('editTimeModal').style.display = 'block';
            }
        })
        .catch(error => console.error('Ошибка загрузки логов:', error));
}

function updateSelectedLogId() {
    const selectedDate = document.getElementById('editDate').value;

    if (employeeLogs[selectedDate]) {
        const { logId, checkInTime, checkOutTime } = employeeLogs[selectedDate];
        selectedLogId = logId;

        // Заполняем поля времени
        document.getElementById('editCheckIn').value = checkInTime !== '--:--' ? checkInTime : '';
        document.getElementById('editCheckOut').value = checkOutTime !== '--:--' ? checkOutTime : '';
    } else {
        selectedLogId = null;
        document.getElementById('editCheckIn').value = '';
        document.getElementById('editCheckOut').value = '';
    }
}

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

// Сохранение отредактированного времени
function saveEditedTime() {
    const checkInTime = document.getElementById('editCheckIn').value;
    const checkOutTime = document.getElementById('editCheckOut').value;
    const selectedDate = document.getElementById('editDate').value;

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
            if (data.success) {
                // Обновляем отображаемые значения
                document.getElementById(`check-in-time-${selectedLogId}`).textContent = checkInTime || '--:--';
                document.getElementById(`check-out-time-${selectedLogId}`).textContent = checkOutTime || '--:--';

                // Пересчитываем рабочие часы
                let totalHours = 0;
                for (const date in employeeLogs) {
                    totalHours += employeeLogs[date].worked_hours || 0; // Суммируем часы
                }

                // Обновляем элемент с общими часами
                const hours = Math.floor(totalHours);
                const minutes = Math.round((totalHours % 1) * 60);
                document.getElementById(`total-hours-${currentEmployeeId}`).textContent = `${hours}h ${minutes}min`;
                closeEditModal(); // Закрываем модальное окно

            } else {
                alert('Ошибка при сохранении времени');
            }
        })
        .catch(error => console.error('Ошибка:', error));
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
    const overlay = document.getElementById('modalOverlay');

    // Установка позиции модального окна
    const selectLabel = document.querySelector('.select-label');
    const labelRect = selectLabel.getBoundingClientRect();

    // Расчет позиции модального окна
    modal.style.left = `${labelRect.left}px`; // Позиция по оси X
    modal.style.top = `${labelRect.bottom + window.scrollY}px`; // Позиция по оси Y с учетом прокрутки

    // Показать модальное окно и оверлей
    modal.style.display = 'block';
    overlay.style.display = 'block';
});

// Закрытие модального окна
overlay.addEventListener('click', function() {
    closeEditModal();
});

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

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
    let selectedEmployeeId = null;

    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedEmployeeId = checkbox.id.split('_')[1];
        }
    });

    if (selectedEmployeeId) {
        openEditModal(selectedEmployeeId);
    } else {
        alert('Пожалуйста, выберите сотрудника');
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
                document.getElementById(`check-in-time-${selectedLogId}`).textContent = checkInTime || '--:--';
                document.getElementById(`check-out-time-${selectedLogId}`).textContent = checkOutTime || '--:--';

                employeeLogs[selectedDate] = {
                    logId: selectedLogId,
                    checkInTime: checkInTime,
                    checkOutTime: checkOutTime,
                    worked_hours: data.worked_hours
                };

                let totalHours = 0;
                for (const date in employeeLogs) {
                    totalHours += employeeLogs[date].worked_hours || 0;
                }

                const hours = Math.floor(totalHours);
                const minutes = Math.round((totalHours % 1) * 60);
                document.getElementById(`total-hours-${currentEmployeeId}`).textContent = `${hours}h ${minutes}min`;

                closeEditModal();
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

function applyGroupFilter(group) {
    if (group === 'all') {
        window.location.href = '/work'; // Перенаправление на страницу со всеми сотрудниками
    } else {
        window.location.href = `/work?group=${group}`; // Перенаправление на страницу с выбранной группой
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
    const modal = document.getElementById('editTimeModal');
    modal.style.display = 'none';
    overlay.style.display = 'none';
});
function applyDateFilter() {
    const selectedDate = document.getElementById("datePicker").value;
    document.getElementById("selectedDateDisplay").textContent = selectedDate; // Отображаем выбранную дату

    fetch(`/get_logs_by_date?date=${selectedDate}`)
        .then(response => response.json())
        .then(data => {
            // Очищаем текущие логи
            const logsContainer = document.querySelector(".work-logs");
            logsContainer.innerHTML = '';

            if (data.length === 0) {
                const message = document.createElement('div');
                message.textContent = 'Нет записей для выбранной даты.';
                logsContainer.appendChild(message);
                return;
            }

            // Заполняем таблицу данными
            data.forEach(log => {
                const employeeLog = document.createElement('div');
                employeeLog.classList.add('employee-log');
                employeeLog.innerHTML = `
                    <input type="checkbox" class="checkbox-input" id="employee_${log.employeeId}">
                    <label class="checkbox-label" for="employee_${log.employeeId}"></label>
                    <h2>${log.employeeName} - ${log.position}</h2>
                    <div class="logs-container">
                        <table class="logs-table">
                            <thead>
                                <tr>
                                    <th>Fecha</th>
                                    <th>Entra</th>
                                    <th>Salida</th>
                                    <th>Total</th>
                                    <th>Holidays</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>${log.logDate}</td>
                                    <td>${log.checkInTime || '--:--'}</td>
                                    <td>${log.checkOutTime || '--:--'}</td>
                                    <td>${log.totalHours ? log.totalHours.toFixed(2) + ' hours' : '0 hours'}</td>
                                    <td>
                                        <select onchange="updateHolidayStatus('${log.holidayId}', this.value)">
                                            <option value="workingday" ${log.holidays === 'Working day' ? 'selected' : ''}>Working day</option>
                                            <option value="paid" ${log.holidays === 'Paid' ? 'selected' : ''}>Paid</option>
                                            <option value="unpaid" ${log.holidays === 'Unpaid' ? 'selected' : ''}>Unpaid</option>
                                            <option value="weekend" ${log.holidays === 'Weekend' ? 'selected' : ''}>Weekend</option>
                                        </select>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                `;
                logsContainer.appendChild(employeeLog);
            });

            // Обновление общей информации о часах
            const totalHours = data.reduce((sum, log) => sum + (log.totalHours || 0), 0);
            document.getElementById('total-hours-display').textContent = `Общее количество часов: ${totalHours.toFixed(2)}`;
        })
        .catch(error => console.error('Ошибка при получении данных:', error));
}


function resetFilter() {
    // Сбрасываем выбранную дату
    document.getElementById("datePicker").value = '';
    document.getElementById("selectedDateDisplay").textContent = ''; // Очищаем отображаемую дату
    // Перенаправляем на страницу с логами без фильтров
    window.location.href = '/work';
}

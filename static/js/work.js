let selectedLogId = null;
let employeeLogs = {}; // Сохраняем логи по датам для текущего сотрудника
let currentEmployeeId = null; // Сохраняем текущего выбранного сотрудника
let allSelected = false;

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

// Функция открытия модального окна
function openEditModal(employeeId) {
    currentEmployeeId = employeeId;
    employeeLogs = {};

    // Загрузка логов с сервера, чтобы убедиться, что данные актуальны
    fetch(`/get_employee_logs/${employeeId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Заполнение employeeLogs с правильными данными
                data.logs.forEach(log => {
                    employeeLogs[log.date] = {
                        logId: log.log_id,
                        checkInTime: log.check_in_time || '--:--',
                        checkOutTime: log.check_out_time || '--:--',
                        worked_hours: log.worked_hours
                    };
                });

                // Заполнение выпадающего списка дат
                const dateSelect = document.getElementById('editDate');
                dateSelect.innerHTML = '';
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = '-- Выберите дату --';
                dateSelect.appendChild(defaultOption);

                for (const date in employeeLogs) {
                    const option = document.createElement('option');
                    option.value = date;
                    option.textContent = date;
                    dateSelect.appendChild(option);
                }

                // Сброс значений времени
                document.getElementById('editCheckIn').value = '';
                document.getElementById('editCheckOut').value = '';

                // Показ модального окна
                document.getElementById('editTimeModal').style.display = 'block';
            }
        })
        .catch(error => console.error('Ошибка загрузки логов:', error));
}
function saveHolidayStatus(logId, newStatus) {
    fetch(`/update_holiday_status/${logId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ holiday_status: newStatus })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            // Обновляем статус отпуска в локальном объекте
            employeeLogs[selectedDate].holidays = newStatus;
            console.log(`Статус для ${selectedLogId} обновлен на ${newStatus}`);
        } else {
            console.error('Ошибка обновления статуса отпуска');
        }
    })
    .catch(error => console.error('Ошибка:', error));
}
// Функция для обновления logId и времени при выборе новой даты
function updateSelectedLogId() {
    const selectedDate = document.getElementById('editDate').value;

    if (employeeLogs[selectedDate]) {
        const { logId, checkInTime, checkOutTime } = employeeLogs[selectedDate];
        selectedLogId = logId;

        document.getElementById('editCheckIn').value = checkInTime !== '--:--' ? checkInTime : '';
        document.getElementById('editCheckOut').value = checkOutTime !== '--:--' ? checkOutTime : '';
    } else {
        selectedLogId = null;
        document.getElementById('editCheckIn').value = '';
        document.getElementById('editCheckOut').value = '';
    }
}
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
            body: JSON.stringify({
                check_in_time: checkInTime,
                check_out_time: checkOutTime
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Обновляем отображение времени Check-in и Check-out
                document.getElementById(`check-in-time-${selectedLogId}`).textContent = checkInTime || '--:--';
                document.getElementById(`check-out-time-${selectedLogId}`).textContent = checkOutTime || '--:--';

                // Обновляем employeeLogs для актуальности данных
                employeeLogs[selectedDate] = {
                    logId: selectedLogId,
                    checkInTime: checkInTime,
                    checkOutTime: checkOutTime,
                    worked_hours: data.worked_hours
                };

                // Пересчитываем и обновляем общее количество часов
                let totalHours = 0;
                for (const date in employeeLogs) {
                    const workedHours = employeeLogs[date].worked_hours || 0;
                    totalHours += workedHours;
                }

                const hours = Math.floor(totalHours);
                const minutes = Math.round((totalHours % 1) * 60);
                const totalHoursElement = document.getElementById(`total-hours-${currentEmployeeId}`);

                if (totalHoursElement) {
                    totalHoursElement.textContent = `${hours}h ${minutes}min`;
                } else {
                    console.warn(`Элемент для total-hours не найден для сотрудника ID: ${currentEmployeeId}`);
                }

                closeEditModal();
            } else {
                alert('Ошибка при сохранении времени');
            }
        })
        .catch(error => console.error('Ошибка:', error));
    }
}

function exportExcel() {
    // Получаем ID всех выбранных сотрудников
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
        const url = window.URL.createObjectURL(new Blob([blob]));
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

function updateHolidayStatus(logId, status) {
    // Преобразуем статус в правильный формат
    let formattedStatus;
    switch (status.toLowerCase()) {
        case 'workingday':
            formattedStatus = 'Working day';
            break;
        case 'paid':
            formattedStatus = 'Paid';
            break;
        case 'unpaid':
            formattedStatus = 'Unpaid';
            break;
        case 'weekend':
            formattedStatus = 'Weekend';
            break;
        default:
            console.error('Неверный статус');
            return; // Прекращаем выполнение, если статус некорректен
    }

    // Отправляем обновленный статус на сервер
    fetch(`/update_holiday_status/${logId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ holiday_status: formattedStatus })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            console.log(data.message);
        } else if (data.error) {
            console.error(data.error);
        }
    })
    .catch(error => {
        console.error('Ошибка:', error);
    });
}


// Закрытие модального окна
function closeEditModal() {
    document.getElementById('editTimeModal').style.display = 'none';
}

// Функция для выбора всех сотрудников или снятия галочек
function selectAllEmployees() {
    const checkboxes = document.querySelectorAll('.checkbox-input');
    checkboxes.forEach(checkbox => checkbox.checked = !allSelected);
    allSelected = !allSelected;
}

// Функция для управления модальными окнами и меню
function toggleDropdown() { document.getElementById("dropdown-menu").classList.toggle("show"); }
function toggleGroupDropdown() { document.getElementById("group-dropdown-menu").classList.toggle("show"); }
function applyFilter(filterType) { window.location.href = `/work?filter=${filterType}`; }
function applyGroupFilter(groupType) { window.location.href = `/work?group=${groupType}`; }
function applyDateFilter() { const selectedDate = document.getElementById("datePicker").value; if (selectedDate) { window.location.href = `/work?date=${selectedDate}`; } }
function toggleModal() { const modal = document.getElementById('modal'); modal.style.display = (modal.style.display === 'block') ? 'none' : 'block'; }

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

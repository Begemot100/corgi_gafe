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




function loadEditModal() {
    fetch('/edit_modal')
        .then(response => response.text())
        .then(html => {
            document.getElementById('editModalContainer').innerHTML = html;
            const editModal = document.getElementById('editTimeModal');
            if (editModal) {
                editModal.style.display = 'block'; // Показываем модальное окно
            } else {
                console.error("editTimeModal не найден после загрузки.");
            }
        })
        .catch(error => console.error('Ошибка загрузки модального окна:', error));
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
        loadEditModal(); // Открывает и загружает модальное окно редактирования
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

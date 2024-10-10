// Флаг для отслеживания состояния выбора всех чекбоксов
let allSelected = false;

// Функция для выбора всех сотрудников или снятия галочек
function selectAllEmployees() {
    const checkboxes = document.querySelectorAll('.checkbox-input');

    // Если все чекбоксы уже выбраны, снимаем выбор
    if (allSelected) {
        checkboxes.forEach(checkbox => checkbox.checked = false);
        allSelected = false; // Обновляем флаг
    } else {
        // Если чекбоксы не выбраны, выбираем всех
        checkboxes.forEach(checkbox => checkbox.checked = true);
        allSelected = true; // Обновляем флаг
    }
}
function updateHolidayStatus(logId, holidayType) {
    const formattedHolidayType = holidayType.charAt(0).toUpperCase() + holidayType.slice(1).toLowerCase();
    fetch(`/update_holiday_status/${logId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ holiday_status: formattedHolidayType })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            console.error('Ошибка:', data.error);
        } else {
            console.log(data.message);
        }
    })
    .catch(error => console.error('Ошибка при обновлении статуса:', error));
}



// Функция для экспорта выбранных сотрудников в Excel
function exportExcel() {
    // Собираем IDs выбранных сотрудников
    const selectedEmployees = [];
    const checkboxes = document.querySelectorAll('.checkbox-input:checked');

    checkboxes.forEach(checkbox => {
        selectedEmployees.push(checkbox.id.replace('employee_', '')); // Извлекаем ID сотрудника
    });

    if (selectedEmployees.length === 0) {
        alert("Пожалуйста, выберите хотя бы одного сотрудника для экспорта.");
        return;
    }

    fetch('/export_excel', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ employee_ids: selectedEmployees }) // Отправляем ID выбранных сотрудников
    })
    .then(response => {
        if (response.ok) {
            return response.blob();
        } else {
            throw new Error('Ошибка экспорта данных');
        }
    })
    .then(blob => {
        const url = window.URL.createObjectURL(new Blob([blob]));
        const a = document.createElement('a');
        a.href = url;
        a.setAttribute('download', 'work_logs.xlsx');
        document.body.appendChild(a);
        a.click();
        a.remove();
    })
    .catch(error => {
        console.error('Ошибка при экспорте:', error);
    });
}

// Функции для работы с выпадающими меню
function toggleDropdown() {
    document.getElementById("dropdown-menu").classList.toggle("show");
}

function toggleGroupDropdown() {
    document.getElementById("group-dropdown-menu").classList.toggle("show");
}

// Закрытие выпадающего меню при клике вне его
window.onclick = function(event) {
    if (!event.target.matches('.filter-btn')) {
        var dropdowns = document.getElementsByClassName("dropdown-menu");
        for (var i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

// Применение фильтра по типу
function applyFilter(filterType) {
    window.location.href = `/work?filter=${filterType}`;
}

// Применение фильтра по группе (Cocina/Sala)
function applyGroupFilter(groupType) {
    window.location.href = `/work?group=${groupType}`;
}

// Применение фильтра по дате
function applyDateFilter() {
    const selectedDate = document.getElementById("datePicker").value;
    if (selectedDate) {
        window.location.href = `/work?date=${selectedDate}`;
    }
}

// Функции для работы с модальным окном
function toggleModal() {
    const modal = document.getElementById('modal');
    modal.style.display = (modal.style.display === 'block') ? 'none' : 'block';
}

// Закрыть модальное окно при нажатии вне его
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target !== modal && !event.target.closest('.dot-icon')) {
        modal.style.display = "none";
    }
}


// Функции для кнопок внутри модального окна
function editEmployee() {
    alert("Edit employee");
}

function exportPdf() {
    alert("Export to PDF");
}

function deleteEmployee() {
    alert("Delete employee");
}

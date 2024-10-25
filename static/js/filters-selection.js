// filters-selection.js

// Применение фильтра по группам (Cocina/Sala)
function applyGroupFilter(group) {
    console.log("Фильтр группы активирован: " + group);  // Отладочный вывод в консоль
    const url = new URL(window.location.href);
    if (group === 'All') {
        url.searchParams.delete('groups');
    } else {
        url.searchParams.set('groups', group);
    }
    console.log("Обновленный URL: " + url.href);  // Выводим обновленный URL для проверки
    window.location.href = url.href;  // Перезагружаем страницу с обновленным параметром
}



// Применение фильтра по дате
function applyDateFilter() {
    const selectedDate = document.getElementById('datePicker').value;
    if (selectedDate) {
        window.location.href = `/work?date=${selectedDate}`;
    }
}

// Выбор всех сотрудников
let allSelected = false;  // Объявлено один раз

function selectAllEmployees() {
    const checkboxes = document.querySelectorAll('.checkbox-input');
    checkboxes.forEach(checkbox => checkbox.checked = !allSelected);
    allSelected = !allSelected;
}


// filters.js

// Применение фильтра по группам (Cocina/Sala)
function applyGroupFilter() {
    const cocinaChecked = document.getElementById('filterCocina').checked;
    const salaChecked = document.getElementById('filterSala').checked;

    let groupFilters = [];
    if (cocinaChecked) groupFilters.push('cocina');
    if (salaChecked) groupFilters.push('sala');

    window.location.href = groupFilters.length > 0 ? `/work?groups=${groupFilters.join(',')}` : '/work';
}

// Применение фильтра по дате
function applyDateFilter() {
    const selectedDate = document.getElementById('datePicker').value;
    if (selectedDate) {
        window.location.href = `/work?date=${selectedDate}`;
    }
}

// Выбор всех сотрудников
let allSelected = false;
function selectAllEmployees() {
    const checkboxes = document.querySelectorAll('.checkbox-input');
    checkboxes.forEach(checkbox => checkbox.checked = !allSelected);
    allSelected = !allSelected;
}

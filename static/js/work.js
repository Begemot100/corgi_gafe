// work.js

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

function exportExcel() {
    alert("Export to Excel");
}

function exportPdf() {
    alert("Export to PDF");
}

function deleteEmployee() {
    alert("Delete employee");
}

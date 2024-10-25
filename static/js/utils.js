// utils.js

function toggleDropdown(menuId) {
    const dropdownMenu = document.getElementById(menuId);
    if (dropdownMenu) {
        dropdownMenu.classList.toggle("show");
    } else {
        console.error(`Элемент с id ${menuId} не найден`);
    }
}

function formatDate(date) {
    if (!date) {
        console.error('Date is undefined or null');
        return '';
    }
    return date.toISOString().split('T')[0];
}

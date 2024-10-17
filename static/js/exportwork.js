// В файле exportwork.js

// Функция для открытия модального окна экспорта
function openExportModal() {
    const exportModal = document.getElementById("exportModal");
    exportModal.style.display = "block";
}

// Закрытие модального окна экспорта при нажатии на крестик
document.querySelector(".export-close").onclick = function() {
    document.getElementById("exportModal").style.display = "none";
};

// Закрытие модального окна экспорта при нажатии вне его
window.addEventListener('click', (event) => {
    const exportModal = document.getElementById("exportModal");
    if (event.target === exportModal) {
        exportModal.style.display = "none";
    }
});

// Обработчик нажатия на кнопку экспорта
document.querySelector('.export-button').addEventListener('click', () => {
    openExportModal();

    // После завершения загрузки экспортного файла закрываем модальное окно
    setTimeout(() => {
        const exportModal = document.getElementById("exportModal");
        exportModal.style.display = "none";
    }, 1000); // Подождем 1 секунду для завершения загрузки
});

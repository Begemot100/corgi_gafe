// export.js

function exportExcel() {
    const selectedEmployees = Array.from(document.querySelectorAll('input.checkbox-input:checked'))
                                  .map(input => input.id.split('_')[1]);

    if (selectedEmployees.length === 0) {
        alert("Пожалуйста, выберите хотя бы одного сотрудника для экспорта.");
        return;
    }

    fetch('/export_excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_ids: selectedEmployees })
    })
    .then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'work_logs.xlsx');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    })
    .catch(error => console.error('Ошибка при экспорте в Excel:', error));
}

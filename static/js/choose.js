let currentBranch = 'gotico';

function switchBranch(branch) {
    currentBranch = branch;
    loadBranchData(branch);
}

function loadBranchData(branch) {
    // Загрузите данные филиала с сервера
    fetch(`/load_branch_data?branch=${branch}`)
        .then(response => response.json())
        .then(data => {
            // Обновите UI данными филиала
            document.querySelector('.company-info h1').textContent = data.name;
            document.querySelector('.company-info .address').textContent = data.address;
            document.querySelector('.company-info .phone').textContent = data.phone;
            document.querySelector('.company-info .email').textContent = data.email;
            // Здесь же обновите список сотрудников и любые другие данные
            updateEmployeeList(data.employees);
        })
        .catch(error => console.error('Ошибка загрузки данных филиала:', error));
}

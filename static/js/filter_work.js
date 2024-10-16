function applyFilter(filterType) {
            console.log("Применение фильтра:", filterType);

            const today = new Date();
            let startDate, endDate;

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

            const formatDate = (date) => date.toISOString().split('T')[0];

            console.log("Диапазон дат:", formatDate(startDate), "-", formatDate(endDate));

            // Фильтрация данных на основе диапазона дат
            document.querySelectorAll('.employee-log .logs-table tbody tr').forEach(row => {
                    const logDate = row.getAttribute('data-log-date');
                    const logDateObj = new Date(logDate);
                    const isInDateRange = logDateObj >= startDate && logDateObj <= endDate;

                    console.log(`Дата лога: ${logDate}, Входит в диапазон: ${isInDateRange}`);
                    if (isInDateRange) {
                        row.style.display = ''; // Показать строку
                    } else {
                        row.style.display = 'none'; // Скрыть строку
                    }




            });

            document.getElementById('selectedDateDisplay').textContent = `${filterType.replace('_', ' ').toUpperCase()}: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
        }

        function applyFilterByDate(date) {
            console.log("Выбранная дата для фильтрации:", date);

            document.querySelectorAll('.employee-log .logs-table tbody tr').forEach(row => {
                const logDate = row.getAttribute('data-log-date');
                row.style.display = (logDate === date) ? '' : 'none';
            });
            document.getElementById('selectedDateDisplay').textContent = `Date: ${date}`;
        }

        function resetFilter() {
            document.getElementById("datePicker").value = '';
            document.getElementById("selectedDateDisplay").textContent = '';
            document.querySelectorAll('.employee-log .logs-table tbody tr').forEach(row => {
                row.style.display = '';
            });
        }
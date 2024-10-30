import sqlite3

# Путь к вашей базе данных
db_path = "/Users/germany/Desktop/Storm-Breaker/time_track/pythonProject1/instance/employees.db"

# Подключаемся к базе данных
connection = sqlite3.connect(db_path)
cursor = connection.cursor()

# Добавляем новые столбцы
try:
    cursor.execute("ALTER TABLE employee ADD COLUMN total_hours REAL")
    cursor.execute("ALTER TABLE employee ADD COLUMN total_days INTEGER")
    cursor.execute("ALTER TABLE employee ADD COLUMN paid_holidays INTEGER")
    cursor.execute("ALTER TABLE employee ADD COLUMN unpaid_holidays INTEGER")
    print("Столбцы успешно добавлены.")
except sqlite3.OperationalError as e:
    print("Ошибка при добавлении столбцов:", e)

# Сохраняем изменения и закрываем подключение
connection.commit()
connection.close()

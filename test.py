import time
from datetime import datetime, timedelta


def simulate_new_day():
    # Получаем текущее время
    current_time = datetime.now()

    # Добавляем один день к текущей дате для симуляции новых суток
    new_day = current_time + timedelta(days=1)

    print(f"Симулируем новые сутки: {new_day}")

    # Здесь можно выполнить необходимые обновления или действия,
    # которые симулируют наступление новых суток
    # Например, обновление данных в базе, пересчет и т.д.


# Запуск симуляции сразу
simulate_new_day()

# Если нужно, цикл для повторной симуляции каждые 60 секунд:
while True:
    time.sleep(60)  # Проверять каждые 60 секунд
    simulate_new_day()

from app import app, db

# Создаем контекст приложения
with app.app_context():
    db.create_all()  # Создаем все таблицы

import logging
import sys
import os
from alembic import context

# Добавляем корневой путь проекта в sys.path для поиска модуля `app`
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../'))
sys.path.insert(0, project_root)

try:
    from app import db, app  # Импорт приложения и базы данных
except ImportError as e:
    print(f"Ошибка импорта модуля 'app': {e}")
    sys.exit(1)

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('alembic.runtime.migration')

# Настройка базы данных для Alembic
config = context.config
config.set_main_option('sqlalchemy.url', app.config['SQLALCHEMY_DATABASE_URI'])
target_metadata = db.metadata

# Устанавливаем контекст приложения для Alembic
with app.app_context():
    def run_migrations_online():
        """Запуск миграций в режиме онлайн."""
        connectable = db.engine

        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True  # Проверка изменений в типах столбцов
            )
            with context.begin_transaction():
                context.run_migrations()

    run_migrations_online()

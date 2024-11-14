import logging
from alembic import context
from flask import current_app
from app import app, db  # импортируйте ваше приложение и db из основного файла

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('alembic.runtime.migration')

# Устанавливаем URL базы данных для Alembic
config = context.config
config.set_main_option('sqlalchemy.url', app.config['SQLALCHEMY_DATABASE_URI'])
target_metadata = db.metadata

# Устанавливаем контекст приложения для Alembic
with app.app_context():
    def run_migrations_online():
        """Запуск миграций в режиме онлайн с контекстом приложения."""
        connectable = db.engine

        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True  # сравнение типов для обнаружения изменений
            )
            with context.begin_transaction():
                context.run_migrations()

    run_migrations_online()

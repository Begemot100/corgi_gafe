import logging
from alembic import context
from flask import Flask
from app import db, app  # импорт приложения и db

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('alembic.runtime.migration')

config = context.config
config.set_main_option('sqlalchemy.url', app.config['SQLALCHEMY_DATABASE_URI'])
target_metadata = db.metadata

# Устанавливаем контекст приложения
with app.app_context():
    def run_migrations_online():
        """Запуск миграций в режиме онлайн."""
        connectable = db.engine

        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True
            )
            with context.begin_transaction():
                context.run_migrations()

    run_migrations_online()

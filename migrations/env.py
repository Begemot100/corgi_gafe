import logging
from logging.config import fileConfig
from alembic import context
from app import app, db  # Импортируйте приложение и базу данных
from flask import current_app

# Настройка логирования
config = context.config
fileConfig(config.config_file_name)
logger = logging.getLogger('alembic.env')

# Устанавливаем URL базы данных для Alembic, используя контекст приложения
with app.app_context():
    config.set_main_option('sqlalchemy.url', app.config['SQLALCHEMY_DATABASE_URI'])

# Настройка для метаданных
target_metadata = db.metadata

def run_migrations_offline():
    """Запуск миграций в 'offline' режиме."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Запуск миграций в 'online' режиме."""
    connectable = db.engine

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()

# Выбор режима миграции
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

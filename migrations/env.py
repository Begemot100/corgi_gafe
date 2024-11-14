from alembic import context
from sqlalchemy import engine_from_config, pool
from logging.config import fileConfig
import os

# Загрузка конфигурации логирования из файла alembic.ini
fileConfig(context.config.config_file_name)

# Установка URL базы данных из переменной окружения
config = context.config
config.set_main_option('sqlalchemy.url', os.getenv('DATABASE_URL'))

# Пример задания метаданных
from app import db
target_metadata = db.metadata

def run_migrations_offline():
    """Запуск миграций в оффлайн-режиме."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Запуск миграций в онлайн-режиме."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

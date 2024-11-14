import logging
from logging.config import fileConfig
from alembic import context
from sqlalchemy import engine_from_config, pool
from app import app, db  # Импортируем приложение и базу данных

# Настройка логирования
config = context.config
fileConfig(config.config_file_name)
logger = logging.getLogger('alembic.env')

# Установка URL базы данных напрямую из конфигурации приложения
with app.app_context():
    config.set_main_option('sqlalchemy.url', app.config['SQLALCHEMY_DATABASE_URI'])

# Установка метаданных для Alembic
target_metadata = db.metadata

def run_migrations_offline():
    """Запуск миграций в 'offline' режиме."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Запуск миграций в 'online' режиме."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, compare_type=True)

        with context.begin_transaction():
            context.run_migrations()

# Выбор режима миграции
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

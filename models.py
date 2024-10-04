from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

# Модель для сотрудников
class Employee(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    nie = db.Column(db.String(20), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    hours_per_week = db.Column(db.Integer, nullable=False)
    days_per_week = db.Column(db.Integer, nullable=False)
    position = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    section = db.Column(db.String(50), nullable=False)
    check_in_time = db.Column(db.DateTime, nullable=True)
    check_out_time = db.Column(db.DateTime, nullable=True)
    daily_hours = db.Column(db.Float, default=0)
    monthly_hours = db.Column(db.Float, default=0)
    lunch_start_time = db.Column(db.DateTime, nullable=True)
    lunch_end_time = db.Column(db.DateTime, nullable=True)

    work_logs = db.relationship('WorkLog', backref='employee', cascade="all, delete-orphan", lazy=True)

    def __repr__(self):
        return f'<Employee {self.full_name}>'

# Модель для записей рабочего времени
class WorkLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employee.id'), nullable=False)
    check_in_time = db.Column(db.DateTime, nullable=False)
    lunch_start_time = db.Column(db.DateTime, nullable=True)
    lunch_end_time = db.Column(db.DateTime, nullable=True)
    check_out_time = db.Column(db.DateTime, nullable=True)
    worked_hours = db.Column(db.Float, default=0)
    log_date = db.Column(db.Date, nullable=False)

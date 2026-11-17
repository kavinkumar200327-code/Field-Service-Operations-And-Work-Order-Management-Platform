"""initial_schema

Revision ID: 1dab17780e74
Revises: 
Create Date: 2026-10-29 10:06:08.917490

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import String, Integer, Text, Boolean, DateTime, Numeric, Float, Date, Time
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '1dab17780e74'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### Create table parts ###
    op.create_table(
        'parts',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('sku', String(length=100), nullable=False, unique=True),
        sa.Column('name', String(length=255), nullable=False),
        sa.Column('description', Text(), nullable=True),
        sa.Column('available_quantity', Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('reserved_quantity', Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('unit_cost', Numeric(precision=10, scale=2), nullable=False, server_default=sa.text('0.0')),
        sa.Column('reorder_threshold', Integer(), nullable=False, server_default=sa.text('5')),
        sa.Column('status', String(length=50), nullable=False, server_default=sa.text('IN_STOCK')),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f('ix_parts_sku'), 'parts', ['sku'], unique=True)
    op.create_index(op.f('ix_parts_name'), 'parts', ['name'], unique=False)
    op.create_index(op.f('ix_parts_status'), 'parts', ['status'], unique=False)

    # ### Create table roles ###
    op.create_table(
        'roles',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('name', String(length=50), nullable=False, unique=True),
        sa.Column('description', String(length=255), nullable=True),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f('ix_roles_name'), 'roles', ['name'], unique=True)

    # ### Create table service_categories ###
    op.create_table(
        'service_categories',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('name', String(length=100), nullable=False, unique=True),
        sa.Column('description', Text(), nullable=True),
        sa.Column('is_active', Boolean(), nullable=False, server_default=sa.text('True')),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f('ix_service_categories_name'), 'service_categories', ['name'], unique=True)

    # ### Create table users ###
    op.create_table(
        'users',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('email', String(length=255), nullable=False, unique=True),
        sa.Column('password_hash', String(length=255), nullable=False),
        sa.Column('full_name', String(length=255), nullable=False),
        sa.Column('phone', String(length=50), nullable=True),
        sa.Column('role', String(length=50), nullable=False, server_default=sa.text('CUSTOMER')),
        sa.Column('is_active', Boolean(), nullable=False, server_default=sa.text('True')),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', DateTime(timezone=True), nullable=False),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)

    # ### Create table audit_logs ###
    op.create_table(
        'audit_logs',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('user_id', UUID(), nullable=True),
        sa.Column('action', String(length=100), nullable=False),
        sa.Column('entity_type', String(length=100), nullable=False),
        sa.Column('entity_id', String(length=100), nullable=False),
        sa.Column('old_values', JSON(), nullable=True),
        sa.Column('new_values', JSON(), nullable=True),
        sa.Column('ip_address', String(length=50), nullable=True),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )
    op.create_index(op.f('ix_audit_logs_entity_type'), 'audit_logs', ['entity_type'], unique=False)
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'], unique=False)
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_entity_id'), 'audit_logs', ['entity_id'], unique=False)
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'], unique=False)

    # ### Create table customers ###
    op.create_table(
        'customers',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('user_id', UUID(), nullable=True, unique=True),
        sa.Column('name', String(length=255), nullable=False),
        sa.Column('email', String(length=255), nullable=False),
        sa.Column('phone', String(length=50), nullable=False),
        sa.Column('address', Text(), nullable=False),
        sa.Column('service_location', Text(), nullable=False),
        sa.Column('customer_type', String(length=50), nullable=False, server_default=sa.text('INDIVIDUAL')),
        sa.Column('status', String(length=50), nullable=False, server_default=sa.text('ACTIVE')),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )
    op.create_index(op.f('ix_customers_email'), 'customers', ['email'], unique=False)
    op.create_index(op.f('ix_customers_name'), 'customers', ['name'], unique=False)
    op.create_index(op.f('ix_customers_status'), 'customers', ['status'], unique=False)
    op.create_index(op.f('ix_customers_user_id'), 'customers', ['user_id'], unique=True)

    # ### Create table notifications ###
    op.create_table(
        'notifications',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('user_id', UUID(), nullable=False),
        sa.Column('title', String(length=255), nullable=False),
        sa.Column('message', Text(), nullable=False),
        sa.Column('type', String(length=50), nullable=False, server_default=sa.text('WORK_ORDER_CREATED')),
        sa.Column('link_url', String(length=255), nullable=True),
        sa.Column('is_read', Boolean(), nullable=False, server_default=sa.text('False')),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )
    op.create_index(op.f('ix_notifications_is_read'), 'notifications', ['is_read'], unique=False)
    op.create_index(op.f('ix_notifications_type'), 'notifications', ['type'], unique=False)
    op.create_index(op.f('ix_notifications_user_id'), 'notifications', ['user_id'], unique=False)
    op.create_index(op.f('ix_notifications_created_at'), 'notifications', ['created_at'], unique=False)

    # ### Create table refresh_tokens ###
    op.create_table(
        'refresh_tokens',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('user_id', UUID(), nullable=False),
        sa.Column('token_hash', String(length=255), nullable=False, unique=True),
        sa.Column('expires_at', DateTime(timezone=True), nullable=False),
        sa.Column('revoked', Boolean(), nullable=False, server_default=sa.text('False')),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )
    op.create_index(op.f('ix_refresh_tokens_user_id'), 'refresh_tokens', ['user_id'], unique=False)
    op.create_index(op.f('ix_refresh_tokens_token_hash'), 'refresh_tokens', ['token_hash'], unique=True)

    # ### Create table services ###
    op.create_table(
        'services',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('category_id', UUID(), nullable=False),
        sa.Column('name', String(length=255), nullable=False),
        sa.Column('description', Text(), nullable=True),
        sa.Column('estimated_duration', Integer(), nullable=False, server_default=sa.text('60')),
        sa.Column('base_price', Numeric(precision=10, scale=2), nullable=False, server_default=sa.text('0.0')),
        sa.Column('required_skills', JSON(), nullable=False),
        sa.Column('required_parts', JSON(), nullable=False),
        sa.Column('status', String(length=50), nullable=False, server_default=sa.text('ACTIVE')),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['category_id'], ['service_categories.id']),
    )
    op.create_index(op.f('ix_services_status'), 'services', ['status'], unique=False)
    op.create_index(op.f('ix_services_name'), 'services', ['name'], unique=False)
    op.create_index(op.f('ix_services_category_id'), 'services', ['category_id'], unique=False)

    # ### Create table technicians ###
    op.create_table(
        'technicians',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('user_id', UUID(), nullable=False, unique=True),
        sa.Column('assigned_region', String(length=100), nullable=False, server_default=sa.text('Metro Area')),
        sa.Column('employment_status', String(length=50), nullable=False, server_default=sa.text('FULL_TIME')),
        sa.Column('availability_status', String(length=50), nullable=False, server_default=sa.text('AVAILABLE')),
        sa.Column('work_start_time', String(length=10), nullable=False, server_default=sa.text('08:00')),
        sa.Column('work_end_time', String(length=10), nullable=False, server_default=sa.text('17:00')),
        sa.Column('working_days', JSON(), nullable=False),
        sa.Column('service_categories', JSON(), nullable=False),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )
    op.create_index(op.f('ix_technicians_availability_status'), 'technicians', ['availability_status'], unique=False)
    op.create_index(op.f('ix_technicians_employment_status'), 'technicians', ['employment_status'], unique=False)
    op.create_index(op.f('ix_technicians_assigned_region'), 'technicians', ['assigned_region'], unique=False)
    op.create_index(op.f('ix_technicians_user_id'), 'technicians', ['user_id'], unique=True)

    # ### Create table service_requests ###
    op.create_table(
        'service_requests',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('request_number', String(length=50), nullable=False, unique=True),
        sa.Column('customer_id', UUID(), nullable=False),
        sa.Column('service_id', UUID(), nullable=False),
        sa.Column('service_location', Text(), nullable=False),
        sa.Column('preferred_schedule', DateTime(timezone=True), nullable=True),
        sa.Column('priority', String(length=50), nullable=False, server_default=sa.text('MEDIUM')),
        sa.Column('status', String(length=50), nullable=False, server_default=sa.text('NEW')),
        sa.Column('issue_description', Text(), nullable=False),
        sa.Column('attachments', JSON(), nullable=False),
        sa.Column('review_notes', Text(), nullable=True),
        sa.Column('rejection_reason', Text(), nullable=True),
        sa.Column('cancellation_reason', Text(), nullable=True),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id']),
        sa.ForeignKeyConstraint(['service_id'], ['services.id']),
    )
    op.create_index(op.f('ix_service_requests_request_number'), 'service_requests', ['request_number'], unique=True)
    op.create_index(op.f('ix_service_requests_customer_id'), 'service_requests', ['customer_id'], unique=False)
    op.create_index(op.f('ix_service_requests_priority'), 'service_requests', ['priority'], unique=False)
    op.create_index(op.f('ix_service_requests_status'), 'service_requests', ['status'], unique=False)
    op.create_index(op.f('ix_service_requests_service_id'), 'service_requests', ['service_id'], unique=False)

    # ### Create table technician_availability ###
    op.create_table(
        'technician_availability',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('technician_id', UUID(), nullable=False),
        sa.Column('start_time', DateTime(timezone=True), nullable=False),
        sa.Column('end_time', DateTime(timezone=True), nullable=False),
        sa.Column('type', String(length=50), nullable=False, server_default=sa.text('LEAVE')),
        sa.Column('reason', Text(), nullable=True),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['technician_id'], ['technicians.id']),
    )
    op.create_index(op.f('ix_technician_availability_end_time'), 'technician_availability', ['end_time'], unique=False)
    op.create_index(op.f('ix_technician_availability_start_time'), 'technician_availability', ['start_time'], unique=False)
    op.create_index(op.f('ix_technician_availability_technician_id'), 'technician_availability', ['technician_id'], unique=False)

    # ### Create table technician_skills ###
    op.create_table(
        'technician_skills',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('technician_id', UUID(), nullable=False),
        sa.Column('skill_name', String(length=100), nullable=False),
        sa.Column('proficiency_level', String(length=50), nullable=False, server_default=sa.text('INTERMEDIATE')),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['technician_id'], ['technicians.id']),
    )
    op.create_index(op.f('ix_technician_skills_technician_id'), 'technician_skills', ['technician_id'], unique=False)
    op.create_index(op.f('ix_technician_skills_skill_name'), 'technician_skills', ['skill_name'], unique=False)

    # ### Create table work_orders ###
    op.create_table(
        'work_orders',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('work_order_number', String(length=50), nullable=False, unique=True),
        sa.Column('customer_id', UUID(), nullable=False),
        sa.Column('service_id', UUID(), nullable=False),
        sa.Column('service_request_id', UUID(), nullable=True),
        sa.Column('assigned_technician_id', UUID(), nullable=True),
        sa.Column('service_location', Text(), nullable=False),
        sa.Column('description', Text(), nullable=False),
        sa.Column('priority', String(length=50), nullable=False, server_default=sa.text('MEDIUM')),
        sa.Column('status', String(length=50), nullable=False, server_default=sa.text('DRAFT')),
        sa.Column('scheduled_start', DateTime(timezone=True), nullable=True),
        sa.Column('scheduled_end', DateTime(timezone=True), nullable=True),
        sa.Column('actual_start', DateTime(timezone=True), nullable=True),
        sa.Column('actual_end', DateTime(timezone=True), nullable=True),
        sa.Column('estimated_cost', Numeric(precision=10, scale=2), nullable=False, server_default=sa.text('0.0')),
        sa.Column('actual_cost', Numeric(precision=10, scale=2), nullable=True),
        sa.Column('cancellation_reason', Text(), nullable=True),
        sa.Column('hold_reason', Text(), nullable=True),
        sa.Column('completion_notes', Text(), nullable=True),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['service_request_id'], ['service_requests.id']),
        sa.ForeignKeyConstraint(['assigned_technician_id'], ['technicians.id']),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id']),
        sa.ForeignKeyConstraint(['service_id'], ['services.id']),
    )
    op.create_index(op.f('ix_work_orders_status'), 'work_orders', ['status'], unique=False)
    op.create_index(op.f('ix_work_orders_service_id'), 'work_orders', ['service_id'], unique=False)
    op.create_index(op.f('ix_work_orders_scheduled_start'), 'work_orders', ['scheduled_start'], unique=False)
    op.create_index(op.f('ix_work_orders_customer_id'), 'work_orders', ['customer_id'], unique=False)
    op.create_index(op.f('ix_work_orders_assigned_technician_id'), 'work_orders', ['assigned_technician_id'], unique=False)
    op.create_index(op.f('ix_work_orders_scheduled_end'), 'work_orders', ['scheduled_end'], unique=False)
    op.create_index(op.f('ix_work_orders_work_order_number'), 'work_orders', ['work_order_number'], unique=True)
    op.create_index(op.f('ix_work_orders_service_request_id'), 'work_orders', ['service_request_id'], unique=False)
    op.create_index(op.f('ix_work_orders_priority'), 'work_orders', ['priority'], unique=False)

    # ### Create table feedback ###
    op.create_table(
        'feedback',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('work_order_id', UUID(), nullable=False, unique=True),
        sa.Column('customer_id', UUID(), nullable=False),
        sa.Column('rating', Integer(), nullable=False),
        sa.Column('timeliness_rating', Integer(), nullable=True),
        sa.Column('quality_rating', Integer(), nullable=True),
        sa.Column('professionalism_rating', Integer(), nullable=True),
        sa.Column('comments', Text(), nullable=True),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id']),
        sa.ForeignKeyConstraint(['work_order_id'], ['work_orders.id']),
    )
    op.create_index(op.f('ix_feedback_work_order_id'), 'feedback', ['work_order_id'], unique=True)
    op.create_index(op.f('ix_feedback_customer_id'), 'feedback', ['customer_id'], unique=False)

    # ### Create table inventory_transactions ###
    op.create_table(
        'inventory_transactions',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('part_id', UUID(), nullable=False),
        sa.Column('work_order_id', UUID(), nullable=True),
        sa.Column('transaction_type', String(length=50), nullable=False),
        sa.Column('quantity', Integer(), nullable=False),
        sa.Column('unit_cost', Numeric(precision=10, scale=2), nullable=False, server_default=sa.text('0.0')),
        sa.Column('notes', Text(), nullable=True),
        sa.Column('created_by_user_id', UUID(), nullable=True),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['work_order_id'], ['work_orders.id']),
        sa.ForeignKeyConstraint(['part_id'], ['parts.id']),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id']),
    )
    op.create_index(op.f('ix_inventory_transactions_work_order_id'), 'inventory_transactions', ['work_order_id'], unique=False)
    op.create_index(op.f('ix_inventory_transactions_part_id'), 'inventory_transactions', ['part_id'], unique=False)

    # ### Create table service_reports ###
    op.create_table(
        'service_reports',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('work_order_id', UUID(), nullable=False, unique=True),
        sa.Column('technician_id', UUID(), nullable=False),
        sa.Column('work_summary', Text(), nullable=False),
        sa.Column('diagnosis', Text(), nullable=False),
        sa.Column('actions_performed', Text(), nullable=False),
        sa.Column('parts_used', JSON(), nullable=False),
        sa.Column('start_time', DateTime(timezone=True), nullable=False),
        sa.Column('completion_time', DateTime(timezone=True), nullable=False),
        sa.Column('customer_remarks', Text(), nullable=True),
        sa.Column('recommendations', Text(), nullable=True),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['work_order_id'], ['work_orders.id']),
        sa.ForeignKeyConstraint(['technician_id'], ['technicians.id']),
    )
    op.create_index(op.f('ix_service_reports_work_order_id'), 'service_reports', ['work_order_id'], unique=True)
    op.create_index(op.f('ix_service_reports_technician_id'), 'service_reports', ['technician_id'], unique=False)

    # ### Create table work_order_assignments ###
    op.create_table(
        'work_order_assignments',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('work_order_id', UUID(), nullable=False),
        sa.Column('technician_id', UUID(), nullable=False),
        sa.Column('assigned_by_user_id', UUID(), nullable=True),
        sa.Column('scheduled_start', DateTime(timezone=True), nullable=False),
        sa.Column('scheduled_end', DateTime(timezone=True), nullable=False),
        sa.Column('assigned_at', DateTime(timezone=True), nullable=False),
        sa.Column('unassigned_at', DateTime(timezone=True), nullable=True),
        sa.Column('reason', Text(), nullable=True),
        sa.ForeignKeyConstraint(['work_order_id'], ['work_orders.id']),
        sa.ForeignKeyConstraint(['technician_id'], ['technicians.id']),
        sa.ForeignKeyConstraint(['assigned_by_user_id'], ['users.id']),
    )
    op.create_index(op.f('ix_work_order_assignments_work_order_id'), 'work_order_assignments', ['work_order_id'], unique=False)
    op.create_index(op.f('ix_work_order_assignments_technician_id'), 'work_order_assignments', ['technician_id'], unique=False)

    # ### Create table work_order_parts ###
    op.create_table(
        'work_order_parts',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('work_order_id', UUID(), nullable=False),
        sa.Column('part_id', UUID(), nullable=False),
        sa.Column('quantity', Integer(), nullable=False, server_default=sa.text('1')),
        sa.Column('unit_price', Numeric(precision=10, scale=2), nullable=False, server_default=sa.text('0.0')),
        sa.Column('status', String(length=50), nullable=False, server_default=sa.text('CONSUMED')),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['work_order_id'], ['work_orders.id']),
        sa.ForeignKeyConstraint(['part_id'], ['parts.id']),
    )
    op.create_index(op.f('ix_work_order_parts_part_id'), 'work_order_parts', ['part_id'], unique=False)
    op.create_index(op.f('ix_work_order_parts_work_order_id'), 'work_order_parts', ['work_order_id'], unique=False)

    # ### Create table work_order_status_history ###
    op.create_table(
        'work_order_status_history',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('work_order_id', UUID(), nullable=False),
        sa.Column('previous_status', String(length=50), nullable=True),
        sa.Column('new_status', String(length=50), nullable=False),
        sa.Column('changed_by_user_id', UUID(), nullable=True),
        sa.Column('notes', Text(), nullable=True),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['changed_by_user_id'], ['users.id']),
        sa.ForeignKeyConstraint(['work_order_id'], ['work_orders.id']),
    )
    op.create_index(op.f('ix_work_order_status_history_work_order_id'), 'work_order_status_history', ['work_order_id'], unique=False)

    # ### Create table report_attachments ###
    op.create_table(
        'report_attachments',
        sa.Column('id', UUID(), primary_key=True),
        sa.Column('report_id', UUID(), nullable=False),
        sa.Column('file_name', String(length=255), nullable=False),
        sa.Column('file_path', String(length=500), nullable=False),
        sa.Column('file_size', Integer(), nullable=False),
        sa.Column('content_type', String(length=100), nullable=False),
        sa.Column('attachment_type', String(length=50), nullable=False, server_default=sa.text('DOCUMENT')),
        sa.Column('created_at', DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['report_id'], ['service_reports.id']),
    )
    op.create_index(op.f('ix_report_attachments_report_id'), 'report_attachments', ['report_id'], unique=False)


def downgrade() -> None:
    op.drop_table('report_attachments')
    op.drop_table('work_order_status_history')
    op.drop_table('work_order_parts')
    op.drop_table('work_order_assignments')
    op.drop_table('service_reports')
    op.drop_table('inventory_transactions')
    op.drop_table('feedback')
    op.drop_table('work_orders')
    op.drop_table('technician_skills')
    op.drop_table('technician_availability')
    op.drop_table('service_requests')
    op.drop_table('technicians')
    op.drop_table('services')
    op.drop_table('refresh_tokens')
    op.drop_table('notifications')
    op.drop_table('customers')
    op.drop_table('audit_logs')
    op.drop_table('users')
    op.drop_table('service_categories')
    op.drop_table('roles')
    op.drop_table('parts')
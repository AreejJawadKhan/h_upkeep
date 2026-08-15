"""maintenance schedules

Revision ID: 20260815_0002
Revises: 20260814_0001
Create Date: 2026-08-15 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260815_0002"
down_revision = "20260814_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "maintenance_schedules",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("home_id", sa.Integer(), nullable=False),
        sa.Column("asset_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("frequency", sa.String(length=50), nullable=False),
        sa.Column("next_due_date", sa.Date(), nullable=True),
        sa.Column("last_completed", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reminder_enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["home_id"], ["homes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_maintenance_schedules_id",
        "maintenance_schedules",
        ["id"],
        unique=False,
    )
    op.create_index(
        "ix_maintenance_schedules_user_id",
        "maintenance_schedules",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_maintenance_schedules_home_id",
        "maintenance_schedules",
        ["home_id"],
        unique=False,
    )
    op.create_index(
        "ix_maintenance_schedules_asset_id",
        "maintenance_schedules",
        ["asset_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_maintenance_schedules_asset_id", table_name="maintenance_schedules")
    op.drop_index("ix_maintenance_schedules_home_id", table_name="maintenance_schedules")
    op.drop_index("ix_maintenance_schedules_user_id", table_name="maintenance_schedules")
    op.drop_index("ix_maintenance_schedules_id", table_name="maintenance_schedules")
    op.drop_table("maintenance_schedules")

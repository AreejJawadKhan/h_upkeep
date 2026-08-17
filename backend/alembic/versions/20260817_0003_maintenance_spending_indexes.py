"""maintenance spending indexes

Revision ID: 20260817_0003
Revises: 20260815_0002
Create Date: 2026-08-17 00:00:00.000000
"""

from alembic import op


revision = "20260817_0003"
down_revision = "20260815_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_maintenance_records_user_home_date",
        "maintenance_records",
        ["user_id", "home_id", "date"],
        unique=False,
    )
    op.create_index(
        "ix_maintenance_records_user_category_date",
        "maintenance_records",
        ["user_id", "category", "date"],
        unique=False,
    )
    op.create_index(
        "ix_maintenance_records_user_asset_date",
        "maintenance_records",
        ["user_id", "asset_id", "date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_maintenance_records_user_asset_date", table_name="maintenance_records")
    op.drop_index("ix_maintenance_records_user_category_date", table_name="maintenance_records")
    op.drop_index("ix_maintenance_records_user_home_date", table_name="maintenance_records")

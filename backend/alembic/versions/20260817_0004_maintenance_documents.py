"""maintenance documents

Revision ID: 20260817_0004
Revises: 20260817_0003
Create Date: 2026-08-17 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260817_0004"
down_revision = "20260817_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "maintenance_documents",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("maintenance_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_type", sa.String(length=100), nullable=False),
        sa.Column("cloudinary_public_id", sa.String(length=255), nullable=False),
        sa.Column("cloudinary_resource_type", sa.String(length=50), nullable=False),
        sa.Column("cloudinary_url", sa.String(length=1000), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["maintenance_id"], ["maintenance_records.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_maintenance_documents_id",
        "maintenance_documents",
        ["id"],
        unique=False,
    )
    op.create_index(
        "ix_maintenance_documents_maintenance_id",
        "maintenance_documents",
        ["maintenance_id"],
        unique=False,
    )
    op.create_index(
        "ix_maintenance_documents_user_id",
        "maintenance_documents",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_maintenance_documents_cloudinary_public_id",
        "maintenance_documents",
        ["cloudinary_public_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_maintenance_documents_cloudinary_public_id", table_name="maintenance_documents")
    op.drop_index("ix_maintenance_documents_user_id", table_name="maintenance_documents")
    op.drop_index("ix_maintenance_documents_maintenance_id", table_name="maintenance_documents")
    op.drop_index("ix_maintenance_documents_id", table_name="maintenance_documents")
    op.drop_table("maintenance_documents")

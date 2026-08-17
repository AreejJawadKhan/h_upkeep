"""warranties

Revision ID: 20260817_0005
Revises: 20260817_0004
Create Date: 2026-08-17 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "20260817_0005"
down_revision = "20260817_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "warranties",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("home_id", sa.Integer(), nullable=False),
        sa.Column("asset_id", sa.Integer(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=True),
        sa.Column("provider", sa.String(length=150), nullable=False),
        sa.Column("coverage_details", sa.Text(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("expiration_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["home_id"], ["homes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["document_id"], ["maintenance_documents.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_warranties_id", "warranties", ["id"], unique=False)
    op.create_index("ix_warranties_user_id", "warranties", ["user_id"], unique=False)
    op.create_index("ix_warranties_home_id", "warranties", ["home_id"], unique=False)
    op.create_index("ix_warranties_asset_id", "warranties", ["asset_id"], unique=False)
    op.create_index("ix_warranties_document_id", "warranties", ["document_id"], unique=False)
    op.create_index(
        "ix_warranties_user_home_expiration",
        "warranties",
        ["user_id", "home_id", "expiration_date"],
        unique=False,
    )
    op.create_index(
        "ix_warranties_user_asset_expiration",
        "warranties",
        ["user_id", "asset_id", "expiration_date"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_warranties_user_asset_expiration", table_name="warranties")
    op.drop_index("ix_warranties_user_home_expiration", table_name="warranties")
    op.drop_index("ix_warranties_document_id", table_name="warranties")
    op.drop_index("ix_warranties_asset_id", table_name="warranties")
    op.drop_index("ix_warranties_home_id", table_name="warranties")
    op.drop_index("ix_warranties_user_id", table_name="warranties")
    op.drop_index("ix_warranties_id", table_name="warranties")
    op.drop_table("warranties")

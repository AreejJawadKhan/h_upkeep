"""initial schema

Revision ID: 20260814_0001
Revises: 
Create Date: 2026-08-14 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260814_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column("email_verified", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_email", "users", ["email"], unique=False)

    op.create_table(
        "auth_identities",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("provider_user_id", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint(
            "provider",
            "provider_user_id",
            name="uq_auth_identities_provider_user_id",
        ),
    )
    op.create_index("ix_auth_identities_id", "auth_identities", ["id"], unique=False)
    op.create_index(
        "ix_auth_identities_user_id",
        "auth_identities",
        ["user_id"],
        unique=False,
    )

    op.create_table(
        "email_verification_tokens",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=255), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        "ix_email_verification_tokens_id",
        "email_verification_tokens",
        ["id"],
        unique=False,
    )
    op.create_index(
        "ix_email_verification_tokens_user_id",
        "email_verification_tokens",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_email_verification_tokens_token_hash",
        "email_verification_tokens",
        ["token_hash"],
        unique=False,
    )

    op.create_table(
        "refresh_tokens",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_refresh_tokens_id", "refresh_tokens", ["id"], unique=False)
    op.create_index(
        "ix_refresh_tokens_user_id",
        "refresh_tokens",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_refresh_tokens_token_hash",
        "refresh_tokens",
        ["token_hash"],
        unique=False,
    )

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index(
        "ix_password_reset_tokens_id",
        "password_reset_tokens",
        ["id"],
        unique=False,
    )
    op.create_index(
        "ix_password_reset_tokens_user_id",
        "password_reset_tokens",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_password_reset_tokens_token_hash",
        "password_reset_tokens",
        ["token_hash"],
        unique=False,
    )

    op.create_table(
        "homes",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=False),
        sa.Column("property_type", sa.String(length=100), nullable=False),
        sa.Column("year_built", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_homes_id", "homes", ["id"], unique=False)
    op.create_index("ix_homes_user_id", "homes", ["user_id"], unique=False)

    op.create_table(
        "areas",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("home_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["home_id"], ["homes.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_areas_id", "areas", ["id"], unique=False)
    op.create_index("ix_areas_home_id", "areas", ["home_id"], unique=False)

    op.create_table(
        "assets",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("home_id", sa.Integer(), nullable=False),
        sa.Column("area_id", sa.Integer(), nullable=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("manufacturer", sa.String(length=150), nullable=True),
        sa.Column("model", sa.String(length=150), nullable=True),
        sa.Column("serial_number", sa.String(length=150), nullable=True),
        sa.Column("purchase_date", sa.Date(), nullable=True),
        sa.Column("installation_date", sa.Date(), nullable=True),
        sa.Column("expected_lifespan", sa.Integer(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["area_id"], ["areas.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["home_id"], ["homes.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_assets_id", "assets", ["id"], unique=False)
    op.create_index("ix_assets_home_id", "assets", ["home_id"], unique=False)
    op.create_index("ix_assets_area_id", "assets", ["area_id"], unique=False)

    op.create_table(
        "maintenance_records",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("home_id", sa.Integer(), nullable=False),
        sa.Column("asset_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=150), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("item", sa.String(length=150), nullable=False),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("cost", sa.Float(), nullable=False),
        sa.Column("service_provider", sa.String(length=150), nullable=True),
        sa.Column("next_due_date", sa.Date(), nullable=True),
        sa.Column("image_url", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["asset_id"], ["assets.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["home_id"], ["homes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index(
        "ix_maintenance_records_id",
        "maintenance_records",
        ["id"],
        unique=False,
    )
    op.create_index(
        "ix_maintenance_records_user_id",
        "maintenance_records",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_maintenance_records_home_id",
        "maintenance_records",
        ["home_id"],
        unique=False,
    )
    op.create_index(
        "ix_maintenance_records_asset_id",
        "maintenance_records",
        ["asset_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_maintenance_records_asset_id", table_name="maintenance_records")
    op.drop_index("ix_maintenance_records_home_id", table_name="maintenance_records")
    op.drop_index("ix_maintenance_records_user_id", table_name="maintenance_records")
    op.drop_index("ix_maintenance_records_id", table_name="maintenance_records")
    op.drop_table("maintenance_records")

    op.drop_index("ix_assets_area_id", table_name="assets")
    op.drop_index("ix_assets_home_id", table_name="assets")
    op.drop_index("ix_assets_id", table_name="assets")
    op.drop_table("assets")

    op.drop_index("ix_areas_home_id", table_name="areas")
    op.drop_index("ix_areas_id", table_name="areas")
    op.drop_table("areas")

    op.drop_index("ix_homes_user_id", table_name="homes")
    op.drop_index("ix_homes_id", table_name="homes")
    op.drop_table("homes")

    op.drop_index(
        "ix_password_reset_tokens_token_hash",
        table_name="password_reset_tokens",
    )
    op.drop_index(
        "ix_password_reset_tokens_user_id",
        table_name="password_reset_tokens",
    )
    op.drop_index("ix_password_reset_tokens_id", table_name="password_reset_tokens")
    op.drop_table("password_reset_tokens")

    op.drop_index("ix_refresh_tokens_token_hash", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_user_id", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_id", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")

    op.drop_index(
        "ix_email_verification_tokens_token_hash",
        table_name="email_verification_tokens",
    )
    op.drop_index(
        "ix_email_verification_tokens_user_id",
        table_name="email_verification_tokens",
    )
    op.drop_index(
        "ix_email_verification_tokens_id",
        table_name="email_verification_tokens",
    )
    op.drop_table("email_verification_tokens")

    op.drop_index("ix_auth_identities_user_id", table_name="auth_identities")
    op.drop_index("ix_auth_identities_id", table_name="auth_identities")
    op.drop_table("auth_identities")

    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")

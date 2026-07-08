"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-07-07
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    user_role = postgresql.ENUM("driver", "host", "admin", name="user_role", create_type=False)
    listing_status = postgresql.ENUM("draft", "active", "paused", "archived", name="listing_status", create_type=False)
    booking_status = postgresql.ENUM("pending_payment", "confirmed", "cancelled", "completed", name="booking_status", create_type=False)
    payment_status = postgresql.ENUM(
        "requires_payment_method",
        "requires_confirmation",
        "processing",
        "succeeded",
        "failed",
        "refunded",
        name="payment_status",
        create_type=False,
    )
    user_role.create(op.get_bind())
    listing_status.create(op.get_bind())
    booking_status.create(op.get_bind())
    payment_status.create(op.get_bind())

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("full_name", sa.String(length=160), nullable=True),
        sa.Column("role", user_role, nullable=False, server_default="driver"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "listings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("host_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("address_line1", sa.String(length=160), nullable=False),
        sa.Column("address_line2", sa.String(length=120), nullable=True),
        sa.Column("city", sa.String(length=90), nullable=False),
        sa.Column("state", sa.String(length=40), nullable=False),
        sa.Column("postal_code", sa.String(length=20), nullable=False),
        sa.Column("country", sa.String(length=2), nullable=False, server_default="US"),
        sa.Column("latitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("longitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="usd"),
        sa.Column("capacity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("covered", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("ev_charging", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", listing_status, nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("capacity >= 1", name="ck_listing_capacity_positive"),
        sa.CheckConstraint("price_cents >= 0", name="ck_listing_price_non_negative"),
        sa.ForeignKeyConstraint(["host_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_listings_city", "listings", ["city"])
    op.create_index("ix_listings_city_state", "listings", ["city", "state"])
    op.create_index("ix_listings_host_id", "listings", ["host_id"])
    op.create_index("ix_listings_state", "listings", ["state"])

    op.create_table(
        "bookings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("listing_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("driver_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("start_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", booking_status, nullable=False, server_default="pending_payment"),
        sa.Column("total_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="usd"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("end_at > start_at", name="ck_booking_time_order"),
        sa.CheckConstraint("total_cents >= 0", name="ck_booking_total_non_negative"),
        sa.ForeignKeyConstraint(["driver_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["listing_id"], ["listings.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_bookings_driver_id", "bookings", ["driver_id"])
    op.create_index("ix_bookings_listing_id", "bookings", ["listing_id"])

    op.create_table(
        "host_payout_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("host_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("stripe_account_id", sa.String(length=120), nullable=False),
        sa.Column("onboarding_complete", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("charges_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("payouts_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["host_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_host_payout_accounts_host_id", "host_payout_accounts", ["host_id"], unique=True)
    op.create_index("ix_host_payout_accounts_stripe_account_id", "host_payout_accounts", ["stripe_account_id"], unique=True)

    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("booking_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("stripe_payment_intent_id", sa.String(length=120), nullable=False),
        sa.Column("status", payment_status, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["booking_id"], ["bookings.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_payments_stripe_payment_intent_id", "payments", ["stripe_payment_intent_id"], unique=True)
    op.create_unique_constraint("uq_payments_booking_id", "payments", ["booking_id"])


def downgrade() -> None:
    op.drop_constraint("uq_payments_booking_id", "payments", type_="unique")
    op.drop_index("ix_payments_stripe_payment_intent_id", table_name="payments")
    op.drop_table("payments")
    op.drop_index("ix_host_payout_accounts_stripe_account_id", table_name="host_payout_accounts")
    op.drop_index("ix_host_payout_accounts_host_id", table_name="host_payout_accounts")
    op.drop_table("host_payout_accounts")
    op.drop_index("ix_bookings_listing_id", table_name="bookings")
    op.drop_index("ix_bookings_driver_id", table_name="bookings")
    op.drop_table("bookings")
    op.drop_index("ix_listings_state", table_name="listings")
    op.drop_index("ix_listings_host_id", table_name="listings")
    op.drop_index("ix_listings_city_state", table_name="listings")
    op.drop_index("ix_listings_city", table_name="listings")
    op.drop_table("listings")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
    op.execute("DROP TYPE payment_status")
    op.execute("DROP TYPE booking_status")
    op.execute("DROP TYPE listing_status")
    op.execute("DROP TYPE user_role")

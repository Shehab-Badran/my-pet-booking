"""Production schema synchronization migration.

Revision ID: 001_schema_sync
Revises: 
Create Date: 2026-11-11 21:35:00.000000

Safe, repeatable, idempotent migration for PostgreSQL and SQLite.
Ensures all required tables, columns, indexes, and relationships exist
without dropping existing tables, resetting data, or overwriting customer records.
"""
from typing import Sequence, Union
import logging
from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector

# revision identifiers, used by Alembic.
revision: str = '001_schema_sync'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

logger = logging.getLogger("alembic.migration")

def upgrade() -> None:
    from alembic import context
    
    if context.is_offline_mode():
        logger.info("Running in offline mode: emitting PostgreSQL DDL with IF NOT EXISTS checks.")
        op.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR NOT NULL,
                phone VARCHAR UNIQUE NOT NULL,
                email VARCHAR UNIQUE,
                password_hash VARCHAR NOT NULL,
                role VARCHAR NOT NULL DEFAULT 'customer',
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc')
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ix_users_phone ON users (phone);
            CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);
        """)
        op.execute("""
            CREATE TABLE IF NOT EXISTS pets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR NOT NULL,
                breed VARCHAR,
                size VARCHAR,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc')
            );
        """)
        op.execute("""
            CREATE TABLE IF NOT EXISTS services (
                id SERIAL PRIMARY KEY,
                name VARCHAR NOT NULL,
                pet_type VARCHAR NOT NULL,
                pet_size VARCHAR NOT NULL,
                original_price NUMERIC(10, 2) NOT NULL,
                discounted_price NUMERIC(10, 2) NOT NULL,
                discount_percentage INTEGER NOT NULL DEFAULT 50,
                duration INTEGER NOT NULL,
                description TEXT,
                active BOOLEAN NOT NULL DEFAULT TRUE
            );
        """)
        op.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                key VARCHAR PRIMARY KEY,
                value VARCHAR NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ix_settings_key ON settings (key);
        """)
        op.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                booking_id VARCHAR UNIQUE NOT NULL,
                customer_name VARCHAR,
                customer_phone VARCHAR,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                pet_id INTEGER REFERENCES pets(id) ON DELETE SET NULL,
                service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
                booking_date DATE NOT NULL,
                start_time TIME WITHOUT TIME ZONE NOT NULL,
                end_time TIME WITHOUT TIME ZONE NOT NULL,
                price NUMERIC(10, 2) DEFAULT 0,
                special_notes TEXT,
                cancellation_reason VARCHAR,
                booking_source VARCHAR,
                status VARCHAR NOT NULL DEFAULT 'confirmed',
                final_invoice_amount NUMERIC(10, 2),
                payment_status VARCHAR DEFAULT 'unpaid',
                payment_date DATE,
                invoice_notes TEXT,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc'),
                updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc')
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ix_bookings_booking_id ON bookings (booking_id);
            CREATE INDEX IF NOT EXISTS ix_bookings_booking_date ON bookings (booking_date);
        """)
        
        # Safe column alterations for existing pre-migration tables
        op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR;")
        op.execute("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email);")
        op.execute("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_name VARCHAR;")
        op.execute("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_phone VARCHAR;")
        op.execute("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR;")
        op.execute("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_source VARCHAR;")
        op.execute("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_invoice_amount NUMERIC(10, 2);")
        op.execute("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR DEFAULT 'unpaid';")
        op.execute("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_date DATE;")
        op.execute("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS invoice_notes TEXT;")
        
        op.execute("""
            CREATE TABLE IF NOT EXISTS booking_audit_logs (
                id SERIAL PRIMARY KEY,
                booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                user_name VARCHAR,
                action VARCHAR NOT NULL,
                old_value TEXT,
                new_value TEXT,
                reason VARCHAR,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc')
            );
            CREATE INDEX IF NOT EXISTS ix_booking_audit_logs_booking_id ON booking_audit_logs (booking_id);
        """)
        
        op.execute("""
            CREATE TABLE IF NOT EXISTS customer_reward_redemptions (
                id SERIAL PRIMARY KEY,
                customer_phone VARCHAR NOT NULL,
                customer_name VARCHAR,
                redeemed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc'),
                redeemed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                redeemed_by_name VARCHAR,
                reward_description VARCHAR NOT NULL,
                notes TEXT
            );
            CREATE INDEX IF NOT EXISTS ix_customer_reward_redemptions_customer_phone ON customer_reward_redemptions (customer_phone);
        """)
        
        op.execute("""
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash VARCHAR NOT NULL,
                expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
                used BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc')
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ix_password_reset_tokens_token_hash ON password_reset_tokens (token_hash);
        """)
        return

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())
    is_sqlite = bind.dialect.name == "sqlite"

    logger.info(f"Starting schema synchronization. Existing tables: {existing_tables}")

    # 1. Base Table: users
    if "users" not in existing_tables:
        logger.info("Creating 'users' table...")
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("phone", sa.String(), unique=True, index=True, nullable=False),
            sa.Column("email", sa.String(), unique=True, index=True, nullable=True),
            sa.Column("password_hash", sa.String(), nullable=False),
            sa.Column("role", sa.String(), nullable=False, server_default="customer"),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        )
    else:
        existing_user_cols = {c["name"] for c in inspector.get_columns("users")}
        with op.batch_alter_table("users") as batch_op:
            if "email" not in existing_user_cols:
                logger.info("Adding 'email' column to 'users' table...")
                batch_op.add_column(sa.Column("email", sa.String(), nullable=True))
                # Add unique index if not existing
                user_indexes = {idx["name"] for idx in inspector.get_indexes("users")}
                if "ix_users_email" not in user_indexes:
                    batch_op.create_index("ix_users_email", ["email"], unique=True)

    # 2. Base Table: pets
    if "pets" not in existing_tables:
        logger.info("Creating 'pets' table...")
        op.create_table(
            "pets",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("type", sa.String(), nullable=False),
            sa.Column("breed", sa.String(), nullable=True),
            sa.Column("size", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        )

    # 3. Base Table: services
    if "services" not in existing_tables:
        logger.info("Creating 'services' table...")
        op.create_table(
            "services",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("pet_type", sa.String(), nullable=False),
            sa.Column("pet_size", sa.String(), nullable=False),
            sa.Column("original_price", sa.Numeric(10, 2), nullable=False),
            sa.Column("discounted_price", sa.Numeric(10, 2), nullable=False),
            sa.Column("discount_percentage", sa.Integer(), nullable=False, server_default="50"),
            sa.Column("duration", sa.Integer(), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        )

    # 4. Table: settings
    if "settings" not in existing_tables:
        logger.info("Creating 'settings' table...")
        op.create_table(
            "settings",
            sa.Column("key", sa.String(), primary_key=True, index=True),
            sa.Column("value", sa.String(), nullable=False),
        )

    # 5. Table: bookings (and missing columns)
    if "bookings" not in existing_tables:
        logger.info("Creating 'bookings' table...")
        op.create_table(
            "bookings",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("booking_id", sa.String(), unique=True, index=True, nullable=False),
            sa.Column("customer_name", sa.String(), nullable=True),
            sa.Column("customer_phone", sa.String(), nullable=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("pet_id", sa.Integer(), sa.ForeignKey("pets.id", ondelete="SET NULL"), nullable=True),
            sa.Column("service_id", sa.Integer(), sa.ForeignKey("services.id", ondelete="SET NULL"), nullable=True),
            sa.Column("booking_date", sa.Date(), nullable=False, index=True),
            sa.Column("start_time", sa.Time(), nullable=False),
            sa.Column("end_time", sa.Time(), nullable=False),
            sa.Column("price", sa.Numeric(10, 2), nullable=True, server_default="0"),
            sa.Column("special_notes", sa.Text(), nullable=True),
            sa.Column("cancellation_reason", sa.String(), nullable=True),
            sa.Column("booking_source", sa.String(), nullable=True, server_default="website"),
            sa.Column("status", sa.String(), nullable=False, server_default="confirmed"),
            sa.Column("final_invoice_amount", sa.Numeric(10, 2), nullable=True),
            sa.Column("payment_status", sa.String(), nullable=True, server_default="unpaid"),
            sa.Column("payment_date", sa.Date(), nullable=True),
            sa.Column("invoice_notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=True),
        )
    else:
        existing_booking_cols = {c["name"] for c in inspector.get_columns("bookings")}
        with op.batch_alter_table("bookings") as batch_op:
            if "customer_name" not in existing_booking_cols:
                logger.info("Adding 'customer_name' column to 'bookings'...")
                batch_op.add_column(sa.Column("customer_name", sa.String(), nullable=True))

            if "customer_phone" not in existing_booking_cols:
                logger.info("Adding 'customer_phone' column to 'bookings'...")
                batch_op.add_column(sa.Column("customer_phone", sa.String(), nullable=True))

            if "cancellation_reason" not in existing_booking_cols:
                logger.info("Adding 'cancellation_reason' column to 'bookings'...")
                batch_op.add_column(sa.Column("cancellation_reason", sa.String(), nullable=True))

            if "booking_source" not in existing_booking_cols:
                logger.info("Adding 'booking_source' column to 'bookings'...")
                # Do NOT server_default to 'website' so existing legacy bookings are not falsely assigned
                batch_op.add_column(sa.Column("booking_source", sa.String(), nullable=True))

            if "final_invoice_amount" not in existing_booking_cols:
                logger.info("Adding 'final_invoice_amount' column to 'bookings'...")
                batch_op.add_column(sa.Column("final_invoice_amount", sa.Numeric(10, 2), nullable=True))

            if "payment_status" not in existing_booking_cols:
                logger.info("Adding 'payment_status' column to 'bookings'...")
                batch_op.add_column(sa.Column("payment_status", sa.String(), nullable=True, server_default="unpaid"))

            if "payment_date" not in existing_booking_cols:
                logger.info("Adding 'payment_date' column to 'bookings'...")
                batch_op.add_column(sa.Column("payment_date", sa.Date(), nullable=True))

            if "invoice_notes" not in existing_booking_cols:
                logger.info("Adding 'invoice_notes' column to 'bookings'...")
                batch_op.add_column(sa.Column("invoice_notes", sa.Text(), nullable=True))

    # 6. Table: booking_audit_logs
    if "booking_audit_logs" not in existing_tables:
        logger.info("Creating 'booking_audit_logs' table...")
        op.create_table(
            "booking_audit_logs",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("booking_id", sa.Integer(), sa.ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("user_name", sa.String(), nullable=True),
            sa.Column("action", sa.String(), nullable=False),
            sa.Column("old_value", sa.Text(), nullable=True),
            sa.Column("new_value", sa.Text(), nullable=True),
            sa.Column("reason", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        )

    # 7. Table: customer_reward_redemptions
    if "customer_reward_redemptions" not in existing_tables:
        logger.info("Creating 'customer_reward_redemptions' table...")
        op.create_table(
            "customer_reward_redemptions",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("customer_phone", sa.String(), nullable=False, index=True),
            sa.Column("customer_name", sa.String(), nullable=True),
            sa.Column("redeemed_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
            sa.Column("redeemed_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("redeemed_by_name", sa.String(), nullable=True),
            sa.Column("reward_description", sa.String(), nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
        )

    # 8. Table: password_reset_tokens
    if "password_reset_tokens" not in existing_tables:
        logger.info("Creating 'password_reset_tokens' table...")
        op.create_table(
            "password_reset_tokens",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("token_hash", sa.String(), unique=True, index=True, nullable=False),
            sa.Column("expires_at", sa.DateTime(), nullable=False, index=True),
            sa.Column("used", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=True),
        )

    logger.info("Schema synchronization completed successfully.")

def downgrade() -> None:
    # Safe down-migration for rollbacks if needed
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if "password_reset_tokens" in existing_tables:
        op.drop_table("password_reset_tokens")
    if "customer_reward_redemptions" in existing_tables:
        op.drop_table("customer_reward_redemptions")
    if "booking_audit_logs" in existing_tables:
        op.drop_table("booking_audit_logs")
    # For bookings and users columns, we preserve them in downgrade to avoid accidental data loss

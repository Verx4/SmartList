"""Persist uploaded and generated files in the database.

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-31
"""

from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if "stored_blobs" in sa.inspect(bind).get_table_names():
        return

    op.create_table(
        "stored_blobs",
        sa.Column("storage_key", sa.String(length=512), nullable=False),
        sa.Column("content", sa.LargeBinary(), nullable=False),
        sa.Column("content_type", sa.String(length=160), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("storage_key"),
    )


def downgrade() -> None:
    bind = op.get_bind()
    if "stored_blobs" in sa.inspect(bind).get_table_names():
        op.drop_table("stored_blobs")

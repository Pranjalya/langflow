"""add_flow_lock_columns

Revision ID: c1e3bb1a8c20
Revises: f009f2aae3ba
Create Date: 2025-06-02 18:25:10.721970

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.engine.reflection import Inspector
from langflow.utils import migration


# revision identifiers, used by Alembic.
revision: str = 'c1e3bb1a8c20'
down_revision: Union[str, None] = 'f009f2aae3ba'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [col['name'] for col in inspector.get_columns('flow')]

    # Add locked_by column if it doesn't exist
    if 'locked_by' not in columns:
        with op.batch_alter_table('flow') as batch_op:
            batch_op.add_column(sa.Column('locked_by', sa.UUID(), nullable=True))
            batch_op.create_index(op.f('ix_flow_locked_by'), ['locked_by'], unique=False)
            batch_op.create_foreign_key(None, 'user', ['locked_by'], ['id'])

    # Add lock_updated_at column if it doesn't exist
    if 'lock_updated_at' not in columns:
        with op.batch_alter_table('flow') as batch_op:
            batch_op.add_column(sa.Column('lock_updated_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    columns = [col['name'] for col in inspector.get_columns('flow')]

    # Remove lock_updated_at column if it exists
    if 'lock_updated_at' in columns:
        with op.batch_alter_table('flow') as batch_op:
            batch_op.drop_column('lock_updated_at')

    # Remove locked_by column and its foreign key if it exists
    if 'locked_by' in columns:
        with op.batch_alter_table('flow') as batch_op:
            # Drop the foreign key constraint first
            for fk in inspector.get_foreign_keys('flow'):
                if fk['constrained_columns'] == ['locked_by']:
                    batch_op.drop_constraint(fk['name'], type_='foreignkey')
                    break
            # Drop the index
            batch_op.drop_index(op.f('ix_flow_locked_by'))
            # Drop the column
            batch_op.drop_column('locked_by')

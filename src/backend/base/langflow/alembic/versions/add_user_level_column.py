"""add user level column

Revision ID: add_user_level_column
Revises: 9a8b7c6d5e4f
Create Date: 2024-03-19 08:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_user_level_column'
down_revision: Union[str, None] = '9a8b7c6d5e4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum type for user_level
    user_level = postgresql.ENUM('USER', 'SUPER_ADMIN', 'PROJECT_ADMIN', name='userlevel')
    user_level.create(op.get_bind())

    # Add user_level column with default value
    op.add_column('user', sa.Column('user_level', sa.Enum('USER', 'SUPER_ADMIN', 'PROJECT_ADMIN', name='userlevel'), nullable=False, server_default='USER'))

    # Update existing superusers to have SUPER_ADMIN level
    op.execute("UPDATE user SET user_level = 'SUPER_ADMIN' WHERE is_superuser = true")


def downgrade() -> None:
    # Drop the user_level column
    op.drop_column('user', 'user_level')
    
    # Drop the enum type
    op.execute('DROP TYPE userlevel') 
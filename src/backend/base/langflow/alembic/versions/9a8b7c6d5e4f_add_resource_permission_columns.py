"""add resource permission columns

Revision ID: 9a8b7c6d5e4f
Revises: 8a7b6c5d4e3f
Create Date: 2024-03-20 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.engine.reflection import Inspector
from langflow.utils import migration


# revision identifiers, used by Alembic.
revision: str = '9a8b7c6d5e4f'
down_revision: Union[str, None] = '8a7b6c5d4e3f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    
    # Add new columns to resource_permission table
    if 'resource_permission' in inspector.get_table_names():
        # Add new boolean columns
        op.add_column('resource_permission', sa.Column('can_read', sa.Boolean(), nullable=False, server_default='false'))
        op.add_column('resource_permission', sa.Column('can_run', sa.Boolean(), nullable=False, server_default='false'))
        op.add_column('resource_permission', sa.Column('can_edit', sa.Boolean(), nullable=False, server_default='false'))
        
        # Update existing permissions based on permission_level
        conn.execute(sa.text("""
            UPDATE resource_permission 
            SET can_read = true,
                can_run = CASE 
                    WHEN permission_level = 'USER' THEN true
                    ELSE false
                END,
                can_edit = CASE 
                    WHEN permission_level = 'PROJECT_ADMIN' OR permission_level = 'SUPER_ADMIN' THEN true
                    ELSE false
                END
        """))
        
        # Update permission_level values
        conn.execute(sa.text("""
            UPDATE resource_permission 
            SET permission_level = CASE 
                WHEN permission_level = 'admin' THEN 'SUPER_ADMIN'
                ELSE 'USER'
            END
        """))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    
    if 'resource_permission' in inspector.get_table_names():
        # Drop the new columns
        op.drop_column('resource_permission', 'can_read')
        op.drop_column('resource_permission', 'can_run')
        op.drop_column('resource_permission', 'can_edit')
        
        # Revert permission_level values
        conn.execute(sa.text("""
            UPDATE resource_permission 
            SET permission_level = CASE 
                WHEN permission_level = 'SUPER_ADMIN' THEN 'admin'
                ELSE 'USER'
            END
        """)) 
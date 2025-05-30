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
    
    table_name = 'resource_permission'
    
    if table_name in inspector.get_table_names():
        columns = inspector.get_columns(table_name)
        existing_column_names = {col['name'] for col in columns}

        # Columns to add
        columns_to_add = {
            'can_read': sa.Column('can_read', sa.Boolean(), nullable=False, server_default='false'),
            'can_run': sa.Column('can_run', sa.Boolean(), nullable=False, server_default='false'),
            'can_edit': sa.Column('can_edit', sa.Boolean(), nullable=False, server_default='false'),
        }

        for col_name, col_obj in columns_to_add.items():
            if col_name not in existing_column_names:
                op.add_column(table_name, col_obj)
        
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
            WHERE permission_level IN ('admin', 'USER')
        """))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    
    table_name = 'resource_permission'

    if table_name in inspector.get_table_names():
        columns = inspector.get_columns(table_name)
        existing_column_names = {col['name'] for col in columns}

        columns_to_drop = ['can_read', 'can_run', 'can_edit']

        for col_name in columns_to_drop:
            if col_name in existing_column_names:
                op.drop_column(table_name, col_name)
        
        # Revert permission_level values
        conn.execute(sa.text("""
            UPDATE resource_permission 
            SET permission_level = CASE 
                WHEN permission_level = 'SUPER_ADMIN' THEN 'admin'
                ELSE 'USER'
            END
            WHERE permission_level IN ('SUPER_ADMIN', 'USER')
        """))
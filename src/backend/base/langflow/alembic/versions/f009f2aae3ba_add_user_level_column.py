"""add user level column

Revision ID: f009f2aae3ba
Revises: 9a8b7c6d5e4f
Create Date: 2024-03-19 08:55:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.engine.reflection import Inspector # Added for inspecting db objects

# revision identifiers, used by Alembic.
revision: str = 'f009f2aae3ba'
down_revision: Union[str, None] = '9a8b7c6d5e4f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    
    table_name = 'user'
    column_name = 'user_level'
    enum_name = 'userlevel'  # Name of the ENUM type in PostgreSQL
    enum_values = ('USER', 'SUPER_ADMIN', 'PROJECT_ADMIN')

    # 1. Create ENUM type for PostgreSQL if it doesn't exist
    if conn.dialect.name == 'postgresql':
        # Check if ENUM type already exists
        type_exists_query = sa.text(f"SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{enum_name}')")
        type_exists = conn.execute(type_exists_query).scalar_one()
        
        if not type_exists:
            # Create the PostgreSQL ENUM type
            pg_enum_type = postgresql.ENUM(*enum_values, name=enum_name)
            pg_enum_type.create(conn)  # 'conn' is op.get_bind()
    
    # 2. Add column if it doesn't exist
    if table_name in inspector.get_table_names():
        columns = inspector.get_columns(table_name)
        if not any(c['name'] == column_name for c in columns):
            op.add_column(
                table_name,
                sa.Column(
                    column_name,
                    sa.Enum(
                        *enum_values, 
                        name=enum_name,  # For PG, links to the type. For SQLite, used in CHECK constraint name.
                        # For PG: type is created above, so sa.Enum should not try to create it.
                        # For SQLite (and others): sa.Enum needs to create its VARCHAR + CHECK constraint.
                        create_type=(conn.dialect.name != 'postgresql')
                    ),
                    nullable=False,
                    server_default='USER'  # server_default should be a string
                )
            )
        
        current_columns_in_user_table = inspector.get_columns(table_name)
        if any(c['name'] == 'is_superuser' for c in current_columns_in_user_table):
             op.execute(f"UPDATE \"{table_name}\" SET \"{column_name}\" = 'SUPER_ADMIN' WHERE is_superuser = true")
        else:
            print(f"Warning: Column 'is_superuser' not found in table '{table_name}'. "
                  "Skipping data update for SUPER_ADMIN role based on 'is_superuser'.")
    else:
        print(f"Warning: Table '{table_name}' not found. Migration for this table will be skipped.")


def downgrade() -> None:
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)

    table_name = 'user'
    column_name = 'user_level'
    enum_name = 'userlevel'  # Name of the ENUM type in PostgreSQL

    # 1. Drop column if it exists
    if table_name in inspector.get_table_names():
        columns = inspector.get_columns(table_name)
        if any(c['name'] == column_name for c in columns):
            # For SQLite, dropping a column with sa.Enum also drops its associated CHECK constraint.
            # For PostgreSQL, this drops the column; the separate ENUM type needs to be handled next.
            op.drop_column(table_name, column_name)

    # 2. Drop ENUM type for PostgreSQL if it exists (and is not in use by other columns)
    if conn.dialect.name == 'postgresql':
        # Check if ENUM type exists
        type_exists_query = sa.text(f"SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = '{enum_name}')")
        type_exists = conn.execute(type_exists_query).scalar_one()
        
        if type_exists:
            op.execute(f'DROP TYPE {enum_name}')
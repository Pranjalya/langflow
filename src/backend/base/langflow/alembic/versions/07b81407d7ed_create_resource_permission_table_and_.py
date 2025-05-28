"""create resource permission table and migrate folder user links

Revision ID: 07b81407d7ed
Revises: 75106a88e8bb
Create Date: 2025-05-27 23:42:03.832783

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.engine.reflection import Inspector
from langflow.utils import migration
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = '07b81407d7ed'
down_revision: Union[str, None] = '75106a88e8bb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn) # type: ignore

    # Create resource_permission table if it doesn't exist
    if "resource_permission" not in inspector.get_table_names():
        op.create_table(
            "resource_permission",
            sa.Column("resource_id", UUID(as_uuid=True), nullable=False, index=True),
            sa.Column("grantor_id", UUID(as_uuid=True), sa.ForeignKey("user.id"), nullable=False),
            sa.Column("grantee_id", UUID(as_uuid=True), sa.ForeignKey("user.id"), nullable=False),
            sa.Column("permission_level", sa.String, nullable=False),
            sa.Column("resource_type", sa.String, nullable=False),
            sa.Column("id", UUID(as_uuid=True), nullable=False, primary_key=True),
        )
    
    # Migrate data from folderuserlink if it exists
    if "folderuserlink" in inspector.get_table_names():
        try:
            results = conn.execute(sa.text("SELECT folder_id, user_id FROM folderuserlink")).fetchall()
            insert_statements = []
            for folder_id, user_id in results:
                # Get the owner of the folder
                folder_owner = conn.execute(sa.text(f"SELECT user_id FROM folder WHERE id = '{folder_id}'")).scalar()
                if folder_owner:
                    insert_statements.append(
                        f"INSERT INTO resource_permission (resource_id, grantor_id, grantee_id, permission_level, resource_type, id) "
                        f"VALUES ('{folder_id}', '{folder_owner}', '{user_id}', 'USER', 'project', uuid_generate_v4())"
                    )
            if insert_statements:
                conn.execute(sa.text("; ".join(insert_statements)))

            # Drop folderuserlink table
            op.drop_table("folderuserlink")
        except Exception as e:
            print(f"Error during migration: {str(e)}")
            # If there's an error, try to drop the table directly
            try:
                conn.execute(sa.text("DROP TABLE IF EXISTS folderuserlink"))
            except Exception as e:
                print(f"Error dropping table: {str(e)}")

def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn) # type: ignore

    # Drop resource_permission table if it exists
    if "resource_permission" in inspector.get_table_names():
        try:
            # Migrate data back to folderuserlink (simple migration, assuming all were 'USER' permissions for 'project' resource_type)
            results = conn.execute(sa.text("SELECT resource_id, grantee_id FROM resource_permission WHERE resource_type = 'project' AND permission_level = 'USER'")).fetchall()
            
            # Drop folderuserlink table if it exists
            try:
                conn.execute(sa.text("DROP TABLE IF EXISTS folderuserlink"))
            except Exception as e:
                print(f"Error dropping table: {str(e)}")

            # Create folderuserlink table
            op.create_table(
                "folderuserlink",
                sa.Column("folder_id", UUID(as_uuid=True), sa.ForeignKey("folder.id"), primary_key=True),
                sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("user.id"), primary_key=True),
            )

            insert_statements = []
            for resource_id, grantee_id in results:
                insert_statements.append(
                    f"INSERT INTO folderuserlink (folder_id, user_id) "
                    f"VALUES ('{resource_id}', '{grantee_id}')"
                )
            if insert_statements:
                conn.execute(sa.text("; ".join(insert_statements)))

            # Drop resource_permission table
            op.drop_table("resource_permission")
        except Exception as e:
            print(f"Error during downgrade: {str(e)}")

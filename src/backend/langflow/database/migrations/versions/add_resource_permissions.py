"""add resource permissions

Revision ID: add_resource_permissions
Revises: 
Create Date: 2024-03-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_resource_permissions'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # Create enums
    op.execute("CREATE TYPE permission_type AS ENUM ('read', 'write', 'run', 'delete', 'manage_permissions')")
    op.execute("CREATE TYPE resource_type AS ENUM ('folder', 'flow')")

    # Create resource_permission table
    op.create_table(
        'resource_permission',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('grantee_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('resource_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('resource_type', sa.Enum('folder', 'flow', name='resource_type'), nullable=False),
        sa.Column('permission_type', sa.Enum('read', 'write', 'run', 'delete', 'manage_permissions', name='permission_type'), nullable=False),
        sa.Column('granted_by_user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('user.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('grantee_user_id', 'resource_id', 'resource_type', 'permission_type', name='uq_resource_permission')
    )

    # Add indexes for performance
    op.create_index('ix_resource_permission_grantee_user_id', 'resource_permission', ['grantee_user_id'])
    op.create_index('ix_resource_permission_resource_id', 'resource_permission', ['resource_id'])
    op.create_index('ix_resource_permission_resource_type', 'resource_permission', ['resource_type'])


def downgrade():
    # Drop indexes
    op.drop_index('ix_resource_permission_resource_type')
    op.drop_index('ix_resource_permission_resource_id')
    op.drop_index('ix_resource_permission_grantee_user_id')

    # Drop table
    op.drop_table('resource_permission')

    # Drop enums - handle dependencies first
    op.execute('ALTER TABLE resource_permission DROP COLUMN IF EXISTS permission_type')
    op.execute('ALTER TABLE resource_permission DROP COLUMN IF EXISTS resource_type')
    op.execute('DROP TYPE IF EXISTS permission_type')
    op.execute('DROP TYPE IF EXISTS resource_type') 
"""add resource permissions

Revision ID: add_resource_permissions
Revises: 66f72f04a1de
Create Date: 2024-03-21

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_resource_permissions'
down_revision = '66f72f04a1de'  # Set this to the latest migration
branch_labels = None
depends_on = None


def upgrade():
    # Create resource_permission table
    op.create_table(
        'resource_permission',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('grantee_user_id', sa.String(36), sa.ForeignKey('user.id'), nullable=False),
        sa.Column('resource_id', sa.String(36), nullable=False),
        sa.Column('resource_type', sa.String(16), nullable=False),
        sa.Column('permission_type', sa.String(32), nullable=False),
        sa.Column('granted_by_user_id', sa.String(36), sa.ForeignKey('user.id'), nullable=True),
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
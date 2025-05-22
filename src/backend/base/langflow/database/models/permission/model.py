from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from sqlmodel import Field, SQLModel, Column
from sqlalchemy import String, Index, UniqueConstraint


class PermissionType(str, Enum):
    READ = "read"
    WRITE = "write"
    RUN = "run"
    DELETE = "delete"
    MANAGE_PERMISSIONS = "manage_permissions"


class ResourceType(str, Enum):
    FOLDER = "folder"
    FLOW = "flow"


class ResourcePermission(SQLModel, table=True):
    __tablename__ = "resource_permission"

    id: str = Field(default=None, primary_key=True)
    grantee_user_id: str = Field(foreign_key="user.id", nullable=False)
    resource_id: str = Field(nullable=False)
    resource_type: str = Field(nullable=False)
    permission_type: str = Field(nullable=False)
    granted_by_user_id: Optional[str] = Field(foreign_key="user.id", nullable=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)
    updated_at: datetime = Field(default_factory=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_resource_permission_grantee_user_id", "grantee_user_id"),
        Index("ix_resource_permission_resource_id", "resource_id"),
        Index("ix_resource_permission_resource_type", "resource_type"),
        UniqueConstraint(
            Column("grantee_user_id", String(36), nullable=False),
            Column("resource_id", String(36), nullable=False),
            Column("resource_type", String(16), nullable=False),
            Column("permission_type", String(32), nullable=False),
            name="uq_resource_permission",
        ),
    )

    class Config:
        arbitrary_types_allowed = True 


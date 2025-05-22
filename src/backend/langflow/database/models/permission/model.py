from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from sqlalchemy import Column, DateTime, Enum as SQLEnum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID as PGUUID

from langflow.database.base_class import Base


class PermissionType(str, Enum):
    READ = "read"
    WRITE = "write"
    RUN = "run"
    DELETE = "delete"
    MANAGE_PERMISSIONS = "manage_permissions"


class ResourceType(str, Enum):
    FOLDER = "folder"
    FLOW = "flow"


class ResourcePermission(Base):
    __tablename__ = "resource_permission"

    id = Column(PGUUID, primary_key=True)
    grantee_user_id = Column(PGUUID, ForeignKey("user.id"), nullable=False)
    resource_id = Column(PGUUID, nullable=False)
    resource_type = Column(SQLEnum(ResourceType), nullable=False)
    permission_type = Column(SQLEnum(PermissionType), nullable=False)
    granted_by_user_id = Column(PGUUID, ForeignKey("user.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "grantee_user_id",
            "resource_id",
            "resource_type",
            "permission_type",
            name="uq_resource_permission",
        ),
    ) 
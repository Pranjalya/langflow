from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel, Relationship
from enum import Enum

class PermissionLevel(str, Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    PROJECT_ADMIN = "PROJECT_ADMIN"
    USER = "USER"

class ResourceType(str, Enum):
    FLOW = "flow"
    PROJECT = "project"

class ResourcePermissionBase(SQLModel):
    resource_id: UUID = Field(index=True)
    grantor_id: UUID = Field(foreign_key="user.id")
    grantee_id: UUID = Field(foreign_key="user.id")
    permission_level: PermissionLevel = Field(sa_column_kwargs={"nullable": False})
    resource_type: ResourceType = Field(sa_column_kwargs={"nullable": False})

class ResourcePermission(ResourcePermissionBase, table=True):
    __tablename__ = "resource_permission"
    id: UUID = Field(default_factory=uuid4, primary_key=True) 
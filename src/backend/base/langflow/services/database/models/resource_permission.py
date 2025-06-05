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
    USER = "user"

class ResourcePermissionBase(SQLModel):
    resource_id: UUID = Field(index=True)
    grantor_id: UUID = Field(foreign_key="user.id")
    grantee_id: UUID = Field(foreign_key="user.id")
    permission_level: PermissionLevel = Field(sa_column_kwargs={"nullable": False})
    resource_type: ResourceType = Field(sa_column_kwargs={"nullable": False})
    can_read: bool = Field(default=False)
    can_run: bool = Field(default=False)
    can_edit: bool = Field(default=False)

class ResourcePermission(ResourcePermissionBase, table=True):
    __tablename__ = "resource_permission"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    
    # Add relationships
    grantee: "User" = Relationship(
        back_populates="resource_permissions",
        sa_relationship_kwargs={"foreign_keys": "[ResourcePermission.grantee_id]"}
    )
    grantor: "User" = Relationship(
        back_populates="granted_permissions",
        sa_relationship_kwargs={"foreign_keys": "[ResourcePermission.grantor_id]"}
    ) 
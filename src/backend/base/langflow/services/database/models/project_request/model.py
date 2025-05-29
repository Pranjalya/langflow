from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4
from enum import Enum

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel

from langflow.schema.serialize import UUIDstr


class ProjectRequestStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class UserPermission(SQLModel):
    id: str
    can_read: bool = True
    can_run: bool = False
    can_edit: bool = False


class ProjectRequestBase(SQLModel):
    project_name: str = Field(index=True)
    justification: str
    requested_users: list[UserPermission] = Field(sa_column=Column(JSON, nullable=False))
    status: ProjectRequestStatus = Field(default=ProjectRequestStatus.PENDING)
    rejection_reason: str | None = Field(default=None)


class ProjectRequest(ProjectRequestBase, table=True):
    __tablename__ = "projectrequest"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    requester_id: UUID = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: datetime | None = Field(default=None)


class ProjectRequestCreate(ProjectRequestBase):
    pass


class ProjectRequestRead(ProjectRequestBase):
    id: UUID
    requester_id: UUID
    created_at: datetime
    resolved_at: datetime | None = None


class ProjectRequestUpdate(SQLModel):
    status: ProjectRequestStatus
    rejection_reason: str | None = None 
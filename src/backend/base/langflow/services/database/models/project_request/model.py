from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import Column, JSON
from sqlmodel import Field, SQLModel

from langflow.schema.serialize import UUIDstr


class ProjectRequestStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ProjectRequestBase(SQLModel):
    project_name: str = Field(index=True)
    justification: str
    requested_users: list[str] = Field(sa_column=Column(JSON, nullable=False))
    status: ProjectRequestStatus = Field(default=ProjectRequestStatus.PENDING)
    rejection_reason: str | None = Field(default=None)


class ProjectRequest(ProjectRequestBase, table=True):  # type: ignore[call-arg]
    id: UUIDstr = Field(default_factory=uuid4, primary_key=True)
    requester_id: UUID = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: datetime | None = Field(default=None)


class ProjectRequestCreate(ProjectRequestBase):
    pass


class ProjectRequestRead(ProjectRequestBase):
    id: UUID
    requester_id: UUID
    created_at: datetime
    resolved_at: datetime | None


class ProjectRequestUpdate(SQLModel):
    status: ProjectRequestStatus
    rejection_reason: str | None = None 
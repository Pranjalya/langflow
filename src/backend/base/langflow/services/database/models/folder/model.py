from typing import Optional, List
from uuid import UUID, uuid4

from sqlalchemy import Text, UniqueConstraint, Table, Column as SAColumn, ForeignKey
from sqlmodel import Column, Field, Relationship, SQLModel

from langflow.services.database.models.flow.model import Flow, FlowRead
# from langflow.services.database.models.folder.user_link import folder_user_link
from langflow.services.database.models.user.model import User
from langflow.services.database.models.resource_permission import ResourcePermission


class UserPermission(SQLModel):
    id: UUID
    can_read: bool = True
    can_run: bool = False
    can_edit: bool = False


class FolderBase(SQLModel):
    name: str = Field(index=True)
    description: str | None = Field(default=None, sa_column=Column(Text))


class Folder(FolderBase, table=True):  # type: ignore[call-arg]
    id: UUID | None = Field(default_factory=uuid4, primary_key=True)
    parent_id: UUID | None = Field(default=None, foreign_key="folder.id")

    parent: Optional["Folder"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": "Folder.id"},
    )
    children: list["Folder"] = Relationship(back_populates="parent")
    user_id: UUID | None = Field(default=None, foreign_key="user.id")
    user: "User" = Relationship(back_populates="folders")
    flows: list[Flow] = Relationship(
        back_populates="folder", sa_relationship_kwargs={"cascade": "all, delete, delete-orphan"}
    )
    users: list["User"] = Relationship(
        back_populates="shared_folders",
        link_model=ResourcePermission,
        sa_relationship_kwargs={
            "primaryjoin": "Folder.id == ResourcePermission.resource_id",
            "secondaryjoin": "User.id == ResourcePermission.grantee_id",
            "viewonly": True,
        },
    )
    # users: list["User"] = Relationship(
    #     back_populates="shared_folders",
    #     link_model=folder_user_link,
    # )

    __table_args__ = (UniqueConstraint("user_id", "name", name="unique_folder_name"),)


class FolderCreate(FolderBase):
    users: List[UserPermission] = []


class FolderRead(FolderBase):
    id: UUID
    parent_id: UUID | None = None
    user_id: UUID | None = None


class FolderReadWithFlows(FolderRead):
    flows: list[FlowRead] = []


class FolderUpdate(SQLModel):
    name: str | None = None
    description: str | None = None
    parent_id: UUID | None = None
    components: list[UUID] = Field(default_factory=list)
    flows: list[UUID] = Field(default_factory=list)
    users: list[UUID] = Field(default_factory=list)

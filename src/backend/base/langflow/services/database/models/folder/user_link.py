from typing import Optional
from uuid import UUID
from sqlmodel import SQLModel, Field, Relationship

class FolderUserLink(SQLModel, table=True):
    folder_id: UUID = Field(foreign_key="folder.id", primary_key=True)
    user_id: UUID = Field(foreign_key="user.id", primary_key=True)

folder_user_link = FolderUserLink 
# langflow/services/database/models/paused_flow/model.py
from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import Text
from sqlmodel import JSON, Column, Field, SQLModel

class PausedFlow(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, unique=True)
    run_id: str = Field(index=True, unique=True)
    flow_id: UUID = Field(foreign_key="flow.id")
    user_id: UUID = Field(foreign_key="user.id")
    graph_state: dict = Field(sa_column=Column(JSON))
    hitl_component_id: str = Field(nullable=False)
    question: str = Field(sa_column=Column(Text))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
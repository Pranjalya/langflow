# langflow/api/v1/resume.py
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from langflow.api.build import start_flow_build
from langflow.api.utils import CurrentActiveUser
from langflow.graph import Graph
from langflow.services.database.models.paused_flow.model import PausedFlow
from langflow.services.deps import get_queue_service, session_scope
from langflow.services.job_queue.service import JobQueueService

router = APIRouter(tags=["Resume"], prefix="/resume")

class ResumeRequest(BaseModel):
    answer: str

@router.post("/{run_id}")
async def resume_flow_run(
    run_id: str,
    request: ResumeRequest,
    current_user: CurrentActiveUser,
    queue_service: Annotated[JobQueueService, Depends(get_queue_service)],
):
    """
    Resumes a paused flow run with the user's provided answer.
    """
    async with session_scope() as session:
        # 1. Find the paused flow state
        paused_flow = await session.get(PausedFlow, run_id)
        if not paused_flow or paused_flow.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Paused flow not found or access denied.")

        # 2. Deserialize the graph
        graph_state = paused_flow.graph_state
        graph = Graph.from_payload(graph_state, flow_id=str(paused_flow.flow_id), user_id=str(current_user.id))
        graph.set_run_id(paused_flow.run_id)

        # 3. Find the HITL vertex and inject the answer
        hitl_vertex = graph.get_vertex(paused_flow.hitl_component_id)
        hitl_vertex.update_raw_params({"user_response": request.answer}, overwrite=True)

        # 4. Delete the paused state from the database
        await session.delete(paused_flow)
        await session.commit()

        # 5. Resume the flow execution by starting a new build task
        # The `start_flow_build` function is modified to handle this resume case.
        new_job_id = await start_flow_build(
            flow_id=uuid.UUID(graph.flow_id),
            current_user=current_user,
            queue_service=queue_service,
            # Pass resume-specific parameters
            resume_graph=graph,
            start_component_id=paused_flow.hitl_component_id,
            is_resume=True,
            # These are not needed for resume but required by the function signature
            background_tasks=None, # type: ignore
            inputs=None,
            data=None,
            files=None,
            stop_component_id=None,
            log_builds=True,
        )

        return {"job_id": new_job_id}
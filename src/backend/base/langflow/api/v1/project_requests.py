from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import select

from langflow.api.utils import CurrentActiveUser, DbSession
from langflow.services.database.models.project_request.model import (
    ProjectRequest,
    ProjectRequestCreate,
    ProjectRequestRead,
    ProjectRequestStatus,
    ProjectRequestUpdate,
)
from langflow.services.database.models.user.model import User

router = APIRouter(prefix="/project-requests", tags=["Project Requests"])


@router.post("/", response_model=ProjectRequestRead, status_code=201)
async def create_project_request(
    *,
    session: DbSession,
    project_request: ProjectRequestCreate,
    current_user: CurrentActiveUser,
):
    """Create a new project request."""
    try:
        # Create new project request
        new_request = ProjectRequest(
            **project_request.model_dump(),
            requester_id=current_user.id,
        )
        session.add(new_request)
        await session.commit()
        await session.refresh(new_request)
        return new_request
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/", response_model=list[ProjectRequestRead], status_code=200)
async def read_project_requests(
    *,
    session: DbSession,
    current_user: CurrentActiveUser,
):
    """Get all project requests. Only admin users can access this endpoint."""
    try:
        # Check if user is admin
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=403,
                detail="Only admin users can access project requests",
            )

        # Get all project requests
        requests = (await session.exec(select(ProjectRequest))).all()
        return requests
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.patch("/{request_id}", response_model=ProjectRequestRead, status_code=200)
async def update_project_request(
    *,
    session: DbSession,
    request_id: UUID,
    request_update: ProjectRequestUpdate,
    current_user: CurrentActiveUser,
):
    """Update a project request. Only admin users can update requests."""
    try:
        # Check if user is admin
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=403,
                detail="Only admin users can update project requests",
            )

        # Get the project request
        project_request = (await session.exec(select(ProjectRequest).where(ProjectRequest.id == request_id))).first()
        if not project_request:
            raise HTTPException(status_code=404, detail="Project request not found")

        # Update the request
        project_request.status = request_update.status
        project_request.rejection_reason = request_update.rejection_reason
        project_request.resolved_at = datetime.now(timezone.utc)

        session.add(project_request)
        await session.commit()
        await session.refresh(project_request)

        # If request is approved, create the project
        if request_update.status == ProjectRequestStatus.APPROVED:
            from langflow.services.database.models.folder.model import Folder
            from langflow.services.database.models.resource_permission import ResourcePermission

            # Create new project
            new_project = Folder(
                name=project_request.project_name,
                description=project_request.justification,
                user_id=current_user.id,  # Admin becomes the owner
            )
            session.add(new_project)
            await session.commit()
            await session.refresh(new_project)

            # Add requester as a user
            requester = (await session.exec(select(User).where(User.id == project_request.requester_id))).first()
            if requester:
                new_project.users = [requester]
                permission = ResourcePermission(
                    resource_id=new_project.id,
                    grantor_id=current_user.id,
                    grantee_id=requester.id,
                    permission_level="USER",
                    resource_type="project",
                )
                session.add(permission)

            # Add other requested users
            for user_id in project_request.requested_users:
                user = (await session.exec(select(User).where(User.id == user_id))).first()
                if user:
                    if not new_project.users:
                        new_project.users = []
                    new_project.users.append(user)
                    permission = ResourcePermission(
                        resource_id=new_project.id,
                        grantor_id=current_user.id,
                        grantee_id=user.id,
                        permission_level="USER",
                        resource_type="project",
                    )
                    session.add(permission)

            await session.commit()

        return project_request
    except Exception as e:
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e)) from e 
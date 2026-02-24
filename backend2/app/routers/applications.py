"""
Applications routes
Candidate job applications and recruiter application management
"""

import logging
import json
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from sqlmodel import Session, select
from typing import List
from app.database import get_session
from app.models import Application, Candidate, Company, JobPosting, JobProfile, User, Notification
from app.schemas import ApplicationRead
from app.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/applications", tags=["Applications"])


def create_notification(session: Session, user_id: int, event_type: str, title: str, message: str, payload: dict | None = None, actor_user_id: int | None = None):
    session.add(Notification(
        user_id=user_id,
        actor_user_id=actor_user_id,
        event_type=event_type,
        title=title,
        message=message,
        payload_json=json.dumps(payload) if payload else None,
    ))


class ApplicationApplyRequest(BaseModel):
    job_posting_id: int
    job_profile_id: int


class ApplicationStatusRequest(BaseModel):
    status: str


@router.post("/apply", response_model=dict)
def apply_to_job(
    data: ApplicationApplyRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Candidate applies to a job posting"""
    job_posting_id = data.job_posting_id
    job_profile_id = data.job_profile_id
    logger.info(f"[APPLICATION] job_posting_id={job_posting_id}, job_profile_id={job_profile_id}")
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate profile not found")
    
    job_profile = session.get(JobProfile, job_profile_id)
    if not job_profile or job_profile.candidate_id != candidate.id:
        raise HTTPException(status_code=404, detail="Job profile not found")
    
    job_posting = session.get(JobPosting, job_posting_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Check if already applied
    existing = session.exec(
        select(Application)
        .where(Application.candidate_id == candidate.id)
        .where(Application.job_posting_id == job_posting_id)
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this job")
    
    # Create application
    application = Application(
        candidate_id=candidate.id,
        job_posting_id=job_posting_id,
        job_profile_id=job_profile_id,
        status="applied"
    )
    
    session.add(application)
    session.flush()

    posting_company = session.get(Company, job_posting.company_id)
    if posting_company:
        create_notification(
            session,
            user_id=posting_company.user_id,
            actor_user_id=user.id,
            event_type="new_application_received",
            title="New application received",
            message=f"{candidate.name} applied for {job_posting.job_title} ({job_profile.profile_name})",
            payload={"application_id": application.id, "candidate_id": candidate.id, "candidate_name": candidate.name, "job_posting_id": job_posting.id, "job_title": job_posting.job_title, "job_profile_id": job_profile_id, "job_profile_name": job_profile.profile_name}
        )

    create_notification(
        session,
        user_id=user.id,
        actor_user_id=user.id,
        event_type="application_submitted",
        title="Application submitted",
        message=f"You applied for {job_posting.job_title} using profile {job_profile.profile_name}",
        payload={"application_id": application.id, "job_posting_id": job_posting.id, "job_title": job_posting.job_title, "job_profile_id": job_profile_id, "job_profile_name": job_profile.profile_name}
    )

    session.commit()
    session.refresh(application)
    
    return {
        "message": "Application submitted successfully",
        "application_id": application.id,
        "job_title": job_posting.job_title
    }


@router.get("/my-applications", response_model=List[ApplicationRead])
def get_my_applications(
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Get all applications for current candidate"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    applications = session.exec(
        select(Application).where(Application.candidate_id == candidate.id)
    ).all()
    
    return applications


@router.put("/{application_id}/status", response_model=dict)
def update_application_status(
    application_id: int,
    data: ApplicationStatusRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Update application status (Recruiter only)"""
    status = data.status
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="Recruiters only")
    
    application = session.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Verify the job posting belongs to this company
    job_posting = session.get(JobPosting, application.job_posting_id)
    if not job_posting or job_posting.company_id != company.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    # Valid statuses: applied, reviewed, shortlisted, rejected, offered
    valid_statuses = ["applied", "reviewed", "shortlisted", "rejected", "offered"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    application.status = status
    session.add(application)

    create_notification(
        session,
        user_id=application.candidate.user_id,
        actor_user_id=user.id,
        event_type="application_status_changed",
        title="Application status updated",
        message=f"Your application for {job_posting.job_title} is now '{status}'",
        payload={"application_id": application.id, "job_posting_id": job_posting.id, "status": status}
    )

    if status == "shortlisted":
        candidate = session.get(Candidate, application.candidate_id)
        candidate_name = candidate.name if candidate else "Candidate"
        create_notification(
            session,
            user_id=user.id,
            actor_user_id=user.id,
            event_type="candidate_shortlisted",
            title="Candidate shortlisted",
            message=f"{candidate_name} shortlisted for {job_posting.job_title}",
            payload={"application_id": application.id, "candidate_id": application.candidate_id, "candidate_name": candidate_name, "job_posting_id": job_posting.id, "job_title": job_posting.job_title}
        )

    session.commit()
    
    return {
        "message": f"Application status updated to {status}",
        "application_id": application.id,
        "new_status": status
    }


@router.delete("/{application_id}", response_model=dict)
def withdraw_application(
    application_id: int,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Candidate withdraws their application"""
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    application = session.get(Application, application_id)
    if not application or application.candidate_id != candidate.id:
        raise HTTPException(status_code=404, detail="Application not found")
    
    session.delete(application)
    session.commit()
    
    return {"message": "Application withdrawn successfully"}

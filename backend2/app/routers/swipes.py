"""
Swipes routes
Like/Pass interactions from candidates
"""

import logging
import json
from fastapi import APIRouter, HTTPException, Depends, status, Body
from pydantic import BaseModel
from sqlmodel import Session, select
from app.database import get_session
from app.models import Swipe, Candidate, Company, JobPosting, JobProfile, User, Match, Notification
from app.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/swipes", tags=["Swipes"])


def create_notification(session: Session, user_id: int, event_type: str, title: str, message: str, payload: dict | None = None, actor_user_id: int | None = None):
    notif = Notification(
        user_id=user_id,
        actor_user_id=actor_user_id,
        event_type=event_type,
        title=title,
        message=message,
        payload_json=json.dumps(payload) if payload else None,
    )
    session.add(notif)


class CandidateSwipeRequest(BaseModel):
    job_profile_id: int
    job_posting_id: int


class RecruiterSwipeRequest(BaseModel):
    candidate_id: int
    job_profile_id: int
    job_posting_id: int


@router.post("/like")
def swipe_like(
    data: CandidateSwipeRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Candidate likes a job posting"""
    job_profile_id = data.job_profile_id
    job_posting_id = data.job_posting_id
    logger.info(f"[CANDIDATE LIKE] job_profile_id={job_profile_id}, job_posting_id={job_posting_id}")
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    job_profile = session.get(JobProfile, job_profile_id)
    if not job_profile or job_profile.candidate_id != candidate.id:
        raise HTTPException(status_code=404, detail="Job profile not found")
    
    job_posting = session.get(JobPosting, job_posting_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Check for duplicate swipe
    existing_swipe = session.exec(
        select(Swipe)
        .where(Swipe.candidate_id == candidate.id)
        .where(Swipe.job_posting_id == job_posting_id)
        .where(Swipe.action == "like")
        .where(Swipe.action_by == "candidate")
    ).first()
    if existing_swipe:
        return {"message": "Already liked this job posting", "action": "like"}
    
    # Create swipe
    swipe = Swipe(
        candidate_id=candidate.id,
        company_id=job_posting.company_id,
        job_profile_id=job_profile_id,
        job_posting_id=job_posting_id,
        action="like",
        action_by="candidate"
    )
    
    # Create or update match
    existing_match = session.exec(
        select(Match)
        .where(Match.candidate_id == candidate.id)
        .where(Match.company_id == job_posting.company_id)
        .where(Match.job_posting_id == job_posting_id)
    ).first()
    
    if existing_match:
        existing_match.candidate_liked = True
    else:
        match = Match(
            candidate_id=candidate.id,
            company_id=job_posting.company_id,
            job_profile_id=job_profile_id,
            job_posting_id=job_posting_id,
            candidate_liked=True,
            match_percentage=80
        )
        session.add(match)
    
    session.add(swipe)

    # Notify recruiter/company user who owns this posting
    posting_company = session.get(Company, job_posting.company_id)
    if posting_company:
        create_notification(
            session,
            user_id=posting_company.user_id,
            actor_user_id=user.id,
            event_type="candidate_liked_job",
            title="Candidate liked your job",
            message=f"{candidate.name} liked {job_posting.job_title}",
            payload={"candidate_id": candidate.id, "job_posting_id": job_posting.id, "job_profile_id": job_profile_id}
        )

    session.commit()
    
    return {"message": "Liked job posting", "action": "like"}


@router.post("/pass")
def swipe_pass(
    data: CandidateSwipeRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Candidate passes on a job posting"""
    job_profile_id = data.job_profile_id
    job_posting_id = data.job_posting_id
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    job_profile = session.get(JobProfile, job_profile_id)
    if not job_profile or job_profile.candidate_id != candidate.id:
        raise HTTPException(status_code=404, detail="Job profile not found")
    
    job_posting = session.get(JobPosting, job_posting_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Create swipe
    swipe = Swipe(
        candidate_id=candidate.id,
        company_id=job_posting.company_id,
        job_profile_id=job_profile_id,
        job_posting_id=job_posting_id,
        action="pass",
        action_by="candidate"
    )
    
    session.add(swipe)
    session.commit()
    
    return {"message": "Passed on job posting", "action": "pass"}


@router.post("/ask-to-apply")
def ask_to_apply(
    data: CandidateSwipeRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Candidate asks to apply for a job"""
    job_profile_id = data.job_profile_id
    job_posting_id = data.job_posting_id
    
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    candidate = session.exec(select(Candidate).where(Candidate.user_id == user.id)).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    job_profile = session.get(JobProfile, job_profile_id)
    if not job_profile or job_profile.candidate_id != candidate.id:
        raise HTTPException(status_code=404, detail="Job profile not found")
    
    job_posting = session.get(JobPosting, job_posting_id)
    if not job_posting:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Create swipe
    swipe = Swipe(
        candidate_id=candidate.id,
        company_id=job_posting.company_id,
        job_profile_id=job_profile_id,
        job_posting_id=job_posting_id,
        action="ask_to_apply",
        action_by="candidate"
    )
    
    # Create or update match
    existing_match = session.exec(
        select(Match)
        .where(Match.candidate_id == candidate.id)
        .where(Match.company_id == job_posting.company_id)
        .where(Match.job_posting_id == job_posting_id)
    ).first()
    
    if existing_match:
        existing_match.candidate_asked_to_apply = True
    else:
        match = Match(
            candidate_id=candidate.id,
            company_id=job_posting.company_id,
            job_profile_id=job_profile_id,
            job_posting_id=job_posting_id,
            candidate_asked_to_apply=True,
            match_percentage=85
        )
        session.add(match)
    
    session.add(swipe)

    posting_company = session.get(Company, job_posting.company_id)
    if posting_company:
        create_notification(
            session,
            user_id=posting_company.user_id,
            actor_user_id=user.id,
            event_type="candidate_asked_to_apply",
            title="Candidate requested to apply",
            message=f"{candidate.name} asked to apply for {job_posting.job_title}",
            payload={"candidate_id": candidate.id, "job_posting_id": job_posting.id, "job_profile_id": job_profile_id}
        )

    session.commit()
    
    return {"message": "Asked to apply for job", "action": "ask_to_apply"}


# ============ RECRUITER SWIPE ACTIONS ============

@router.post("/recruiter/like")
def recruiter_like(
    data: RecruiterSwipeRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Recruiter likes a candidate"""
    logger.info(f"[RECRUITER LIKE] candidate_id={data.candidate_id}, job_profile_id={data.job_profile_id}, job_posting_id={data.job_posting_id}")
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="Recruiters only")
    
    # Get all company IDs with the same company name
    company_ids = list(session.exec(
        select(Company.id).where(Company.company_name == company.company_name)
    ).all())
    
    candidate = session.get(Candidate, data.candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    job_posting = session.get(JobPosting, data.job_posting_id)
    if not job_posting or job_posting.company_id not in company_ids:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Create swipe
    swipe = Swipe(
        candidate_id=data.candidate_id,
        company_id=company.id,
        job_profile_id=data.job_profile_id,
        job_posting_id=data.job_posting_id,
        action="like",
        action_by="recruiter"
    )
    
    # Create or update match
    existing_match = session.exec(
        select(Match)
        .where(Match.candidate_id == data.candidate_id)
        .where(Match.company_id == company.id)
        .where(Match.job_posting_id == data.job_posting_id)
    ).first()
    
    if existing_match:
        existing_match.company_liked = True
    else:
        match = Match(
            candidate_id=data.candidate_id,
            company_id=company.id,
            job_profile_id=data.job_profile_id,
            job_posting_id=data.job_posting_id,
            company_liked=True,
            match_percentage=80
        )
        session.add(match)
    
    session.add(swipe)

    create_notification(
        session,
        user_id=candidate.user_id,
        actor_user_id=user.id,
        event_type="recruiter_liked_profile",
        title="Recruiter liked your profile",
        message=f"{company.company_name or 'A recruiter'} liked your profile for {job_posting.job_title}",
        payload={"candidate_id": candidate.id, "job_posting_id": job_posting.id, "job_profile_id": data.job_profile_id}
    )

    session.commit()
    logger.info(f"[RECRUITER LIKE] Success - swipe recorded for candidate {data.candidate_id}")
    
    return {"message": "Liked candidate", "action": "like"}


@router.post("/recruiter/pass")
def recruiter_pass(
    data: RecruiterSwipeRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Recruiter passes on a candidate"""
    logger.info(f"[RECRUITER PASS] candidate_id={data.candidate_id}, job_profile_id={data.job_profile_id}, job_posting_id={data.job_posting_id}")
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="Recruiters only")
    
    # Get all company IDs with the same company name
    company_ids = list(session.exec(
        select(Company.id).where(Company.company_name == company.company_name)
    ).all())
    
    job_posting = session.get(JobPosting, data.job_posting_id)
    if not job_posting or job_posting.company_id not in company_ids:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Create swipe
    swipe = Swipe(
        candidate_id=data.candidate_id,
        company_id=company.id,
        job_profile_id=data.job_profile_id,
        job_posting_id=data.job_posting_id,
        action="pass",
        action_by="recruiter"
    )
    
    session.add(swipe)
    session.commit()
    
    return {"message": "Passed on candidate", "action": "pass"}


@router.post("/recruiter/ask-to-apply")
def recruiter_ask_to_apply(
    data: RecruiterSwipeRequest,
    current_user: dict = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """Recruiter asks candidate to apply"""
    logger.info(f"[RECRUITER ASK-TO-APPLY] candidate_id={data.candidate_id}, job_profile_id={data.job_profile_id}, job_posting_id={data.job_posting_id}")
    user = session.exec(select(User).where(User.email == current_user["email"])).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    company = session.exec(select(Company).where(Company.user_id == user.id)).first()
    if not company:
        raise HTTPException(status_code=403, detail="Recruiters only")
    
    # Get all company IDs with the same company name
    company_ids = list(session.exec(
        select(Company.id).where(Company.company_name == company.company_name)
    ).all())
    
    job_posting = session.get(JobPosting, data.job_posting_id)
    if not job_posting or job_posting.company_id not in company_ids:
        raise HTTPException(status_code=404, detail="Job posting not found")
    
    # Create swipe
    swipe = Swipe(
        candidate_id=data.candidate_id,
        company_id=company.id,
        job_profile_id=data.job_profile_id,
        job_posting_id=data.job_posting_id,
        action="ask_to_apply",
        action_by="recruiter"
    )
    
    # Create or update match
    existing_match = session.exec(
        select(Match)
        .where(Match.candidate_id == data.candidate_id)
        .where(Match.company_id == company.id)
        .where(Match.job_posting_id == data.job_posting_id)
    ).first()
    
    if existing_match:
        existing_match.company_asked_to_apply = True
    else:
        match = Match(
            candidate_id=data.candidate_id,
            company_id=company.id,
            job_profile_id=data.job_profile_id,
            job_posting_id=data.job_posting_id,
            company_asked_to_apply=True,
            match_percentage=85
        )
        session.add(match)
    
    session.add(swipe)

    candidate = session.get(Candidate, data.candidate_id)
    if candidate:
        create_notification(
            session,
            user_id=candidate.user_id,
            actor_user_id=user.id,
            event_type="recruiter_asked_to_apply",
            title="Recruiter invited you to apply",
            message=f"{company.company_name or 'A recruiter'} invited you to apply for {job_posting.job_title}",
            payload={"candidate_id": data.candidate_id, "job_posting_id": job_posting.id, "job_profile_id": data.job_profile_id}
        )

    session.commit()
    
    return {"message": "Asked candidate to apply", "action": "ask_to_apply"}

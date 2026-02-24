"""
SQLModel Data Models for TalentGraph V2
Candidate-centric talent marketplace with enhanced job profiles and postings
"""

from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship
from enum import Enum


class UserRole(str, Enum):
    CANDIDATE = "candidate"
    ADMIN = "admin"
    HR = "hr"
    RECRUITER = "recruiter"


class WorkType(str, Enum):
    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"


class EmploymentType(str, Enum):
    FT = "ft"
    PT = "pt"
    CONTRACT = "contract"
    C2C = "c2c"
    W2 = "w2"


class VisaStatus(str, Enum):
    US_CITIZEN = "us_citizen"
    US_GREEN_CARD = "us_green_card"
    US_VISA = "us_visa"
    EU_CITIZEN = "eu_citizen"
    UK_CITIZEN = "uk_citizen"
    WORK_VISA = "work_visa"


class CurrencyType(str, Enum):
    USD = "usd"
    GBP = "gbp"
    EUR = "eur"


# ============ USER MODELS ============

class User(SQLModel, table=True):
    """Base user model for candidates, recruiters, admins"""
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    full_name: str
    password_hash: str
    role: UserRole = Field(default=UserRole.CANDIDATE)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    candidate: Optional["Candidate"] = Relationship(back_populates="user")
    company: Optional["Company"] = Relationship(back_populates="user")


# ============ CANDIDATE MODELS ============

class Candidate(SQLModel, table=True):
    """Candidate profile core information"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    name: str
    email: str = Field(index=True)
    phone: str
    residential_address: str
    location_state: str
    location_county: str
    location_zipcode: str
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    profile_summary: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: User = Relationship(back_populates="candidate")
    resumes: List["Resume"] = Relationship(back_populates="candidate")
    certifications: List["Certification"] = Relationship(back_populates="candidate")
    job_profiles: List["JobProfile"] = Relationship(back_populates="candidate")
    matches: List["Match"] = Relationship(back_populates="candidate")
    swipes: List["Swipe"] = Relationship(back_populates="candidate")
    applications: List["Application"] = Relationship(back_populates="candidate")


class Resume(SQLModel, table=True):
    """Resume uploads for candidates"""
    id: Optional[int] = Field(default=None, primary_key=True)
    candidate_id: int = Field(foreign_key="candidate.id")
    filename: str
    storage_path: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    candidate: Candidate = Relationship(back_populates="resumes")


class Certification(SQLModel, table=True):
    """Certifications for candidates"""
    id: Optional[int] = Field(default=None, primary_key=True)
    candidate_id: int = Field(foreign_key="candidate.id")
    name: str
    issuer: Optional[str] = None
    filename: Optional[str] = None
    storage_path: Optional[str] = None
    issued_date: Optional[str] = None
    expiry_date: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    candidate: Candidate = Relationship(back_populates="certifications")


class Skill(SQLModel, table=True):
    """Skills associated with a job profile"""
    id: Optional[int] = Field(default=None, primary_key=True)
    job_profile_id: int = Field(foreign_key="jobprofile.id")
    skill_name: str
    skill_category: str  # technical, functional, soft
    proficiency_level: int = Field(default=3)  # 1-5 rating
    
    # Relationships
    job_profile: "JobProfile" = Relationship(back_populates="skills")


class LocationPreference(SQLModel, table=True):
    """Location preferences for job profiles (up to 3 per profile)"""
    id: Optional[int] = Field(default=None, primary_key=True)
    job_profile_id: int = Field(foreign_key="jobprofile.id")
    city: str
    state: str
    country: Optional[str] = None
    
    # Relationships
    job_profile: "JobProfile" = Relationship(back_populates="location_preferences")


class JobProfile(SQLModel, table=True):
    """Multiple job profiles per candidate (dating app profiles)"""
    id: Optional[int] = Field(default=None, primary_key=True)
    candidate_id: int = Field(foreign_key="candidate.id")
    profile_name: str
    product_vendor: str  # Oracle, SAP, etc.
    product_type: str
    job_role: str
    years_of_experience: int
    worktype: WorkType
    employment_type: EmploymentType
    salary_min: float
    salary_max: float
    salary_currency: CurrencyType
    resume_id: Optional[int] = Field(default=None, foreign_key="resume.id")
    certification_ids: Optional[str] = None  # JSON stringified list of cert IDs
    visa_status: VisaStatus
    ethnicity: Optional[str] = None
    availability_date: Optional[str] = None
    profile_summary: Optional[str] = None
    # ── NEW: Role & Domain ──
    preferred_job_titles: Optional[str] = None   # JSON array
    job_category: Optional[str] = None           # JSON array
    seniority_level: Optional[str] = None        # Entry/Junior/Mid/Senior/Lead/Manager
    # ── NEW: Work Style ──
    travel_willingness: Optional[str] = None     # none/occasional/frequent
    shift_preference: Optional[str] = None       # day/night/flexible
    # ── NEW: Location Extras ──
    remote_acceptance: Optional[str] = None      # fully_remote/remote_country/remote_anywhere
    relocation_willingness: Optional[str] = None # yes/no/depends
    # ── NEW: Compensation Extras ──
    pay_type: Optional[str] = None               # hourly/annually
    negotiability: Optional[str] = None          # fixed/negotiable/depends
    # ── NEW: Skills Extras ──
    core_strengths: Optional[str] = None         # JSON array (2-5 strengths)
    # ── NEW: Experience & Availability ──
    relevant_experience: Optional[int] = None
    notice_period: Optional[str] = None          # immediate/2weeks/1month/2months/3months
    start_date_preference: Optional[str] = None  # ISO date string
    # ── NEW: Authorization ──
    security_clearance: Optional[str] = None     # none/eligible/active
    # ── NEW: Education ──
    highest_education: Optional[str] = None      # high_school/associate/bachelor/master/doctorate
    # ── NEW: Resume Attachments ──
    primary_resume_id: Optional[int] = None
    attached_resume_ids: Optional[str] = None    # JSON array of resume IDs
    # ── NEW: Socials / Hyperlinks ──
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    twitter_url: Optional[str] = None
    website_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    candidate: Candidate = Relationship(back_populates="job_profiles")
    skills: List[Skill] = Relationship(back_populates="job_profile")
    location_preferences: List[LocationPreference] = Relationship(back_populates="job_profile")
    matches: List["Match"] = Relationship(back_populates="job_profile")


# ============ COMPANY MODELS ============

class Company(SQLModel, table=True):
    """Company/Recruiter profile"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", unique=True)
    company_name: str
    company_email: str = Field(index=True)
    employee_type: str  # Admin, HR, Recruiter/Manager
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: User = Relationship(back_populates="company")
    job_postings: List["JobPosting"] = Relationship(back_populates="company")
    matches: List["Match"] = Relationship(back_populates="company")
    swipes: List["Swipe"] = Relationship(back_populates="company")


class JobPostingSkill(SQLModel, table=True):
    """Skills required for a job posting with ratings"""
    id: Optional[int] = Field(default=None, primary_key=True)
    job_posting_id: int = Field(foreign_key="jobposting.id", index=True)
    skill_name: str
    skill_category: str  # "technical" or "soft"
    rating: int = Field(default=3)  # 1-10 rating
    
    # Relationships
    job_posting: "JobPosting" = Relationship(back_populates="posting_skills")


class JobPosting(SQLModel, table=True):
    """Job postings created by recruiters"""
    id: Optional[int] = Field(default=None, primary_key=True)
    company_id: int = Field(foreign_key="company.id")
    job_title: str
    product_vendor: str  # Oracle, SAP, etc.
    product_type: str
    job_role: str
    seniority_level: str  # e.g., "Entry, Junior, Mid, Senior, Lead, Manager, Director"
    worktype: WorkType
    location: str
    employment_type: EmploymentType
    start_date: str
    salary_min: float
    salary_max: float
    salary_currency: CurrencyType
    job_description: str
    required_skills: Optional[str] = None  # JSON: [{"skill": "Python", "category": "technical"}, ...]
    # New fields for Job Posting Builder
    end_date: Optional[str] = None
    job_category: Optional[str] = None
    travel_requirements: Optional[str] = None  # None, 0-10%, 10-25%, 25-50%, 50%+
    visa_info: Optional[str] = None  # US Citizen, GC, H1B, OPT, CPT, etc.
    education_qualifications: Optional[str] = None  # JSON array
    certifications_required: Optional[str] = None  # JSON array
    pay_type: Optional[str] = None  # "hourly" or "annually"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True)
    
    # Relationships
    company: Company = Relationship(back_populates="job_postings")
    applications: List["Application"] = Relationship(back_populates="job_posting")
    matches: List["Match"] = Relationship(back_populates="job_posting")
    posting_skills: List["JobPostingSkill"] = Relationship(back_populates="job_posting")


# ============ INTERACTION MODELS ============

class Swipe(SQLModel, table=True):
    """Swipe interactions (like/pass) from both candidates and recruiters"""
    id: Optional[int] = Field(default=None, primary_key=True)
    candidate_id: int = Field(foreign_key="candidate.id", index=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    job_profile_id: int = Field(foreign_key="jobprofile.id")
    job_posting_id: int = Field(foreign_key="jobposting.id")
    action: str  # "like", "pass", "ask_to_apply"
    action_by: str  # "candidate" or "recruiter"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    candidate: Candidate = Relationship(back_populates="swipes")
    company: Company = Relationship(back_populates="swipes")


class Match(SQLModel, table=True):
    """Mutual match between candidate and recruiter"""
    id: Optional[int] = Field(default=None, primary_key=True)
    candidate_id: int = Field(foreign_key="candidate.id", index=True)
    company_id: int = Field(foreign_key="company.id", index=True)
    job_profile_id: int = Field(foreign_key="jobprofile.id")
    job_posting_id: int = Field(foreign_key="jobposting.id")
    match_percentage: float = Field(default=0)
    match_reason: Optional[str] = None  # Why they matched
    candidate_liked: bool = Field(default=False)
    company_liked: bool = Field(default=False)
    candidate_asked_to_apply: bool = Field(default=False)
    company_asked_to_apply: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    candidate: Candidate = Relationship(back_populates="matches")
    job_profile: JobProfile = Relationship(back_populates="matches")
    company: Company = Relationship(back_populates="matches")
    job_posting: JobPosting = Relationship(back_populates="matches")


class Application(SQLModel, table=True):
    """Application from candidate to job posting"""
    id: Optional[int] = Field(default=None, primary_key=True)
    candidate_id: int = Field(foreign_key="candidate.id", index=True)
    job_posting_id: int = Field(foreign_key="jobposting.id", index=True)
    job_profile_id: int = Field(foreign_key="jobprofile.id")
    status: str = Field(default="applied")  # applied, reviewed, shortlisted, rejected, offered
    applied_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    candidate: Candidate = Relationship(back_populates="applications")
    job_posting: JobPosting = Relationship(back_populates="applications")


class Notification(SQLModel, table=True):
    """User notification events for dashboard bell icon"""
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    actor_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    event_type: str
    title: str
    message: str
    payload_json: Optional[str] = None
    is_read: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

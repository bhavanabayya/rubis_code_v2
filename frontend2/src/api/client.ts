import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiClient = {
  // Candidate Auth
  candidateSignup: (email: string, fullName: string, password: string) =>
    api.post('/auth/candidate/signup', { 
      email, 
      full_name: fullName, 
      password 
    }),
  
  candidateLogin: (email: string, password: string) =>
    api.post('/auth/candidate/login', { email, password }),

  // Company Auth
  companySignup: (email: string, fullName: string, password: string, companyRole: string) =>
    api.post('/auth/company/signup', { 
      email, 
      full_name: fullName, 
      password,
      company_role: companyRole 
    }),
  
  companyLogin: (email: string, password: string) =>
    api.post('/auth/company/login', { email, password }),
  
  getCurrentUser: () =>
    api.get('/auth/me'),

  // Candidates
  createCandidateProfile: (data: any) =>
    api.post('/candidates/profile', data),
  
  getCandidateProfile: () =>
    api.get('/candidates/profile'),
  
  updateCandidateProfile: (data: any) =>
    api.put('/candidates/profile', data),
  
  createJobProfile: (data: any) =>
    api.post('/candidates/job-profiles', data),
  
  getJobProfiles: () =>
    api.get('/candidates/job-profiles'),
  
  updateJobProfile: (id: number, data: any) =>
    api.put(`/candidates/job-profiles/${id}`, data),
  
  deleteJobProfile: (id: number) =>
    api.delete(`/candidates/job-profiles/${id}`),
  
  // Skill catalogs for candidate job preferences
  getCandidateSkillCatalogs: () =>
    api.get('/candidates/skill-catalogs'),

  // Resume uploads
  uploadResume: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/candidates/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  getResumes: () =>
    api.get('/candidates/resumes'),
  
  deleteResume: (id: number) =>
    api.delete(`/candidates/resumes/${id}`),
  
  // Certification uploads
  uploadCertification: (file: File, name: string, issuer?: string, issuedDate?: string, expiryDate?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (issuer) formData.append('issuer', issuer);
    if (issuedDate) formData.append('issued_date', issuedDate);
    if (expiryDate) formData.append('expiry_date', expiryDate);
    return api.post('/candidates/certifications/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  
  getCertifications: () =>
    api.get('/candidates/certifications'),
  
  deleteCertification: (id: number) =>
    api.delete(`/candidates/certifications/${id}`),

  // Company
  createCompanyProfile: (data: any) =>
    api.post('/company/profile', data),
  
  getCompanyProfile: () =>
    api.get('/company/profile'),
  
  updateCompanyProfile: (data: any) =>
    api.put('/company/profile', data),

  // Job Postings
  createJobPosting: (data: any) =>
    api.post('/job-postings', data),
  
  getJobPostings: () =>
    api.get('/job-postings'),
  
  getJobPosting: (id: number) =>
    api.get(`/job-postings/${id}`),
  
  updateJobPosting: (id: number, data: any) =>
    api.put(`/job-postings/${id}`, data),
  
  deleteJobPosting: (id: number) =>
    api.delete(`/job-postings/${id}`),
  
  toggleJobPostingActive: (id: number) =>
    api.post(`/job-postings/${id}/toggle-active`),

  getSkillCatalogs: () =>
    api.get('/job-postings/catalogs'),

  addSkillToPosting: (jobId: number, data: any) =>
    api.post(`/job-postings/${jobId}/skills`, data),

  updatePostingSkill: (jobId: number, skillId: number, data: any) =>
    api.put(`/job-postings/${jobId}/skills/${skillId}`, data),

  deletePostingSkill: (jobId: number, skillId: number) =>
    api.delete(`/job-postings/${jobId}/skills/${skillId}`),

  // Matches
  getMatches: () =>
    api.get('/matches'),
  
  getMutualMatches: () =>
    api.get('/matches/mutual'),
  
  likeMatch: (matchId: number) =>
    api.post(`/matches/${matchId}/like`),
  
  unlikeMatch: (matchId: number) =>
    api.post(`/matches/${matchId}/unlike`),
  
  askToApply: (matchId: number) =>
    api.post(`/matches/${matchId}/ask-to-apply`),

  // Recommendations
  getJobRecommendations: (jobId: number) =>
    api.get(`/recommendations/job/${jobId}`),
  
  getRecommendationsDashboard: () =>
    api.get('/recommendations/dashboard'),

  // Swipes
  swipeLike: (jobProfileId: number, jobPostingId: number) =>
    api.post('/swipes/like', { job_profile_id: jobProfileId, job_posting_id: jobPostingId }),
  
  swipePass: (jobProfileId: number, jobPostingId: number) =>
    api.post('/swipes/pass', { job_profile_id: jobProfileId, job_posting_id: jobPostingId }),
  
  swipeAskToApply: (jobProfileId: number, jobPostingId: number) =>
    api.post('/swipes/ask-to-apply', { job_profile_id: jobProfileId, job_posting_id: jobPostingId }),
  
  // Recruiter Swipes
  recruiterLike: (candidateId: number, jobProfileId: number, jobPostingId: number) =>
    api.post('/swipes/recruiter/like', { candidate_id: candidateId, job_profile_id: jobProfileId, job_posting_id: jobPostingId }),
  
  recruiterPass: (candidateId: number, jobProfileId: number, jobPostingId: number) =>
    api.post('/swipes/recruiter/pass', { candidate_id: candidateId, job_profile_id: jobProfileId, job_posting_id: jobPostingId }),
  
  recruiterAskToApply: (candidateId: number, jobProfileId: number, jobPostingId: number) =>
    api.post('/swipes/recruiter/ask-to-apply', { candidate_id: candidateId, job_profile_id: jobProfileId, job_posting_id: jobPostingId }),
  
  // Applications
  applyToJob: (jobPostingId: number, jobProfileId: number) =>
    api.post('/applications/apply', { job_posting_id: jobPostingId, job_profile_id: jobProfileId }),
  
  getMyApplications: () =>
    api.get('/applications/my-applications'),
  
  updateApplicationStatus: (applicationId: number, status: string) =>
    api.put(`/applications/${applicationId}/status`, { status }),
  
  withdrawApplication: (applicationId: number) =>
    api.delete(`/applications/${applicationId}`),
  
  // Dashboard - Candidate
  getCandidateRecommendations: (jobProfileId: number) =>
    api.get(`/dashboard/candidate/recommendations?job_profile_id=${jobProfileId}`),
  
  getRecruiterInvites: () =>
    api.get('/dashboard/candidate/recruiter-invites'),
  
  getAvailableJobs: () =>
    api.get('/dashboard/candidate/available-jobs'),
  
  getAppliedLikedJobs: () =>
    api.get('/dashboard/candidate/applied-liked-jobs'),
  
  getCandidateMatches: () =>
    api.get('/dashboard/candidate/matches'),
  
  // Dashboard - Recruiter
  getRecruiterRecommendations: (jobPostingId: number) =>
    api.get(`/dashboard/recruiter/recommendations?job_posting_id=${jobPostingId}`),
  
  getRecruiterShortlist: (jobPostingId?: number) =>
    api.get('/dashboard/recruiter/shortlist' + (jobPostingId ? `?job_posting_id=${jobPostingId}` : '')),
  
  getRecruiterApplications: (jobPostingId?: number) =>
    api.get('/dashboard/recruiter/applications' + (jobPostingId ? `?job_posting_id=${jobPostingId}` : '')),
  
  getRecruiterMatches: () =>
    api.get('/dashboard/recruiter/matches'),

  // Team Management
  getTeamMembers: () =>
    api.get('/dashboard/team-members'),

  // Notifications
  getNotifications: (unreadOnly: boolean = false, limit: number = 50) =>
    api.get(`/notifications?unread_only=${unreadOnly}&limit=${limit}`),

  getUnreadNotificationCount: () =>
    api.get('/notifications/unread-count'),

  markNotificationRead: (id: number) =>
    api.post(`/notifications/${id}/read`),

  markAllNotificationsRead: () =>
    api.post('/notifications/read-all'),

};

export default api;

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import { useNavigate } from 'react-router-dom';
import '../styles/ModernDashboard.css';
import '../styles/CandidateApplied.css';

const CandidateDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('recommendations');
  const [jobProfiles, setJobProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [appliedLiked, setAppliedLiked] = useState<any>({ applied_jobs: [], liked_jobs: [] });
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [recCardIndex, setRecCardIndex] = useState(0);
  const [jobListTab, setJobListTab] = useState<'liked' | 'applied'>('liked');
  const [drawerJob, setDrawerJob] = useState<any | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [viewInviteJob, setViewInviteJob] = useState<any | null>(null);
  const [viewAvailableJob, setViewAvailableJob] = useState<any | null>(null);
  const [viewMatchJob, setViewMatchJob] = useState<any | null>(null);
  const [viewRecommendationJob, setViewRecommendationJob] = useState<any | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    fetchUserProfile();
    fetchJobProfiles();
    fetchInvites();
    fetchAvailableJobs();
    fetchAppliedLiked();
    fetchMatches();
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (selectedProfileId) {
      fetchRecommendations();
      setRecCardIndex(0);
    }
  }, [selectedProfileId]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard navigation for recommendation cards
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (activeTab !== 'recommendations' || !recommendations?.length) return;
    const total = recommendations.filter((r: any) => !r.already_swiped).length;
    if (e.key === 'ArrowRight') {
      setRecCardIndex(prev => Math.min(prev + 1, total - 1));
    } else if (e.key === 'ArrowLeft') {
      setRecCardIndex(prev => Math.max(prev - 1, 0));
    }
  }, [activeTab, recommendations]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const fetchUserProfile = async () => {
    try {
      const response = await apiClient.getCandidateProfile();
      setUserProfile(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const fetchJobProfiles = async () => {
    console.log('[API CALL] Fetching job profiles');
    try {
      const response = await apiClient.getJobProfiles();
      console.log('[API SUCCESS] Job profiles fetched, count:', response.data.length);
      setJobProfiles(response.data);
      if (response.data.length > 0 && !selectedProfileId) {
        console.log('[STATE] Auto-selecting first profile:', response.data[0].id);
        setSelectedProfileId(response.data[0].id);
      }
    } catch (error) {
      console.error('[API ERROR] Failed to fetch job profiles:', error);
    }
  };

  const fetchRecommendations = async () => {
    if (!selectedProfileId) return;
    console.log('[API CALL] Fetching recommendations for profile:', selectedProfileId);
    setLoading(true);
    try {
      const response = await apiClient.getCandidateRecommendations(selectedProfileId);
      console.log('[API SUCCESS] Recommendations fetched, count:', response.data.length);
      setRecommendations(response.data);
    } catch (error) {
      console.error('[API ERROR] Failed to fetch recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const response = await apiClient.getRecruiterInvites();
      setInvites(response.data);
    } catch (error) {
      console.error('Failed to fetch invites:', error);
    }
  };

  const fetchAvailableJobs = async () => {
    try {
      const response = await apiClient.getAvailableJobs();
      setAvailableJobs(response.data);
    } catch (error) {
      console.error('Failed to fetch available jobs:', error);
    }
  };

  const fetchAppliedLiked = async () => {
    try {
      const response = await apiClient.getAppliedLikedJobs();
      setAppliedLiked(response.data);
    } catch (error) {
      console.error('Failed to fetch applied/liked jobs:', error);
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await apiClient.getCandidateMatches();
      setMatches(response.data);
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        apiClient.getNotifications(false, 30),
        apiClient.getUnreadNotificationCount(),
      ]);
      setNotifications(listRes.data || []);
      setUnreadNotifications(countRes.data?.unread_count || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleNotificationClick = async (notification: any) => {
    try {
      if (!notification.is_read) {
        await apiClient.markNotificationRead(notification.id);
      }
      const payload = notification.payload || {};
      if (payload.job_posting_id) {
        const targetInvite = invites.find((i: any) => i.job_posting?.id === payload.job_posting_id);
        if (targetInvite) {
          setActiveTab('invites');
          setViewInviteJob(targetInvite);
          setShowNotifications(false);
          fetchNotifications();
          return;
        }
      }
      if (notification.event_type?.includes('application')) {
        setActiveTab('applied');
      } else if (notification.event_type?.includes('asked_to_apply')) {
        setActiveTab('invites');
      } else {
        setActiveTab('matches');
      }
      setShowNotifications(false);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to open notification:', error);
    }
  };

  const handleSwipeLike = async (jobPostingId: number) => {
    if (!selectedProfileId) return;
    console.log('[SWIPE ACTION] Like - Job:', jobPostingId, 'Profile:', selectedProfileId);
    try {
      await apiClient.swipeLike(selectedProfileId, jobPostingId);
      console.log('[API SUCCESS] Swipe like recorded');
      fetchRecommendations();
      fetchMatches();
      fetchAppliedLiked();
    } catch (error) {
      console.error('[API ERROR] Failed to like job:', error);
      alert('Failed to like job');
    }
  };

  const handleSwipePass = async (jobPostingId: number) => {
    if (!selectedProfileId) return;
    console.log('[SWIPE ACTION] Pass - Job:', jobPostingId, 'Profile:', selectedProfileId);
    try {
      await apiClient.swipePass(selectedProfileId, jobPostingId);
      console.log('[API SUCCESS] Swipe pass recorded');
      fetchRecommendations();
    } catch (error) {
      console.error('[API ERROR] Failed to pass on job:', error);
      alert('Failed to pass on job');
    }
  };

  const handleApply = async (jobPostingId: number) => {
    if (!selectedProfileId) return;
    console.log('[APPLICATION] Applying to job:', jobPostingId, 'with profile:', selectedProfileId);
    setApplyingJobId(jobPostingId);
    try {
      await apiClient.applyToJob(jobPostingId, selectedProfileId);
      console.log('[API SUCCESS] Application submitted');
      alert('Application submitted successfully!');
      fetchAppliedLiked();
      fetchRecommendations();
      fetchAvailableJobs();
    } catch (error: any) {
      const msg = error?.response?.data?.detail;
      alert(typeof msg === 'string' ? msg : 'Failed to apply. Please try again.');
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleApplyFromMatch = async (jobPostingId: number, jobProfileId: number) => {
    console.log('[APPLICATION] Applying from match - Job:', jobPostingId, 'Profile:', jobProfileId);
    setApplyingJobId(jobPostingId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8001/applications/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ job_posting_id: jobPostingId, job_profile_id: jobProfileId })
      });
      const data = await response.json();
      if (!response.ok) {
        const detail = data?.detail;
        if (typeof detail === 'string') {
          alert(detail);
        } else if (Array.isArray(detail)) {
          alert(detail.map((d: any) => d.msg).join(', '));
        } else {
          alert('Failed to apply. Status: ' + response.status);
        }
        return;
      }
      console.log('[API SUCCESS] Application submitted from match', data);
      alert('Application submitted successfully!');
      fetchMatches();
      fetchAppliedLiked();
    } catch (error: any) {
      console.error('[APPLICATION ERROR]', error);
      alert('Network error. Please try again.');
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleApplyFromInvite = async (jobPostingId: number, jobProfileId: number) => {
    console.log('[APPLICATION] Applying from invite - Job:', jobPostingId, 'Profile:', jobProfileId);
    setApplyingJobId(jobPostingId);
    try {
      await apiClient.applyToJob(jobPostingId, jobProfileId);
      console.log('[API SUCCESS] Application submitted from invite');
      alert('Application submitted successfully!');
      fetchInvites();
      fetchAppliedLiked();
    } catch (error: any) {
      console.error('[APPLICATION ERROR]', error);
      const detail = error?.response?.data?.detail;
      if (typeof detail === 'string') {
        alert(detail);
      } else if (Array.isArray(detail)) {
        alert(detail.map((d: any) => d.msg).join(', '));
      } else {
        alert('Failed to apply. Please try again.');
      }
    } finally {
      setApplyingJobId(null);
    }
  };

  const renderWelcomeCard = () => {
    const userName = userProfile?.name || userProfile?.full_name || 'User';
    const userInitial = userName.charAt(0).toUpperCase();
    const newJobs = availableJobs.filter((job: any) => {
      const jobDate = new Date(job.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return jobDate >= weekAgo;
    }).length;

    return (
      <div className="welcome-card-modern candidate-welcome">
        <div className="welcome-content-enhanced">
          <div className="welcome-header">
            <div className="welcome-avatar">
              <div className="user-avatar">{userInitial}</div>
            </div>
            <div className="welcome-text">
              <h1 className="welcome-title-modern">Welcome back, {userName}</h1>
              <p className="welcome-subtitle-modern">Here's your job search activity overview</p>
            </div>
          </div>
          
          {/* Enhanced KPI Cards with Icons */}
          <div className="kpi-grid-modern">
            <div className="kpi-card-enhanced invites">
              <div className="kpi-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{invites.length}</div>
                <div className="kpi-label">Recruiter Invites</div>
              </div>
              {invites.length > 0 && (
                <div className="kpi-trend positive">+{invites.length} new</div>
              )}
            </div>
            
            <div className="kpi-card-enhanced matches">
              <div className="kpi-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{matches.length}</div>
                <div className="kpi-label">Mutual Matches</div>
              </div>
              {matches.length > 0 && (
                <div className="kpi-change">Ready to connect</div>
              )}
            </div>
            
            <div className="kpi-card-enhanced new-jobs">
              <div className="kpi-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{newJobs}</div>
                <div className="kpi-label">New Jobs</div>
              </div>
              <div className="kpi-change">This week</div>
            </div>
            
            <div className="kpi-card-enhanced applications">
              <div className="kpi-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
              </div>
              <div className="kpi-content">
                <div className="kpi-value">{appliedLiked.applied_jobs?.length || 0}</div>
                <div className="kpi-label">Applications</div>
              </div>
              <div className="kpi-change">Submitted</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRecommendations = () => {
    if (jobProfiles.length === 0) {
      return (
        <div className="empty-state-modern">
          <div className="empty-icon-professional">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM10 5h4v2h-4V5z"/>
            </svg>
          </div>
          <h3 className="empty-title">Create your job preferences</h3>
          <p className="empty-subtitle">Define your role, location, and compensation preferences to receive personalized job recommendations.</p>
          <div className="empty-actions">
            <button onClick={() => navigate('/candidate/job-preferences')} className="btn btn-primary btn-lg">
              Create Job Preferences
            </button>
            <button onClick={() => setActiveTab('available')} className="btn btn-secondary">
              Browse Jobs
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div>
          {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading recommendations...</p>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="empty-state-modern">
            <div className="empty-icon-professional">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </div>
            <h3 className="empty-title">No recommendations yet</h3>
            <p className="empty-subtitle">We're analyzing your profile to find the best matching opportunities. Check back soon.</p>
          </div>
        ) : (() => {
          const visibleRecs = recommendations.filter((r: any) => !r.already_swiped);
          const actionedRecs = recommendations.filter((r: any) => r.already_swiped);
          if (visibleRecs.length === 0) {
            return (
              <div className="empty-state-modern">
                <div className="empty-icon-professional">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <h3 className="empty-title">All Caught Up!</h3>
                <p className="empty-subtitle">
                  You have reviewed all {actionedRecs.length} job{actionedRecs.length !== 1 ? 's' : ''}.
                </p>
              </div>
            );
          }
          const safeIndex = Math.min(recCardIndex, visibleRecs.length - 1);
          const rec = visibleRecs[safeIndex];
          return (
            <div className="carousel-container">
              {/* Navigation Header */}
              <div className="carousel-nav-header">
                <button
                  className="carousel-arrow-btn"
                  onClick={() => setRecCardIndex(Math.max(safeIndex - 1, 0))}
                  disabled={safeIndex === 0}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <div className="carousel-counter">
                  <span className="carousel-current">{safeIndex + 1}</span>
                  <span className="carousel-separator">of</span>
                  <span className="carousel-total">{visibleRecs.length}</span>
                  <span className="carousel-hint">jobs</span>
                </div>
                <button
                  className="carousel-arrow-btn"
                  onClick={() => setRecCardIndex(Math.min(safeIndex + 1, visibleRecs.length - 1))}
                  disabled={safeIndex === visibleRecs.length - 1}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>

              {/* Single Card */}
              <div className="carousel-card-wrapper" key={`rec-${rec.job_posting.id}`}>
                <div className="job-card-modern carousel-card" onClick={() => setViewRecommendationJob(rec)} style={{ cursor: 'pointer' }}>
                  {/* Card Header */}
                  <div className="job-header-modern">
                    <div className="job-title-section">
                      <h3 className="job-title-modern">{rec.job_posting.job_title}</h3>
                      <div className="job-company">{rec.job_posting.company_name || 'Company'}</div>
                    </div>
                    <div className="match-badge-modern">
                      <div className="match-percentage">{rec.match_percentage}%</div>
                      <div className="match-label">Match</div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="job-content-modern">
                    <div className="job-info-section">
                      <div className="info-group">
                        <h4 className="info-group-title">Job Details</h4>
                        <div className="info-items">
                          <div className="info-item">
                            <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                              <circle cx="12" cy="10" r="3"/>
                            </svg>
                            <span className="info-value">{rec.job_posting.location}</span>
                          </div>
                          <div className="info-item">
                            <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                              <line x1="8" y1="21" x2="16" y2="21"/>
                              <line x1="12" y1="17" x2="12" y2="21"/>
                            </svg>
                            <span className="info-value">{rec.job_posting.worktype} • {rec.job_posting.employment_type}</span>
                          </div>
                          <div className="info-item">
                            <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                            </svg>
                            <span className="info-value">{rec.job_posting.seniority_level} level</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="job-compensation-section">
                      <div className="info-group">
                        <h4 className="info-group-title">Compensation</h4>
                        <div className="salary-range">
                          <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="12" y1="1" x2="12" y2="23"/>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                          </svg>
                          <div className="salary-info">
                            <span className="salary-amount">{rec.job_posting.salary_currency?.toUpperCase()} {rec.job_posting.salary_min} - {rec.job_posting.salary_max}</span>
                            <span className="salary-label">Annual salary</span>
                          </div>
                        </div>
                      </div>

                      {rec.is_match && (
                        <div className="match-status">
                          <div className="status-badge matched">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                            <span>Mutual Match!</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Job Description */}
                  <div className="job-description-modern">
                    <h4 className="description-title">About this role</h4>
                    <p className="description-text">{rec.job_posting.job_description}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="job-actions-modern">
                    <div className="action-buttons-grid">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSwipePass(rec.job_posting.id); setRecCardIndex(Math.min(safeIndex, visibleRecs.length - 2)); }}
                        className="action-btn secondary"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        Pass
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSwipeLike(rec.job_posting.id); }}
                        className="action-btn primary"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        Like
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleApply(rec.job_posting.id); }}
                        className="action-btn success"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                        Apply Now
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Keyboard hint */}
              <div className="carousel-keyboard-hint">
                Use <kbd>&#8592;</kbd> <kbd>&#8594;</kbd> arrow keys to browse
              </div>
            </div>
          );
        })()}
        </div>

        {/* Recommendation Job Detail Drawer */}
        {viewRecommendationJob && (
        <div className="cal-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewRecommendationJob(null); }}>
          <div className="cal-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cal-drawer-header">
              <div className="cal-drawer-header-info">
                <h2 className="cal-drawer-title">{viewRecommendationJob.job_posting.job_title}</h2>
                <div className="cal-drawer-subtitle">
                  {viewRecommendationJob.job_posting.company_name || 'Company'}
                  {viewRecommendationJob.job_posting.job_role ? ` · ${viewRecommendationJob.job_posting.job_role}` : ''}
                </div>
              </div>
              <button className="cal-drawer-close" onClick={() => setViewRecommendationJob(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="cal-drawer-body">
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                  Overview
                </div>
                <div className="cal-drawer-meta-grid">
                  {viewRecommendationJob.job_posting.location && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Location</span>
                      <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.location}</span>
                    </div>
                  )}
                  {viewRecommendationJob.job_posting.worktype && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Work Type</span>
                      <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.worktype}</span>
                    </div>
                  )}
                  {viewRecommendationJob.job_posting.employment_type && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Employment</span>
                      <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.employment_type}</span>
                    </div>
                  )}
                  {viewRecommendationJob.job_posting.seniority_level && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Seniority</span>
                      <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.seniority_level}</span>
                    </div>
                  )}
                  {(viewRecommendationJob.job_posting.salary_min || viewRecommendationJob.job_posting.salary_max) && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Compensation</span>
                      <span className="cal-drawer-field-value">
                        {viewRecommendationJob.job_posting.salary_currency?.toUpperCase()} {viewRecommendationJob.job_posting.salary_min}{viewRecommendationJob.job_posting.salary_max ? ` - ${viewRecommendationJob.job_posting.salary_max}` : '+'}
                      </span>
                    </div>
                  )}
                  {viewRecommendationJob.job_posting.product_vendor && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Vendor</span>
                      <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.product_vendor}</span>
                    </div>
                  )}
                  {viewRecommendationJob.job_posting.product_type && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Product</span>
                      <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.product_type}</span>
                    </div>
                  )}
                  {viewRecommendationJob.job_posting.start_date && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Start Date</span>
                      <span className="cal-drawer-field-value">{new Date(viewRecommendationJob.job_posting.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {viewRecommendationJob.job_posting.end_date && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Apply By</span>
                      <span className="cal-drawer-field-value">{new Date(viewRecommendationJob.job_posting.end_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="cal-drawer-field">
                    <span className="cal-drawer-field-label">Match Score</span>
                    <span className="cal-drawer-field-value" style={{ color: '#7B5EA7', fontWeight: 600 }}>{viewRecommendationJob.match_percentage}%</span>
                  </div>
                </div>
              </div>

              {viewRecommendationJob.job_posting.job_description && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                    Description
                  </div>
                  <div className="cal-drawer-description">{viewRecommendationJob.job_posting.job_description}</div>
                </div>
              )}

              {viewRecommendationJob.job_posting.posting_skills && viewRecommendationJob.job_posting.posting_skills.length > 0 && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Required Skills
                  </div>
                  <div className="cal-drawer-skills">
                    {viewRecommendationJob.job_posting.posting_skills.map((sk: any, i: number) => (
                      <span key={i} className="cal-drawer-skill">
                        {sk.skill_name}
                        {sk.rating && <span className="cal-drawer-skill-level">L{sk.rating}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(viewRecommendationJob.job_posting.education_qualifications || viewRecommendationJob.job_posting.certifications_required || viewRecommendationJob.job_posting.travel_requirements || viewRecommendationJob.job_posting.visa_info) && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                    Requirements
                  </div>
                  <div className="cal-drawer-meta-grid">
                    {viewRecommendationJob.job_posting.education_qualifications && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Education</span>
                        <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.education_qualifications}</span>
                      </div>
                    )}
                    {viewRecommendationJob.job_posting.certifications_required && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Certifications</span>
                        <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.certifications_required}</span>
                      </div>
                    )}
                    {viewRecommendationJob.job_posting.travel_requirements && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Travel</span>
                        <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.travel_requirements}</span>
                      </div>
                    )}
                    {viewRecommendationJob.job_posting.visa_info && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Visa</span>
                        <span className="cal-drawer-field-value">{viewRecommendationJob.job_posting.visa_info}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="cal-drawer-footer">
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <button
                  className="cal-btn cal-btn-secondary"
                  onClick={() => { handleSwipePass(viewRecommendationJob.job_posting.id); setViewRecommendationJob(null); }}
                  style={{ flex: 1 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  Pass
                </button>
                <button
                  className="cal-btn cal-btn-primary"
                  onClick={() => { handleSwipeLike(viewRecommendationJob.job_posting.id); setViewRecommendationJob(null); }}
                  style={{ flex: 1 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  Like
                </button>
                <button
                  className="cal-btn cal-btn-primary"
                  onClick={() => { handleApply(viewRecommendationJob.job_posting.id); setViewRecommendationJob(null); }}
                  style={{ flex: 1, background: 'linear-gradient(135deg, #27AE60, #2ECC71)' }}
                  disabled={!selectedProfileId}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
      </>
    );
  };

  const renderInvites = () => {
    if (invites.length === 0) {
      return (
        <div className="empty-state-modern">
          <div className="empty-icon-professional">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
          </div>
          <h3 className="empty-title">No invites yet</h3>
          <p className="empty-subtitle">Recruiters will send you invitations when they identify you as a strong match for their opportunities.</p>
        </div>
      );
    }

    const renderInviteDrawer = () => {
      if (!viewInviteJob) return null;
      const jp = viewInviteJob.job_posting;
      const company = viewInviteJob.company;
      const salary = jp.salary_min && jp.salary_max
        ? `${(jp.salary_currency || 'USD').toUpperCase()} ${jp.salary_min.toLocaleString()} – ${jp.salary_max.toLocaleString()}`
        : null;
      const isApplied = viewInviteJob.already_applied;
      const isApplying = applyingJobId === jp.id;

      return (
        <div className="cal-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewInviteJob(null); }}>
          <div className="cal-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="cal-drawer-header">
              <div className="cal-drawer-header-info">
                <h2 className="cal-drawer-title">{jp.job_title}</h2>
                <div className="cal-drawer-subtitle">{company.company_name}{jp.job_role ? ` · ${jp.job_role}` : ''}</div>
              </div>
              <button className="cal-drawer-close" onClick={() => setViewInviteJob(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Body */}
            <div className="cal-drawer-body">
              {/* Overview */}
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                  Overview
                </div>
                <div className="cal-drawer-meta-grid">
                  {jp.location && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Location</span><span className="cal-drawer-field-value">{jp.location}</span></div>}
                  {jp.worktype && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Work Type</span><span className="cal-drawer-field-value">{jp.worktype}</span></div>}
                  {jp.employment_type && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Employment</span><span className="cal-drawer-field-value">{jp.employment_type}</span></div>}
                  {jp.seniority_level && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Seniority</span><span className="cal-drawer-field-value">{jp.seniority_level}</span></div>}
                  {salary && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Compensation</span><span className="cal-drawer-field-value">{salary}{jp.pay_type ? ` / ${jp.pay_type}` : ''}</span></div>}
                  {jp.product_vendor && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Vendor</span><span className="cal-drawer-field-value">{jp.product_vendor}</span></div>}
                  {jp.product_type && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Product</span><span className="cal-drawer-field-value">{jp.product_type}</span></div>}
                  {jp.job_category && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Category</span><span className="cal-drawer-field-value">{jp.job_category}</span></div>}
                  {jp.start_date && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Start Date</span><span className="cal-drawer-field-value">{new Date(jp.start_date).toLocaleDateString()}</span></div>}
                  {jp.end_date && <div className="cal-drawer-field"><span className="cal-drawer-field-label">End Date</span><span className="cal-drawer-field-value">{new Date(jp.end_date).toLocaleDateString()}</span></div>}
                </div>
              </div>

              {/* Description */}
              {jp.job_description && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                    Description
                  </div>
                  <div className="cal-drawer-description">{jp.job_description}</div>
                </div>
              )}

              {/* Skills */}
              {jp.posting_skills && jp.posting_skills.length > 0 && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Required Skills
                  </div>
                  <div className="cal-drawer-skills">
                    {jp.posting_skills.map((sk: any, i: number) => (
                      <span key={i} className="cal-drawer-skill">
                        {sk.skill_name}
                        {sk.rating && <span className="cal-drawer-skill-level">L{sk.rating}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {(jp.education_qualifications || jp.certifications_required || jp.travel_requirements || jp.visa_info) && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                    Requirements
                  </div>
                  <div className="cal-drawer-meta-grid">
                    {jp.education_qualifications && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Education</span><span className="cal-drawer-field-value">{jp.education_qualifications}</span></div>}
                    {jp.certifications_required && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Certifications</span><span className="cal-drawer-field-value">{jp.certifications_required}</span></div>}
                    {jp.travel_requirements && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Travel</span><span className="cal-drawer-field-value">{jp.travel_requirements}</span></div>}
                    {jp.visa_info && <div className="cal-drawer-field"><span className="cal-drawer-field-label">Visa</span><span className="cal-drawer-field-value">{jp.visa_info}</span></div>}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="cal-drawer-footer">
              {!isApplied ? (
                <button
                  className={`cal-btn cal-btn-primary${isApplying ? ' loading' : ''}`}
                  onClick={() => handleApplyFromInvite(jp.id, viewInviteJob.job_profile_id)}
                  disabled={isApplying}
                >
                  {isApplying ? 'Applying…' : 'Apply Now'}
                </button>
              ) : (
                <button className="cal-btn cal-btn-primary" disabled>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M20 6L9 17l-5-5"/></svg>
                  Already Applied
                </button>
              )}
              <button className="cal-btn cal-btn-secondary" onClick={() => setViewInviteJob(null)}>Close</button>
            </div>
          </div>
        </div>
      );
    };

    return (
      <>
        <div className="jobs-grid-modern">
          {invites.map((invite: any) => (
            <div key={invite.invite_id} className="job-card-modern invite-card">
              {/* Special Invite Header */}
              <div className="job-header-modern invite-header">
                <div className="invite-badge-header">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  <span>Recruiter Invitation</span>
                </div>
              </div>

              <div className="job-header-modern">
                <div className="job-title-section">
                  <h3 className="job-title-modern">{invite.job_posting.job_title}</h3>
                  <div className="job-company">{invite.company.company_name}</div>
                </div>
                <div className="invite-date">
                  <small>Invited {new Date(invite.created_at).toLocaleDateString()}</small>
                </div>
              </div>

              <div className="job-content-modern">
                <div className="job-info-section">
                  <div className="info-group">
                    <h4 className="info-group-title">Job Details</h4>
                    <div className="info-items">
                      <div className="info-item">
                        <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                          <circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span className="info-value">{invite.job_posting.location}</span>
                      </div>
                      <div className="info-item">
                        <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                          <line x1="8" y1="21" x2="16" y2="21"/>
                          <line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                        <span className="info-value">{invite.job_posting.worktype}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="job-compensation-section">
                  <div className="info-group">
                    <h4 className="info-group-title">Compensation</h4>
                    <div className="salary-range">
                      <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23"/>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                      <div className="salary-info">
                        <span className="salary-amount">{(invite.job_posting.salary_currency || 'USD').toUpperCase()} {invite.job_posting.salary_min} - {invite.job_posting.salary_max}</span>
                        <span className="salary-label">Annual salary</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="job-actions-modern">
                <div className="action-buttons-grid">
                  {invite.already_applied ? (
                    <button className="action-btn success" disabled style={{ opacity: 0.7, cursor: 'default' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      Applied
                    </button>
                  ) : (
                    <button
                      onClick={() => handleApplyFromInvite(invite.job_posting.id, invite.job_profile_id)}
                      className="action-btn success"
                      disabled={applyingJobId === invite.job_posting.id}
                    >
                      {applyingJobId === invite.job_posting.id ? (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin-icon">
                            <circle cx="12" cy="12" r="10"/>
                          </svg>
                          Applying...
                        </>
                      ) : (
                        <>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>
                          </svg>
                          Apply Now
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setViewInviteJob(invite)}
                    className="action-btn primary"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    View Job Posting
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {renderInviteDrawer()}
      </>
    );
  };

  const renderAvailableJobs = () => {
    if (availableJobs.length === 0) {
      return (
        <div className="empty-state-modern">
          <div className="empty-icon-professional">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM10 5h4v2h-4V5z"/>
            </svg>
          </div>
          <h3 className="empty-title">No jobs available</h3>
          <p className="empty-subtitle">New opportunities are posted regularly. Check back soon or create job preferences for personalized recommendations.</p>
        </div>
      );
    }

    return (
      <>
      <div className="jobs-grid-modern">
        {availableJobs.map((job: any) => (
          <div key={job.id} className="job-card-modern">
            <div className="job-header-modern">
              <div className="job-title-section">
                <h3 className="job-title-modern">{job.job_title}</h3>
                <div className="job-company">{job.company_name || 'Company'}</div>
              </div>
              {job.end_date && (
                <div className="match-date">
                  <small>Apply by {new Date(job.end_date).toLocaleDateString()}</small>
                </div>
              )}
            </div>

            <div className="job-content-modern">
              <div className="job-info-section">
                <div className="info-group">
                  <h4 className="info-group-title">Job Details</h4>
                  <div className="info-items">
                    <div className="info-item">
                      <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      <span className="info-value">{job.location}</span>
                    </div>
                    <div className="info-item">
                      <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                      <span className="info-value">{job.worktype} • {job.employment_type}</span>
                    </div>
                    <div className="info-item">
                      <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                      </svg>
                      <span className="info-value">{job.seniority_level} level</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="job-compensation-section">
                <div className="info-group">
                  <h4 className="info-group-title">Compensation</h4>
                  <div className="salary-range">
                    <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    <div className="salary-info">
                      <span className="salary-amount">{job.salary_currency.toUpperCase()} {job.salary_min} - {job.salary_max}</span>
                      <span className="salary-label">Annual salary</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="job-description-modern">
              <h4 className="description-title">About this role</h4>
              <p className="description-text">{job.job_description}</p>
            </div>

            <div className="job-actions-modern">
              <div className="action-buttons-grid">
                <button
                  onClick={() => setViewAvailableJob(job)}
                  className="action-btn primary"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  View Job Posting
                </button>
                <button
                  onClick={() => handleApply(job.id)}
                  className="action-btn success"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Apply Now
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Available Job Detail Drawer */}
      {viewAvailableJob && (
        <div className="cal-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewAvailableJob(null); }}>
          <div className="cal-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cal-drawer-header">
              <div className="cal-drawer-header-info">
                <h2 className="cal-drawer-title">{viewAvailableJob.job_title}</h2>
                <div className="cal-drawer-subtitle">
                  {viewAvailableJob.company_name || 'Company'}
                  {viewAvailableJob.job_role ? ` · ${viewAvailableJob.job_role}` : ''}
                </div>
              </div>
              <button className="cal-drawer-close" onClick={() => setViewAvailableJob(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="cal-drawer-body">
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                  Overview
                </div>
                <div className="cal-drawer-meta-grid">
                  {viewAvailableJob.location && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Location</span>
                      <span className="cal-drawer-field-value">{viewAvailableJob.location}</span>
                    </div>
                  )}
                  {viewAvailableJob.worktype && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Work Type</span>
                      <span className="cal-drawer-field-value">{viewAvailableJob.worktype}</span>
                    </div>
                  )}
                  {viewAvailableJob.employment_type && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Employment</span>
                      <span className="cal-drawer-field-value">{viewAvailableJob.employment_type}</span>
                    </div>
                  )}
                  {viewAvailableJob.seniority_level && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Seniority</span>
                      <span className="cal-drawer-field-value">{viewAvailableJob.seniority_level}</span>
                    </div>
                  )}
                  {(viewAvailableJob.salary_min || viewAvailableJob.salary_max) && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Compensation</span>
                      <span className="cal-drawer-field-value">
                        {viewAvailableJob.salary_currency?.toUpperCase()} {viewAvailableJob.salary_min}{viewAvailableJob.salary_max ? ` - ${viewAvailableJob.salary_max}` : '+'}
                      </span>
                    </div>
                  )}
                  {viewAvailableJob.product_vendor && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Vendor</span>
                      <span className="cal-drawer-field-value">{viewAvailableJob.product_vendor}</span>
                    </div>
                  )}
                  {viewAvailableJob.product_type && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Product</span>
                      <span className="cal-drawer-field-value">{viewAvailableJob.product_type}</span>
                    </div>
                  )}
                  {viewAvailableJob.start_date && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Start Date</span>
                      <span className="cal-drawer-field-value">{new Date(viewAvailableJob.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {viewAvailableJob.job_description && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                    Description
                  </div>
                  <div className="cal-drawer-description">{viewAvailableJob.job_description}</div>
                </div>
              )}

              {viewAvailableJob.posting_skills && viewAvailableJob.posting_skills.length > 0 && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Required Skills
                  </div>
                  <div className="cal-drawer-skills">
                    {viewAvailableJob.posting_skills.map((sk: any, i: number) => (
                      <span key={i} className="cal-drawer-skill">
                        {sk.skill_name}
                        {sk.rating && <span className="cal-drawer-skill-level">L{sk.rating}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(viewAvailableJob.education_qualifications || viewAvailableJob.certifications_required || viewAvailableJob.travel_requirements || viewAvailableJob.visa_info) && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                    Requirements
                  </div>
                  <div className="cal-drawer-meta-grid">
                    {viewAvailableJob.education_qualifications && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Education</span>
                        <span className="cal-drawer-field-value">{viewAvailableJob.education_qualifications}</span>
                      </div>
                    )}
                    {viewAvailableJob.certifications_required && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Certifications</span>
                        <span className="cal-drawer-field-value">{viewAvailableJob.certifications_required}</span>
                      </div>
                    )}
                    {viewAvailableJob.travel_requirements && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Travel</span>
                        <span className="cal-drawer-field-value">{viewAvailableJob.travel_requirements}</span>
                      </div>
                    )}
                    {viewAvailableJob.visa_info && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Visa</span>
                        <span className="cal-drawer-field-value">{viewAvailableJob.visa_info}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="cal-drawer-footer">
              <button
                className="cal-btn cal-btn-primary"
                onClick={() => { handleApply(viewAvailableJob.id); setViewAvailableJob(null); }}
                disabled={!selectedProfileId}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                Apply Now
              </button>
              <button className="cal-btn cal-btn-secondary" onClick={() => setViewAvailableJob(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
    );
  };

  const renderAppliedLiked = () => {
    const { applied_jobs, liked_jobs } = appliedLiked;
    const items = jobListTab === 'applied' ? applied_jobs : liked_jobs;

    const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
      if (!min && !max) return null;
      const c = currency || 'USD';
      if (min && max) return `${c} ${min.toLocaleString()} – ${max.toLocaleString()}`;
      if (min) return `${c} ${min.toLocaleString()}+`;
      return `${c} ${max!.toLocaleString()}`;
    };

    const getStatusClass = (status: string) => {
      const s = status?.toLowerCase() || '';
      if (s.includes('review')) return 'reviewed';
      if (s.includes('interview')) return 'interview';
      if (s.includes('offer')) return 'offered';
      if (s.includes('reject') || s.includes('denied')) return 'rejected';
      return 'applied';
    };

    const renderCard = (job: any, type: 'applied' | 'liked') => {
      const key = type === 'applied' ? `app-${job.application_id}` : `liked-${job.job_id}`;
      const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
      const dateStr = type === 'applied'
        ? `Applied ${new Date(job.applied_at).toLocaleDateString()}`
        : `Liked ${new Date(job.liked_at).toLocaleDateString()}`;
      const snippet = job.job_description
        ? job.job_description.slice(0, 160) + (job.job_description.length > 160 ? '…' : '')
        : null;
      const isApplied = type === 'applied' || job.already_applied;
      const isApplying = applyingJobId === job.job_id;

      return (
        <div key={key} className="cal-card">
          <div className="cal-card-body">
            <div className="cal-card-header">
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 className="cal-card-title">{job.job_title}</h4>
                <div className="cal-card-company">
                  {job.company_name}
                  {job.job_role && <><span>·</span>{job.job_role}</>}
                </div>
              </div>
              {type === 'applied' && job.status && (
                <span className={`cal-status-chip ${getStatusClass(job.status)}`}>
                  {job.status}
                </span>
              )}
              {type === 'liked' && (
                <span className="cal-status-chip liked">
                  <svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  Liked
                </span>
              )}
            </div>

            <div className="cal-meta-row">
              {job.location && (
                <span className="cal-meta-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {job.location}
                </span>
              )}
              {job.worktype && (
                <span className="cal-meta-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                  {job.worktype}
                </span>
              )}
              {job.employment_type && (
                <span className="cal-meta-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  {job.employment_type}
                </span>
              )}
              {job.seniority_level && (
                <span className="cal-meta-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
                  {job.seniority_level}
                </span>
              )}
              {salary && (
                <span className="cal-meta-chip">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                  {salary}
                </span>
              )}
            </div>

            {snippet && <p className="cal-snippet">{snippet}</p>}
            <div className="cal-date">{dateStr}</div>
          </div>

          <div className="cal-card-actions">
            <button className="cal-btn cal-btn-secondary" onClick={() => setDrawerJob({ ...job, _type: type })}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              View Details
            </button>
            {!isApplied ? (
              <button
                className={`cal-btn cal-btn-primary${isApplying ? ' loading' : ''}`}
                onClick={() => handleApply(job.job_id)}
                disabled={!selectedProfileId || isApplying}
              >
                {isApplying ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                    Applying…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                    Apply Now
                  </>
                )}
              </button>
            ) : (
              <button className="cal-btn cal-btn-primary" disabled>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                Applied
              </button>
            )}
          </div>
        </div>
      );
    };

    const renderDrawer = () => {
      if (!drawerJob) return null;
      const job = drawerJob;
      const type = job._type as 'applied' | 'liked';
      const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
      const isApplied = type === 'applied' || job.already_applied;
      const isApplying = applyingJobId === job.job_id;

      return (
        <div className="cal-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDrawerJob(null); }}>
          <div className="cal-drawer" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="cal-drawer-header">
              <div className="cal-drawer-header-info">
                <h2 className="cal-drawer-title">{job.job_title}</h2>
                <div className="cal-drawer-subtitle">
                  {job.company_name}{job.job_role ? ` · ${job.job_role}` : ''}
                </div>
              </div>
              <button className="cal-drawer-close" onClick={() => setDrawerJob(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Body */}
            <div className="cal-drawer-body">
              {/* Overview grid */}
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                  Overview
                </div>
                <div className="cal-drawer-meta-grid">
                  {job.location && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Location</span>
                      <span className="cal-drawer-field-value">{job.location}</span>
                    </div>
                  )}
                  {job.worktype && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Work Type</span>
                      <span className="cal-drawer-field-value">{job.worktype}</span>
                    </div>
                  )}
                  {job.employment_type && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Employment</span>
                      <span className="cal-drawer-field-value">{job.employment_type}</span>
                    </div>
                  )}
                  {job.seniority_level && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Seniority</span>
                      <span className="cal-drawer-field-value">{job.seniority_level}</span>
                    </div>
                  )}
                  {salary && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Compensation</span>
                      <span className="cal-drawer-field-value">{salary}{job.pay_type ? ` / ${job.pay_type}` : ''}</span>
                    </div>
                  )}
                  {job.product_vendor && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Vendor</span>
                      <span className="cal-drawer-field-value">{job.product_vendor}</span>
                    </div>
                  )}
                  {job.product_type && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Product</span>
                      <span className="cal-drawer-field-value">{job.product_type}</span>
                    </div>
                  )}
                  {job.start_date && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Start Date</span>
                      <span className="cal-drawer-field-value">{new Date(job.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {job.job_description && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                    Description
                  </div>
                  <div className="cal-drawer-description">{job.job_description}</div>
                </div>
              )}

              {/* Skills */}
              {job.posting_skills && job.posting_skills.length > 0 && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Required Skills
                  </div>
                  <div className="cal-drawer-skills">
                    {job.posting_skills.map((sk: any, i: number) => (
                      <span key={i} className="cal-drawer-skill">
                        {sk.skill_name}
                        {sk.rating && <span className="cal-drawer-skill-level">L{sk.rating}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {(job.education_qualifications || job.certifications_required || job.travel_requirements || job.visa_info) && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                    Requirements
                  </div>
                  <div className="cal-drawer-meta-grid">
                    {job.education_qualifications && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Education</span>
                        <span className="cal-drawer-field-value">{job.education_qualifications}</span>
                      </div>
                    )}
                    {job.certifications_required && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Certifications</span>
                        <span className="cal-drawer-field-value">{job.certifications_required}</span>
                      </div>
                    )}
                    {job.travel_requirements && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Travel</span>
                        <span className="cal-drawer-field-value">{job.travel_requirements}</span>
                      </div>
                    )}
                    {job.visa_info && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Visa</span>
                        <span className="cal-drawer-field-value">{job.visa_info}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="cal-drawer-footer">
              {!isApplied ? (
                <button
                  className={`cal-btn cal-btn-primary${isApplying ? ' loading' : ''}`}
                  onClick={() => handleApply(job.job_id)}
                  disabled={!selectedProfileId || isApplying}
                >
                  {isApplying ? 'Applying…' : 'Apply Now'}
                </button>
              ) : (
                <button className="cal-btn cal-btn-primary" disabled>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}><path d="M20 6L9 17l-5-5"/></svg>
                  Already Applied
                </button>
              )}
              <button className="cal-btn cal-btn-secondary" onClick={() => setDrawerJob(null)}>Close</button>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="cal-page">
        {/* Tab filter */}
        <div className="cal-tabs">
          <button className={`cal-tab${jobListTab === 'liked' ? ' active' : ''}`} onClick={() => setJobListTab('liked')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={jobListTab === 'liked' ? '#db2777' : 'none'} stroke={jobListTab === 'liked' ? '#db2777' : 'currentColor'} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            Liked
            <span className="cal-tab-count">{liked_jobs.length}</span>
          </button>
          <button className={`cal-tab${jobListTab === 'applied' ? ' active' : ''}`} onClick={() => setJobListTab('applied')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            Applied
            <span className="cal-tab-count">{applied_jobs.length}</span>
          </button>
        </div>

        {/* List or Empty */}
        {items.length === 0 ? (
          <div className="cal-empty">
            <div className="cal-empty-icon">
              {jobListTab === 'liked' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              )}
            </div>
            <h3 className="cal-empty-title">
              {jobListTab === 'liked' ? 'No liked jobs yet' : 'No applications yet'}
            </h3>
            <p className="cal-empty-subtitle">
              {jobListTab === 'liked'
                ? 'Swipe right on recommended jobs to save them here for quick reference.'
                : 'Start applying to positions from your liked jobs or browse new opportunities.'}
            </p>
            <button className="cal-empty-link" onClick={() => setActiveTab('recommendations')}>
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="cal-list">
            {items.map((job: any) => renderCard(job, jobListTab))}
          </div>
        )}

        {/* Side Drawer */}
        {renderDrawer()}
      </div>
    );
  };

  const renderMatches = () => {
    if (matches.length === 0) {
      return (
        <div className="empty-state-modern">
          <div className="empty-icon-professional">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <h3 className="empty-title">No matches yet</h3>
          <p className="empty-subtitle">Continue reviewing opportunities. When both you and a recruiter express mutual interest, matches will appear here.</p>
          <button onClick={() => setActiveTab('recommendations')} className="btn btn-primary">
            View Recommendations
          </button>
        </div>
      );
    }

    return (
      <>
      <div className="jobs-grid-modern">
        {matches.map((match: any) => (
          <div key={match.match_id} className="job-card-modern match-card">
            {/* Special Match Header */}
            <div className="job-header-modern match-header">
              <div className="match-badge-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                <span>Mutual Match - {match.match_percentage}%</span>
              </div>
            </div>

            <div className="job-header-modern">
              <div className="job-title-section">
                <h3 className="job-title-modern">{match.job_posting.job_title}</h3>
                <div className="job-company">{match.company.company_name}</div>
              </div>
              <div className="match-date">
                <small>Matched {new Date(match.matched_at).toLocaleDateString()}</small>
              </div>
            </div>

            <div className="job-content-modern">
              <div className="job-info-section">
                <div className="info-group">
                  <h4 className="info-group-title">Position Details</h4>
                  <div className="info-items">
                    <div className="info-item">
                      <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                      <span className="info-value">{match.job_posting.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="job-compensation-section">
                <div className="info-group">
                  <h4 className="info-group-title">Contact Information</h4>
                  <div className="contact-info">
                    <div className="info-item">
                      <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      <span className="info-value">{match.company.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="job-actions-modern">
              <div className="action-buttons-grid">
                <button
                  onClick={() => setViewMatchJob(match)}
                  className="action-btn light"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <path d="M14 2v6h6"/>
                    <path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>
                  </svg>
                  View Job Posting
                </button>
                {match.already_applied ? (
                  <button className="action-btn success" disabled style={{ opacity: 0.7, cursor: 'default' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    Applied
                  </button>
                ) : (
                  <button
                    onClick={() => handleApplyFromMatch(match.job_posting.id, match.job_profile_id)}
                    className="action-btn success"
                    disabled={applyingJobId === match.job_posting.id}
                  >
                    {applyingJobId === match.job_posting.id ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin-icon">
                          <circle cx="12" cy="12" r="10"/>
                        </svg>
                        Applying...
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                          <polyline points="22,6 12,13 2,6"/>
                        </svg>
                        Apply Now
                      </>
                    )}
                  </button>
                )}
                <a
                  href={`mailto:${match.company.email}`}
                  className="action-btn primary"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Contact Recruiter
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Match Job Detail Drawer */}
      {viewMatchJob && (
        <div className="cal-drawer-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewMatchJob(null); }}>
          <div className="cal-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cal-drawer-header">
              <div className="cal-drawer-header-info">
                <h2 className="cal-drawer-title">{viewMatchJob.job_posting.job_title}</h2>
                <div className="cal-drawer-subtitle">
                  {viewMatchJob.company.company_name}
                  {viewMatchJob.job_posting.job_role ? ` · ${viewMatchJob.job_posting.job_role}` : ''}
                </div>
              </div>
              <button className="cal-drawer-close" onClick={() => setViewMatchJob(null)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="cal-drawer-body">
              <div className="cal-drawer-section">
                <div className="cal-drawer-section-title">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>
                  Overview
                </div>
                <div className="cal-drawer-meta-grid">
                  {viewMatchJob.job_posting.location && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Location</span>
                      <span className="cal-drawer-field-value">{viewMatchJob.job_posting.location}</span>
                    </div>
                  )}
                  {viewMatchJob.job_posting.worktype && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Work Type</span>
                      <span className="cal-drawer-field-value">{viewMatchJob.job_posting.worktype}</span>
                    </div>
                  )}
                  {viewMatchJob.job_posting.employment_type && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Employment</span>
                      <span className="cal-drawer-field-value">{viewMatchJob.job_posting.employment_type}</span>
                    </div>
                  )}
                  {viewMatchJob.job_posting.seniority_level && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Seniority</span>
                      <span className="cal-drawer-field-value">{viewMatchJob.job_posting.seniority_level}</span>
                    </div>
                  )}
                  {(viewMatchJob.job_posting.salary_min || viewMatchJob.job_posting.salary_max) && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Compensation</span>
                      <span className="cal-drawer-field-value">
                        {viewMatchJob.job_posting.salary_currency?.toUpperCase()} {viewMatchJob.job_posting.salary_min}{viewMatchJob.job_posting.salary_max ? ` - ${viewMatchJob.job_posting.salary_max}` : '+'}
                      </span>
                    </div>
                  )}
                  {viewMatchJob.job_posting.product_vendor && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Vendor</span>
                      <span className="cal-drawer-field-value">{viewMatchJob.job_posting.product_vendor}</span>
                    </div>
                  )}
                  {viewMatchJob.job_posting.product_type && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Product</span>
                      <span className="cal-drawer-field-value">{viewMatchJob.job_posting.product_type}</span>
                    </div>
                  )}
                  {viewMatchJob.job_posting.start_date && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Start Date</span>
                      <span className="cal-drawer-field-value">{new Date(viewMatchJob.job_posting.start_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {viewMatchJob.job_posting.end_date && (
                    <div className="cal-drawer-field">
                      <span className="cal-drawer-field-label">Apply By</span>
                      <span className="cal-drawer-field-value">{new Date(viewMatchJob.job_posting.end_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {viewMatchJob.job_posting.job_description && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                    Description
                  </div>
                  <div className="cal-drawer-description">{viewMatchJob.job_posting.job_description}</div>
                </div>
              )}

              {viewMatchJob.job_posting.posting_skills && viewMatchJob.job_posting.posting_skills.length > 0 && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    Required Skills
                  </div>
                  <div className="cal-drawer-skills">
                    {viewMatchJob.job_posting.posting_skills.map((sk: any, i: number) => (
                      <span key={i} className="cal-drawer-skill">
                        {sk.skill_name}
                        {sk.rating && <span className="cal-drawer-skill-level">L{sk.rating}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(viewMatchJob.job_posting.education_qualifications || viewMatchJob.job_posting.certifications_required || viewMatchJob.job_posting.travel_requirements || viewMatchJob.job_posting.visa_info) && (
                <div className="cal-drawer-section">
                  <div className="cal-drawer-section-title">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>
                    Requirements
                  </div>
                  <div className="cal-drawer-meta-grid">
                    {viewMatchJob.job_posting.education_qualifications && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Education</span>
                        <span className="cal-drawer-field-value">{viewMatchJob.job_posting.education_qualifications}</span>
                      </div>
                    )}
                    {viewMatchJob.job_posting.certifications_required && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Certifications</span>
                        <span className="cal-drawer-field-value">{viewMatchJob.job_posting.certifications_required}</span>
                      </div>
                    )}
                    {viewMatchJob.job_posting.travel_requirements && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Travel</span>
                        <span className="cal-drawer-field-value">{viewMatchJob.job_posting.travel_requirements}</span>
                      </div>
                    )}
                    {viewMatchJob.job_posting.visa_info && (
                      <div className="cal-drawer-field">
                        <span className="cal-drawer-field-label">Visa</span>
                        <span className="cal-drawer-field-value">{viewMatchJob.job_posting.visa_info}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="cal-drawer-footer">
              {!viewMatchJob.already_applied ? (
                <button
                  className="cal-btn cal-btn-primary"
                  onClick={() => { handleApplyFromMatch(viewMatchJob.job_posting.id, viewMatchJob.job_profile_id); setViewMatchJob(null); }}
                  disabled={applyingJobId === viewMatchJob.job_posting.id}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                  Apply Now
                </button>
              ) : (
                <button className="cal-btn cal-btn-primary" disabled style={{ opacity: 0.7, cursor: 'default' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                  Already Applied
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
    );
  };

  return (
    <div className="modern-dashboard candidate-dashboard">
      {/* Top Navigation Bar */}
      <nav className="top-navbar">
        <div className="navbar-left">
          <div className="app-logo">
            <span className="logo-text">TalentGraph</span>
          </div>
        </div>
        <div className="navbar-center">
          <h1 className="page-title">Candidate Dashboard</h1>
        </div>
        <div className="navbar-right">
          <button className="icon-btn notification-btn" title="Notifications" onClick={() => setShowNotifications(prev => !prev)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {unreadNotifications > 0 && <span className="badge-dot"></span>}
          </button>
          <div className="profile-dropdown">
            <button 
              className="profile-avatar-btn" 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
            >
              <div className="avatar">{(userProfile?.name || userProfile?.full_name)?.charAt(0) || 'U'}</div>
              <span className="profile-name">{userProfile?.name || userProfile?.full_name || 'User'}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="chevron">
                <path d="M2 4l4 4 4-4"/>
              </svg>
            </button>
            {showProfileMenu && (
              <div className="profile-menu">
                <button onClick={() => { navigate('/candidate/profile'); setShowProfileMenu(false); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
                  </svg>
                  My Profile
                </button>
                <button onClick={() => { navigate('/candidate/job-preferences'); setShowProfileMenu(false); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"/>
                  </svg>
                  Job Preferences
                </button>
                <div className="menu-divider"></div>
                <button onClick={() => { localStorage.clear(); navigate('/'); }} className="logout-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9"/>
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {showNotifications && (
        <div style={{ position: 'fixed', top: 70, right: 20, width: 360, maxHeight: '70vh', overflowY: 'auto', background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.15)', zIndex: 1200 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong>Notifications</strong>
            <button onClick={async () => { await apiClient.markAllNotificationsRead(); fetchNotifications(); }} style={{ border: 'none', background: 'transparent', color: '#4f46e5', cursor: 'pointer' }}>Mark all read</button>
          </div>
          {(notifications || []).length === 0 ? (
            <div style={{ padding: 16, color: '#6b7280' }}>No notifications yet.</div>
          ) : (
            notifications.map((n: any) => (
              <button key={n.id} onClick={() => handleNotificationClick(n)} style={{ width: '100%', textAlign: 'left', border: 'none', background: n.is_read ? 'white' : '#f5f3ff', padding: '12px 14px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
                <div style={{ fontSize: 12, color: '#4b5563', marginTop: 4 }}>{n.message}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>{new Date(n.created_at).toLocaleString()}</div>
              </button>
            ))
          )}
        </div>
      )}

      <div className="dashboard-layout">
        {/* Left Sidebar Navigation */}
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <button
              className={`nav-item ${activeTab === 'recommendations' ? 'active' : ''}`}
              onClick={() => setActiveTab('recommendations')}
            >
              <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              <span className="nav-label">Recommendations</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'invites' ? 'active' : ''}`}
              onClick={() => setActiveTab('invites')}
            >
              <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              <span className="nav-label">Recruiter Invites</span>
              {invites.length > 0 && <span className="nav-badge">{invites.length}</span>}
            </button>
            <button
              className={`nav-item ${activeTab === 'available' ? 'active' : ''}`}
              onClick={() => setActiveTab('available')}
            >
              <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 7h-4V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM10 5h4v2h-4V5z"/>
              </svg>
              <span className="nav-label">Available Jobs</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'applied' ? 'active' : ''}`}
              onClick={() => setActiveTab('applied')}
            >
              <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
              </svg>
              <span className="nav-label">Applied/Liked</span>
            </button>
            <button
              className={`nav-item ${activeTab === 'matches' ? 'active' : ''}`}
              onClick={() => setActiveTab('matches')}
            >
              <svg className="nav-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
              </svg>
              <span className="nav-label">Matches</span>
              {matches.length > 0 && <span className="nav-badge">{matches.length}</span>}
            </button>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          {renderWelcomeCard()}
          
          <div className="content-panel">
            {activeTab === 'recommendations' && renderRecommendations()}
            {activeTab === 'invites' && renderInvites()}
            {activeTab === 'available' && renderAvailableJobs()}
            {activeTab === 'applied' && renderAppliedLiked()}
            {activeTab === 'matches' && renderMatches()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CandidateDashboard;

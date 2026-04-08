import React, { useState, useEffect } from 'react';
import Icon from '../../ui/Icon';

// Local utility
const cx = (...xs) => xs.filter(Boolean).join(" ");

const AdminConsole = ({
  onBack,
  currentUserEmail,
  // Dependencies passed as props
  SUPABASE_API,
  logActivity,
  getSupabase,
  Logger,
  APP_CONFIG,
  TEAMS,
  SEED_PROFILES,
  isAdmin,
  LoadingSpinner,
}) => {
  const [activeTab, setActiveTab] = useState('invites');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invites, setInvites] = useState([]);
  const [sending, setSending] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [newProfile, setNewProfile] = useState({ email: '', name: '', team: '', role: 'member' });

  const [claimedProfiles, setClaimedProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  const [teams, setTeams] = useState([]);
  const [newTeamName, setNewTeamName] = useState('');

  const [activityLog, setActivityLog] = useState([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityFilter, setActivityFilter] = useState('all');

  const [, forceUpdate] = useState(0);

  // Load profiles and teams on mount
  useEffect(() => {
    async function loadData() {
      setLoadingProfiles(true);
      const [profiles, dbTeams] = await Promise.all([
        SUPABASE_API.fetchUserProfiles(),
        SUPABASE_API.fetchTeams(),
      ]);

      // Bootstrap: ensure hardcoded admin has admin role and claimed_at in DB
      const sb = getSupabase();
      if (sb && currentUserEmail) {
        const myProfile = profiles.find(p => p.email.toLowerCase() === currentUserEmail.toLowerCase());
        if (myProfile) {
          const updates = {};
          if (isAdmin(currentUserEmail) && myProfile.role !== 'admin') updates.role = 'admin';
          if (!myProfile.claimed_at) updates.claimed_at = new Date().toISOString();
          if (Object.keys(updates).length > 0) {
            await sb.from('user_profiles').update(updates)
              .eq('email', currentUserEmail.toLowerCase());
            Object.assign(myProfile, updates);
          }
        }
      }

      setClaimedProfiles(profiles);
      setTeams(dbTeams.length > 0 ? dbTeams : TEAMS.map(name => ({ id: name, name })));
      setLoadingProfiles(false);
    }
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab !== 'activity') return;
    async function loadActivityLog() {
      setLoadingActivity(true);
      const activities = await SUPABASE_API.fetchRecentActivity(100);
      setActivityLog(activities);
      setLoadingActivity(false);
    }
    loadActivityLog();
  }, [activeTab]);

  const teamNames = teams.map(t => t.name || t);

  const claimedEmails = claimedProfiles.map(p => p.email.toLowerCase());
  const pendingProfiles = SEED_PROFILES.filter(p => !claimedEmails.includes(p.email.toLowerCase()));

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSending(true);
    setMessage({ type: '', text: '' });

    try {
      const email = inviteEmail.toLowerCase().trim();
      const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) throw new Error('You must be logged in to send invites');

      const response = await fetch(`${APP_CONFIG.SUPABASE_URL}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email, name, team: teamNames[0] || '', role: 'member' })
      });

      const result = await response.json();
      if (!response.ok) {
        if (result.alreadyExists) throw new Error(`This user already has an account.`);
        throw new Error(result.error || 'Failed to send invite');
      }

      setInvites(prev => [...prev, { email, sentAt: new Date().toISOString(), status: 'sent' }]);
      await logActivity('invite_sent', 'user_profile', email, name, { invited_by: currentUserEmail });
      setMessage({ type: 'success', text: `Invitation email sent to ${email}!` });
      setInviteEmail('');
      forceUpdate(n => n + 1);

      const profiles = await SUPABASE_API.fetchUserProfiles();
      setClaimedProfiles(profiles);
    } catch (error) {
      Logger.error(error, 'Invite error');
      setMessage({ type: 'error', text: error.message || 'Failed to send invite' });
    } finally {
      setSending(false);
    }
  };

  const handleSendProfileInvite = async (email, name, team, role) => {
    if (!email) return;
    setSendingEmail(email);
    setMessage({ type: '', text: '' });

    try {
      const seedProfile = SEED_PROFILES.find(p => p.email.toLowerCase() === email.toLowerCase());
      const profileTeam = team || seedProfile?.team || '';
      const profileRole = role || seedProfile?.role || 'member';

      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) throw new Error('You must be logged in to send invites');

      const response = await fetch(`${APP_CONFIG.SUPABASE_URL}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email: email.toLowerCase().trim(), name, team: profileTeam, role: profileRole })
      });

      const result = await response.json();
      if (!response.ok) {
        if (result.alreadyExists) throw new Error(`${name} already has an account.`);
        throw new Error(result.error || 'Failed to send invite');
      }

      setInvites(prev => [...prev, { email, sentAt: new Date().toISOString(), status: 'sent' }]);
      await logActivity('invite_sent', 'user_profile', email, name, { invited_by: currentUserEmail });
      setMessage({ type: 'success', text: `Invitation email sent to ${name}!` });

      const profiles = await SUPABASE_API.fetchUserProfiles();
      setClaimedProfiles(profiles);
    } catch (error) {
      Logger.error(error, 'Invite error');
      setMessage({ type: 'error', text: error.message || 'Failed to send invite' });
    } finally {
      setSendingEmail(null);
    }
  };

  const handleResendInvite = async (email, name, team, role) => {
    if (!email) return;
    setSendingEmail(email);
    setMessage({ type: '', text: '' });

    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) throw new Error('You must be logged in to resend invites');

      const response = await fetch(`${APP_CONFIG.SUPABASE_URL}/functions/v1/invite-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email: email.toLowerCase().trim(), name, team: team || '', role: role || 'member', resend: true })
      });

      const result = await response.json();
      if (!response.ok) {
        if (result.alreadyClaimed) throw new Error(`${name} has already signed in.`);
        throw new Error(result.error || 'Failed to resend invite');
      }

      setMessage({ type: 'success', text: `Invitation resent to ${name}!` });
      const profiles = await SUPABASE_API.fetchUserProfiles();
      setClaimedProfiles(profiles);
    } catch (error) {
      Logger.error(error, 'Resend invite error');
      setMessage({ type: 'error', text: error.message || 'Failed to resend invite' });
    } finally {
      setSendingEmail(null);
    }
  };

  const handleDeleteInvite = async (email, name) => {
    if (!email) return;
    if (!confirm(`Are you sure you want to delete the invite for ${name}?`)) return;
    setSendingEmail(email);
    setMessage({ type: '', text: '' });

    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) throw new Error('You must be logged in to delete invites');

      const response = await fetch(`${APP_CONFIG.SUPABASE_URL}/functions/v1/delete-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() })
      });

      const result = await response.json();
      if (!response.ok) {
        if (result.alreadyClaimed) throw new Error(`${name} has already signed in.`);
        throw new Error(result.error || 'Failed to delete invite');
      }

      setInvites(prev => prev.filter(inv => inv.email.toLowerCase() !== email.toLowerCase()));
      setMessage({ type: 'success', text: `Invite deleted for ${name}` });

      const profiles = await SUPABASE_API.fetchUserProfiles();
      setClaimedProfiles(profiles);
    } catch (error) {
      Logger.error(error, 'Delete invite error');
      setMessage({ type: 'error', text: error.message || 'Failed to delete invite' });
    } finally {
      setSendingEmail(null);
    }
  };

  const isInvited = (email) => invites.some(inv => inv.email.toLowerCase() === email.toLowerCase());
  const isPendingInvite = (profile) => profile.invited_at && !profile.claimed_at;

  const handleDeleteUser = async (email, name) => {
    if (!email) return;
    if (!confirm(`Are you sure you want to permanently delete ${name}'s account?`)) return;
    setSendingEmail(email);
    setMessage({ type: '', text: '' });

    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) throw new Error('You must be logged in to delete users');

      const response = await fetch(`${APP_CONFIG.SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to delete user');

      setMessage({ type: 'success', text: `${name} has been deleted` });
      const profiles = await SUPABASE_API.fetchUserProfiles();
      setClaimedProfiles(profiles);
    } catch (error) {
      Logger.error(error, 'Delete user error');
      setMessage({ type: 'error', text: error.message || 'Failed to delete user' });
    } finally {
      setSendingEmail(null);
    }
  };

  const updateUserRole = async (email, newRole) => {
    const sb = getSupabase();
    if (!sb) return false;
    if (email.toLowerCase() === currentUserEmail.toLowerCase() && newRole !== 'admin') {
      setMessage({ type: 'error', text: "You cannot demote yourself" });
      return false;
    }
    const { error } = await sb
      .from('user_profiles')
      .update({ role: newRole })
      .eq('email', email.toLowerCase().trim());
    if (error) { Logger.error(error, `Failed to update role for ${email}`); return false; }
    return true;
  };

  const updateUserTeam = async (email, newTeam) => {
    const sb = getSupabase();
    if (!sb) return false;
    const { error } = await sb
      .from('user_profiles')
      .update({ team: newTeam })
      .eq('email', email.toLowerCase().trim());
    if (error) { Logger.error(error, `Failed to update team for ${email}`); return false; }
    return true;
  };

  const handleRoleChange = async (profile, newRole) => {
    const success = await updateUserRole(profile.email, newRole);
    if (success) {
      setClaimedProfiles(prev => prev.map(p =>
        p.email === profile.email ? { ...p, role: newRole } : p
      ));
      setMessage({ type: 'success', text: `${profile.name} updated to ${newRole}` });
    } else {
      setMessage({ type: 'error', text: `Failed to update role for ${profile.name}` });
    }
  };

  const handleTeamChange = async (profile, newTeam) => {
    const success = await updateUserTeam(profile.email, newTeam);
    if (success) {
      setClaimedProfiles(prev => prev.map(p =>
        p.email === profile.email ? { ...p, team: newTeam } : p
      ));
      setMessage({ type: 'success', text: `${profile.name} moved to ${newTeam}` });
    } else {
      setMessage({ type: 'error', text: `Failed to update team for ${profile.name}` });
    }
  };

  const handleAddTeam = async (e) => {
    e.preventDefault();
    const name = newTeamName.trim();
    if (!name) return;
    if (teamNames.some(t => t.toLowerCase() === name.toLowerCase())) {
      setMessage({ type: 'error', text: `Team "${name}" already exists` });
      return;
    }
    const created = await SUPABASE_API.createTeam(name);
    if (created) {
      setTeams(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTeamName('');
      setMessage({ type: 'success', text: `Team "${name}" created` });
    } else {
      setMessage({ type: 'error', text: `Failed to create team "${name}"` });
    }
  };

  const handleDeleteTeam = async (team) => {
    if (!confirm(`Delete the "${team.name}" team? Users in this team won't be removed.`)) return;
    const success = await SUPABASE_API.deleteTeam(team.id);
    if (success) {
      setTeams(prev => prev.filter(t => t.id !== team.id));
      setMessage({ type: 'success', text: `Team "${team.name}" deleted` });
    } else {
      setMessage({ type: 'error', text: `Failed to delete team "${team.name}"` });
    }
  };

  const handleAddProfile = async (e) => {
    e.preventDefault();
    if (!newProfile.email.trim() || !newProfile.name.trim()) return;
    const sb = getSupabase();
    if (!sb) return;
    const { error } = await sb
      .from('user_profiles')
      .upsert([{
        email: newProfile.email.toLowerCase().trim(),
        name: newProfile.name,
        team: newProfile.team,
        role: newProfile.role,
      }], { onConflict: 'email' });
    if (error) {
      Logger.error(error, 'Failed to add profile');
      setMessage({ type: 'error', text: `Failed to create profile for ${newProfile.name}` });
      return;
    }
    setMessage({ type: 'success', text: `Profile created for ${newProfile.name}` });
    setNewProfile({ email: '', name: '', team: teamNames[0] || '', role: 'member' });
    const profiles = await SUPABASE_API.fetchUserProfiles();
    setClaimedProfiles(profiles);
  };

  if (!isAdmin(currentUserEmail)) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
          <Icon name="shield-x" className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-700 mb-2">Access Denied</h2>
          <p className="text-red-600 mb-4">You don't have permission to access the admin console.</p>
          <button onClick={onBack} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'invites', label: 'Invitations', icon: 'mail' },
    { id: 'profiles', label: 'User Profiles', icon: 'users' },
    { id: 'teams', label: 'Teams', icon: 'briefcase' },
    { id: 'activity', label: 'Activity Log', icon: 'activity' },
  ];

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const actionLabels = {
    'login': 'Logged in', 'created': 'Created item', 'status_changed': 'Changed status',
    'comment_added': 'Added comment', 'subtask_added': 'Added subtask',
    'subtask_completed': 'Completed subtask', 'subtask_uncompleted': 'Reopened subtask',
    'description_updated': 'Updated description', 'invite_sent': 'Sent invite',
    'role_changed': 'Changed role', 'deleted': 'Deleted item'
  };

  const actionColors = {
    'login': 'bg-blue-100 text-blue-700', 'created': 'bg-green-100 text-green-700',
    'status_changed': 'bg-amber-100 text-amber-700', 'comment_added': 'bg-purple-100 text-purple-700',
    'subtask_added': 'bg-ocean-100 text-ocean-700', 'subtask_completed': 'bg-green-100 text-green-700',
    'subtask_uncompleted': 'bg-graystone-100 text-graystone-700', 'description_updated': 'bg-pink-100 text-pink-700',
    'invite_sent': 'bg-indigo-100 text-indigo-700', 'role_changed': 'bg-red-100 text-red-700',
    'deleted': 'bg-red-100 text-red-700'
  };

  const formatDetails = (activity) => {
    if (!activity.details) return '-';
    const d = activity.details;
    if (d.from_status && d.to_status) return `${d.from_status} → ${d.to_status}`;
    if (d.from_role && d.to_role) return `${d.from_role} → ${d.to_role}`;
    if (d.subtask_title) return d.subtask_title;
    if (d.comment_text) return d.comment_text.substring(0, 50) + (d.comment_text.length > 50 ? '...' : '');
    if (d.team) return `Team: ${d.team}`;
    return '-';
  };

  const roleColors = {
    admin: 'bg-amber-100 text-amber-700 border-amber-300',
    manager: 'bg-ocean-100 text-ocean-700 border-ocean-300',
    member: 'bg-graystone-100 text-graystone-600 border-graystone-300',
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-graystone-200 overflow-hidden">
        <div className="bg-ocean-800 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Admin Console</h1>
              <p className="text-ocean-100 text-sm">Manage users, roles, and permissions</p>
            </div>
            <button onClick={onBack} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2">
              <Icon name="arrow-left" className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>

        <div className="border-b border-graystone-200">
          <div className="flex gap-1 p-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMessage({ type: '', text: '' }); }}
                className={cx(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition",
                  activeTab === tab.id ? "bg-ocean-500 text-white" : "text-graystone-600 hover:bg-graystone-100"
                )}
              >
                <Icon name={tab.icon} className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {message.text && (
            <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
              {message.text}
            </div>
          )}

          {activeTab === 'invites' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-ocean-900 mb-4">Send Invitation</h2>
                <form onSubmit={handleSendInvite} className="flex gap-3">
                  <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder={`colleague@${APP_CONFIG.ORG_DOMAIN}`}
                    className="flex-1 px-4 py-3 border border-graystone-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none transition" required />
                  <button type="submit" disabled={sending || !inviteEmail.trim()}
                    className="px-6 py-3 bg-ocean-500 text-white rounded-xl font-semibold hover:bg-ocean-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2">
                    <Icon name="send" className="w-4 h-4" />
                    Send Invite
                  </button>
                </form>
                <p className="text-xs text-graystone-500 mt-2">This will create a user profile. The user can then sign up with this email address.</p>
              </div>

              <div>
                <h3 className="font-semibold text-ocean-900 mb-3">Recent Invitations</h3>
                {invites.length === 0 ? (
                  <div className="text-center py-8 bg-graystone-50 rounded-xl border border-graystone-200">
                    <p className="text-graystone-500 text-sm">No invitations sent yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {invites.map((invite, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-graystone-50 rounded-lg border border-graystone-200">
                        <span className="text-sm">{invite.email}</span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">{invite.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-ocean-50 rounded-xl p-4 border border-graystone-200">
                <p className="text-sm text-ocean-700">
                  <Icon name="info" className="w-4 h-4 inline mr-2" />
                  Users can sign up with their email address. Their profile will be linked automatically.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'profiles' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-ocean-900 mb-2 flex items-center gap-2">
                  <Icon name="users" className="w-5 h-5" />
                  All Users
                  <span className="text-sm font-normal text-graystone-500">({claimedProfiles.length})</span>
                </h2>
                <p className="text-sm text-graystone-600 mb-4">Manage roles and teams inline. Changes save immediately.</p>

                {loadingProfiles ? (
                  <div className="py-8"><LoadingSpinner size="md" text="Loading users..." /></div>
                ) : claimedProfiles.length === 0 ? (
                  <div className="text-center py-8 text-graystone-500 bg-graystone-50 rounded-xl border border-graystone-200">
                    No users have signed up yet. Send invites to get started.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {claimedProfiles.map((profile) => (
                      <div key={profile.id} className={cx("flex items-center justify-between p-4 bg-white rounded-xl border", isPendingInvite(profile) ? "border-amber-200" : "border-graystone-200")}>
                        <div className="flex items-center gap-3">
                          <div className={cx("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm", isPendingInvite(profile) ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700")}>
                            {profile.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-medium text-ocean-900">
                              {profile.name}
                              {profile.email.toLowerCase() === currentUserEmail.toLowerCase() && (
                                <span className="text-xs text-graystone-400 ml-1">(You)</span>
                              )}
                            </div>
                            <div className="text-xs text-graystone-500">{profile.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={profile.team || ''}
                            onChange={(e) => handleTeamChange(profile, e.target.value)}
                            className="px-2 py-1 border border-graystone-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none"
                          >
                            <option value="">No team</option>
                            {teamNames.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <select
                            value={profile.role || 'member'}
                            onChange={(e) => handleRoleChange(profile, e.target.value)}
                            disabled={profile.email.toLowerCase() === currentUserEmail.toLowerCase()}
                            className={cx(
                              "px-2 py-1 border rounded-lg text-xs font-medium focus:ring-2 focus:ring-ocean-500 outline-none",
                              roleColors[profile.role] || roleColors.member,
                              profile.email.toLowerCase() === currentUserEmail.toLowerCase() && "opacity-60 cursor-not-allowed"
                            )}
                          >
                            <option value="member">member</option>
                            <option value="manager">manager</option>
                            <option value="admin">admin</option>
                          </select>
                          {isPendingInvite(profile) ? (
                            <>
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs flex items-center gap-1">
                                <Icon name="clock" className="w-3 h-3" />Pending
                              </span>
                              <button onClick={() => handleResendInvite(profile.email, profile.name, profile.team, profile.role)}
                                disabled={sendingEmail === profile.email}
                                className="px-2 py-1 bg-ocean-500 text-white rounded text-xs hover:bg-ocean-600 disabled:opacity-50 flex items-center gap-1">
                                <Icon name="refresh-cw" className="w-3 h-3" />Resend
                              </button>
                              <button onClick={() => handleDeleteInvite(profile.email, profile.name)}
                                disabled={sendingEmail === profile.email}
                                className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:opacity-50 flex items-center gap-1">
                                <Icon name="trash-2" className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs flex items-center gap-1">
                                <Icon name="check-circle" className="w-3 h-3" />Active
                              </span>
                              {profile.email.toLowerCase() !== currentUserEmail.toLowerCase() && (
                                <button onClick={() => handleDeleteUser(profile.email, profile.name)}
                                  disabled={sendingEmail === profile.email}
                                  className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 disabled:opacity-50 flex items-center gap-1">
                                  <Icon name="trash-2" className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {pendingProfiles.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-ocean-900 mb-2 flex items-center gap-2">
                    <Icon name="user-plus" className="w-5 h-5" />
                    Pending Invites
                    <span className="text-sm font-normal text-graystone-500">({pendingProfiles.length})</span>
                  </h2>
                  <p className="text-sm text-graystone-600 mb-4">Pre-seeded profiles waiting for users to sign up.</p>

                  <form onSubmit={handleAddProfile} className="bg-graystone-50 rounded-xl p-4 border border-graystone-200 mb-4">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-graystone-700 mb-1">Email</label>
                        <input type="email" value={newProfile.email} onChange={(e) => setNewProfile({ ...newProfile, email: e.target.value })}
                          placeholder={`user@${APP_CONFIG.ORG_DOMAIN}`}
                          className="w-full px-3 py-2 border border-graystone-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none transition" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-graystone-700 mb-1">Display Name</label>
                        <input type="text" value={newProfile.name} onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                          placeholder="Jane Smith"
                          className="w-full px-3 py-2 border border-graystone-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none transition" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-graystone-700 mb-1">Team</label>
                        <select value={newProfile.team} onChange={(e) => setNewProfile({ ...newProfile, team: e.target.value })}
                          className="w-full px-3 py-2 border border-graystone-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none transition">
                          <option value="">No team</option>
                          {teamNames.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-graystone-700 mb-1">Role</label>
                        <select value={newProfile.role} onChange={(e) => setNewProfile({ ...newProfile, role: e.target.value })}
                          className="w-full px-3 py-2 border border-graystone-300 rounded-lg focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none transition">
                          <option value="member">Member</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="px-4 py-2 bg-ocean-500 text-white rounded-lg font-medium hover:bg-ocean-600 transition flex items-center gap-2">
                      <Icon name="user-plus" className="w-4 h-4" />
                      Add Profile
                    </button>
                  </form>

                  <div className="space-y-2">
                    {pendingProfiles.map((profile, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-xl border border-amber-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                            {profile.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-medium text-ocean-900">{profile.name}</div>
                            <div className="text-xs text-graystone-500">{profile.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 bg-graystone-100 text-graystone-600 rounded text-xs">{profile.team}</span>
                          <span className={cx("px-2 py-1 rounded text-xs", profile.role === 'admin' ? "bg-amber-100 text-amber-700" : profile.role === 'manager' ? "bg-ocean-100 text-ocean-700" : "bg-graystone-100 text-graystone-600")}>
                            {profile.role}
                          </span>
                          {isInvited(profile.email) ? (
                            <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium flex items-center gap-1">
                              <Icon name="mail" className="w-3 h-3" />Invite Sent
                            </span>
                          ) : (
                            <button onClick={() => handleSendProfileInvite(profile.email, profile.name)}
                              disabled={sendingEmail === profile.email}
                              className="px-3 py-1.5 bg-ocean-500 text-white rounded-lg text-xs font-medium hover:bg-ocean-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition">
                              {sendingEmail === profile.email ? 'Sending...' : <><Icon name="send" className="w-3 h-3" />Invite</>}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pendingProfiles.length === 0 && claimedProfiles.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                  <Icon name="check-circle" className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-green-800 mb-1">All Users Active!</h3>
                  <p className="text-sm text-green-600">All pre-seeded profiles have been claimed. Use the Invites tab to add new users.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'teams' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-ocean-900 mb-2 flex items-center gap-2">
                  <Icon name="briefcase" className="w-5 h-5" />
                  Manage Teams
                </h2>
                <p className="text-sm text-graystone-600 mb-4">Add or remove teams. Users can be assigned to teams from the User Profiles tab.</p>

                <form onSubmit={handleAddTeam} className="flex gap-3 mb-6">
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="New team name"
                    className="flex-1 px-4 py-3 border border-graystone-300 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500 outline-none transition"
                    required
                  />
                  <button type="submit" disabled={!newTeamName.trim()}
                    className="px-6 py-3 bg-ocean-500 text-white rounded-xl font-semibold hover:bg-ocean-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2">
                    <Icon name="plus" className="w-4 h-4" />
                    Add Team
                  </button>
                </form>

                <div className="space-y-2">
                  {teams.map((team) => {
                    const memberCount = claimedProfiles.filter(p => p.team === team.name).length;
                    return (
                      <div key={team.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-graystone-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-ocean-100 text-ocean-700 flex items-center justify-center font-bold">
                            <Icon name="briefcase" className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-medium text-ocean-900">{team.name}</div>
                            <div className="text-xs text-graystone-500">{memberCount} member{memberCount !== 1 ? 's' : ''}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteTeam(team)}
                          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition text-sm flex items-center gap-1"
                        >
                          <Icon name="trash-2" className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    );
                  })}
                  {teams.length === 0 && (
                    <div className="text-center py-8 text-graystone-500 bg-graystone-50 rounded-xl border border-graystone-200">
                      No teams yet. Add one above.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-ocean-900 flex items-center gap-2">
                    <Icon name="activity" className="w-5 h-5" />
                    System Activity Log
                  </h2>
                  <p className="text-sm text-graystone-600">Track all actions performed in the system</p>
                </div>
                <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)}
                  className="px-3 py-2 border border-graystone-300 rounded-lg text-sm focus:ring-2 focus:ring-ocean-500 focus:border-ocean-500">
                  <option value="all">All Activities</option>
                  <option value="login">Logins</option>
                  <option value="created">Items Created</option>
                  <option value="status_changed">Status Changes</option>
                  <option value="comment_added">Comments</option>
                  <option value="subtask_added">Subtasks Added</option>
                  <option value="subtask_completed">Subtasks Completed</option>
                  <option value="invite_sent">Invites Sent</option>
                  <option value="role_changed">Role Changes</option>
                  <option value="deleted">Items Deleted</option>
                </select>
              </div>

              {loadingActivity ? (
                <div className="py-12"><LoadingSpinner size="md" text="Loading activity log..." /></div>
              ) : activityLog.length === 0 ? (
                <div className="text-center py-12 bg-graystone-50 rounded-xl border border-graystone-200">
                  <Icon name="inbox" className="w-12 h-12 text-graystone-300 mx-auto mb-3" />
                  <p className="text-graystone-500">No activity recorded yet</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-graystone-200 overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-graystone-50 border-b border-graystone-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-graystone-600 uppercase tracking-wider">Time</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-graystone-600 uppercase tracking-wider">User</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-graystone-600 uppercase tracking-wider">Action</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-graystone-600 uppercase tracking-wider">Target</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-graystone-600 uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-graystone-100">
                      {activityLog.filter(a => activityFilter === 'all' || a.action_type === activityFilter).map((activity) => (
                        <tr key={activity.id} className="hover:bg-graystone-50">
                          <td className="px-4 py-3 text-sm text-graystone-500 whitespace-nowrap">{formatTime(activity.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-ocean-100 text-ocean-700 flex items-center justify-center text-xs font-medium">
                                {(activity.actor_name || 'U').split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </div>
                              <span className="text-sm text-ocean-900">{activity.actor_name || activity.actor_email}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cx("px-2 py-1 rounded text-xs font-medium", actionColors[activity.action_type] || 'bg-graystone-100 text-graystone-700')}>
                              {actionLabels[activity.action_type] || activity.action_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-ocean-900 max-w-xs truncate">{activity.target_title || activity.target_id || '-'}</td>
                          <td className="px-4 py-3 text-sm text-graystone-600 max-w-xs truncate">{formatDetails(activity)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activityLog.length > 0 && (
                <p className="text-xs text-graystone-500 text-center">
                  Showing {activityLog.filter(a => activityFilter === 'all' || a.action_type === activityFilter).length} of {activityLog.length} activities
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminConsole;

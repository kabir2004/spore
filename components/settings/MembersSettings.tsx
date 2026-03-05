'use client';

import React, { useState } from 'react';
import { UserPlus, MoreHorizontal, Shield, X, Clock, ChevronDown } from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';
import { cn } from '@/lib/utils';
import type { WorkspaceMember, WorkspaceInvitation, MemberRole } from '@/lib/types/settings';

interface Props {
  currentUserId:    string;
  currentUserRole:  MemberRole;
  members:          WorkspaceMember[];
  pendingInvites:   WorkspaceInvitation[];
  onInvite:         (email: string, role: MemberRole) => Promise<{ error: string | null }>;
  onChangeRole:     (userId: string, role: 'editor' | 'viewer') => Promise<{ error: string | null }>;
  onRemoveMember:   (userId: string) => Promise<{ error: string | null }>;
  onRevokeInvite:   (inviteId: string) => Promise<{ error: string | null }>;
}

const ROLE_LABELS: Record<MemberRole, string> = {
  owner:  'Owner',
  editor: 'Editor',
  viewer: 'Viewer',
};

const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  owner:  'Full access, can manage members and settings',
  editor: 'Can view and edit all workspace content',
  viewer: 'Can view content but cannot make edits',
};

function RoleSelect({
  value,
  onChange,
  disabled,
}: {
  value: MemberRole;
  onChange: (v: 'editor' | 'viewer') => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (disabled) {
    return (
      <span className="text-[12.5px] font-medium text-text-secondary px-2.5 py-1 rounded-[5px] bg-bg-secondary">
        {ROLE_LABELS[value]}
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-[12.5px] font-medium text-text-secondary px-2.5 py-1 rounded-[5px] bg-bg-secondary hover:bg-bg-hover transition-colors"
      >
        {ROLE_LABELS[value]}
        <ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-bg-elevated border border-border-default rounded-[8px] shadow-lg overflow-hidden min-w-[200px]">
            {(['editor', 'viewer'] as const).map((role) => (
              <button
                key={role}
                onClick={() => { onChange(role); setOpen(false); }}
                className={cn(
                  'w-full flex flex-col items-start px-3.5 py-2.5 hover:bg-bg-hover transition-colors text-left',
                  value === role && 'bg-bg-active'
                )}
              >
                <span className="text-[13px] font-medium text-text-primary">
                  {ROLE_LABELS[role]}
                </span>
                <span className="text-[12px] text-text-muted mt-0.5">
                  {ROLE_DESCRIPTIONS[role]}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function MembersSettings({
  currentUserId, currentUserRole,
  members, pendingInvites,
  onInvite, onChangeRole, onRemoveMember, onRevokeInvite,
}: Props) {
  const [email,        setEmail]        = useState('');
  const [inviteRole,   setInviteRole]   = useState<MemberRole>('editor');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError,  setInviteError]  = useState<string | null>(null);
  const [inviteSent,   setInviteSent]   = useState(false);

  const isOwner = currentUserRole === 'owner';

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setInviteLoading(true);
    setInviteError(null);
    const result = await onInvite(email.trim(), inviteRole);
    setInviteLoading(false);
    if (result.error) {
      setInviteError(result.error);
    } else {
      setEmail('');
      setInviteSent(true);
      setTimeout(() => setInviteSent(false), 3000);
    }
  };

  return (
    <div>
      {/* Invite form */}
      {isOwner && (
        <div className="mb-8 p-5 border border-border-default rounded-[10px] bg-bg-secondary/40">
          <h3 className="text-[14px] font-semibold text-text-primary mb-1">
            Invite a member
          </h3>
          <p className="text-[13px] text-text-secondary mb-4">
            Invite people to collaborate in this workspace via email.
          </p>
          <form onSubmit={handleInvite} className="flex gap-2.5">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="flex-1 px-3 py-2 text-[13.5px] bg-bg-primary border border-border-default rounded-[6px] outline-none focus:border-accent-blue text-text-primary placeholder:text-text-placeholder transition-colors"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as MemberRole)}
              className="px-3 py-2 text-[13.5px] bg-bg-primary border border-border-default rounded-[6px] outline-none focus:border-accent-blue text-text-secondary cursor-pointer"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={inviteLoading || !email.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-[6px] bg-accent-blue text-white text-[13.5px] font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <UserPlus size={14} />
              {inviteLoading ? 'Sending...' : inviteSent ? 'Sent ✓' : 'Invite'}
            </button>
          </form>
          {inviteError && (
            <p className="text-[12.5px] text-[#E03E3E] mt-2">{inviteError}</p>
          )}
        </div>
      )}

      {/* Members list */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-semibold text-text-primary">
            Members
            <span className="ml-2 text-[12px] text-text-muted font-normal">
              ({members.length})
            </span>
          </h3>
        </div>

        <div className="border border-border-default rounded-[10px] overflow-hidden">
          {members.map((member, i) => {
            const isSelf  = member.user_id === currentUserId;
            const isOwnerMember = member.role === 'owner';
            const canEdit = isOwner && !isSelf && !isOwnerMember;

            return (
              <div
                key={member.user_id}
                className={cn(
                  'flex items-center gap-3.5 px-4 py-3.5',
                  i < members.length - 1 && 'border-b border-border-light'
                )}
              >
                <Avatar name={member.full_name ?? member.email} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium text-text-primary truncate">
                    {member.full_name ?? member.email}
                    {isSelf && (
                      <span className="ml-2 text-[11px] text-text-muted font-normal">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="text-[12.5px] text-text-muted truncate">{member.email}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isOwnerMember && (
                    <Shield size={13} className="text-text-muted mr-1" />
                  )}
                  <RoleSelect
                    value={member.role}
                    disabled={!canEdit}
                    onChange={(role) => onChangeRole(member.user_id, role)}
                  />
                  {canEdit && (
                    <button
                      onClick={() => onRemoveMember(member.user_id)}
                      className="p-1.5 rounded-[5px] text-text-placeholder hover:text-[#E03E3E] hover:bg-[#E03E3E]/8 transition-colors"
                      title="Remove member"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending invitations */}
      {pendingInvites.length > 0 && (
        <div>
          <h3 className="text-[14px] font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Clock size={14} className="text-text-muted" />
            Pending invitations
            <span className="text-[12px] text-text-muted font-normal">
              ({pendingInvites.length})
            </span>
          </h3>
          <div className="border border-border-default rounded-[10px] overflow-hidden">
            {pendingInvites.map((invite, i) => (
              <div
                key={invite.id}
                className={cn(
                  'flex items-center gap-3.5 px-4 py-3.5',
                  i < pendingInvites.length - 1 && 'border-b border-border-light'
                )}
              >
                <Avatar name={invite.email} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="text-[13.5px] font-medium text-text-primary truncate">
                    {invite.email}
                  </p>
                  <p className="text-[12px] text-text-muted">
                    Invited as {ROLE_LABELS[invite.role as MemberRole]} ·{' '}
                    Expires {new Date(invite.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-[12px] font-medium text-accent-orange bg-accent-orange/10 px-2 py-0.5 rounded-full">
                  Pending
                </span>
                {isOwner && (
                  <button
                    onClick={() => onRevokeInvite(invite.id)}
                    className="p-1.5 rounded-[5px] text-text-placeholder hover:text-[#E03E3E] hover:bg-[#E03E3E]/8 transition-colors ml-1"
                    title="Revoke invitation"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

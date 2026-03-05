'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import {
  SettingsSection, SettingsField, SettingsInput,
  SettingsSaveButton, DangerZone,
} from './SettingsShell';

interface Props {
  email: string;
  hasPassword: boolean;
  onChangeEmail:    (newEmail: string) => Promise<{ error: string | null }>;
  onChangePassword: (current: string, next: string) => Promise<{ error: string | null }>;
  onDeleteAccount:  () => void;
}

export function AccountSettings({
  email, hasPassword,
  onChangeEmail, onChangePassword, onDeleteAccount,
}: Props) {
  // Email
  const [newEmail,       setNewEmail]       = useState(email);
  const [emailLoading,   setEmailLoading]   = useState(false);
  const [emailSaved,     setEmailSaved]     = useState(false);
  const [emailError,     setEmailError]     = useState<string | null>(null);

  // Password
  const [currentPw,     setCurrentPw]     = useState('');
  const [newPw,         setNewPw]         = useState('');
  const [confirmPw,     setConfirmPw]     = useState('');
  const [showCurrent,   setShowCurrent]   = useState(false);
  const [showNew,       setShowNew]       = useState(false);
  const [pwLoading,     setPwLoading]     = useState(false);
  const [pwSaved,       setPwSaved]       = useState(false);
  const [pwError,       setPwError]       = useState<string | null>(null);

  const handleEmailSave = async () => {
    setEmailLoading(true);
    setEmailError(null);
    const result = await onChangeEmail(newEmail);
    setEmailLoading(false);
    if (result.error) {
      setEmailError(result.error);
    } else {
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 2500);
    }
  };

  const handlePasswordSave = async () => {
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match');
      return;
    }
    if (newPw.length < 8) {
      setPwError('Password must be at least 8 characters');
      return;
    }
    setPwLoading(true);
    setPwError(null);
    const result = await onChangePassword(currentPw, newPw);
    setPwLoading(false);
    if (result.error) {
      setPwError(result.error);
    } else {
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2500);
    }
  };

  return (
    <div>
      {/* Email */}
      <SettingsSection
        title="Email address"
        description="Your email is used for sign-in and notifications. Changing it requires re-verification."
      >
        <SettingsField label="Email">
          <SettingsInput
            type="email"
            value={newEmail}
            onChange={setNewEmail}
            placeholder="you@example.com"
          />
        </SettingsField>
        {emailError && <p className="text-[13px] text-[#E03E3E]">{emailError}</p>}
        <SettingsSaveButton
          loading={emailLoading}
          saved={emailSaved}
          onClick={handleEmailSave}
          disabled={newEmail === email || !newEmail}
        />
      </SettingsSection>

      {/* Password */}
      {hasPassword && (
        <SettingsSection
          title="Password"
          description="Use a strong, unique password you don't use elsewhere."
        >
          <SettingsField label="Current password">
            <div className="relative">
              <SettingsInput
                type={showCurrent ? 'text' : 'password'}
                value={currentPw}
                onChange={setCurrentPw}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-placeholder hover:text-text-muted transition-colors"
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </SettingsField>

          <SettingsField label="New password">
            <div className="relative">
              <SettingsInput
                type={showNew ? 'text' : 'password'}
                value={newPw}
                onChange={setNewPw}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-placeholder hover:text-text-muted transition-colors"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </SettingsField>

          <SettingsField label="Confirm new password">
            <SettingsInput
              type="password"
              value={confirmPw}
              onChange={setConfirmPw}
              placeholder="Repeat new password"
            />
          </SettingsField>

          {pwError && <p className="text-[13px] text-[#E03E3E]">{pwError}</p>}

          <SettingsSaveButton
            loading={pwLoading}
            saved={pwSaved}
            onClick={handlePasswordSave}
            disabled={!currentPw || !newPw || !confirmPw}
          />
        </SettingsSection>
      )}

      {/* Danger zone */}
      <SettingsSection title="Danger zone">
        <DangerZone
          title="Delete account"
          description="Permanently delete your account and all associated data. This cannot be undone."
          action="Delete account"
          onAction={onDeleteAccount}
        />
      </SettingsSection>
    </div>
  );
}

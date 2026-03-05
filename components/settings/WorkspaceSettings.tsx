'use client';

import React, { useState } from 'react';
import {
  SettingsSection, SettingsField, SettingsInput,
  SettingsSelect, SettingsSaveButton, DangerZone,
} from './SettingsShell';
import type { WorkspaceSettings as WS, UpdateWorkspaceSettingsInput } from '@/lib/types/settings';

interface Props {
  workspaceName: string;
  settings:      WS | null;
  onSave:        (input: UpdateWorkspaceSettingsInput) => Promise<{ error: string | null }>;
  onDelete?:     () => void;
}

export function WorkspaceSettingsView({ workspaceName, settings, onSave, onDelete }: Props) {
  const [name,        setName]        = useState(workspaceName);
  const [description, setDescription] = useState(settings?.description ?? '');
  const [website,     setWebsite]     = useState(settings?.website_url ?? '');
  const [defaultRole, setDefaultRole] = useState(
    settings?.default_member_role ?? 'editor'
  );
  const [allowPublic, setAllowPublic] = useState(
    settings?.allow_public_pages ?? false
  );
  const [loading, setLoading] = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    const result = await onSave({
      name,
      description:        description || null,
      website_url:        website     || null,
      default_member_role: defaultRole as 'editor' | 'viewer',
      allow_public_pages: allowPublic,
    });
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  };

  return (
    <div>
      <SettingsSection
        title="General"
        description="Basic information about your workspace."
      >
        <SettingsField label="Workspace name">
          <SettingsInput
            value={name}
            onChange={setName}
            placeholder="Acme Corp"
          />
        </SettingsField>

        <SettingsField label="Description" description="Briefly describe what this workspace is for.">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Engineering team workspace for Spore..."
            rows={3}
            className="w-full px-3 py-2 text-[13.5px] bg-bg-primary border border-border-default rounded-[6px] outline-none focus:border-accent-blue text-text-primary placeholder:text-text-placeholder transition-colors resize-none"
          />
        </SettingsField>

        <SettingsField label="Website URL">
          <SettingsInput
            value={website}
            onChange={setWebsite}
            placeholder="https://yourcompany.com"
            type="url"
          />
        </SettingsField>
      </SettingsSection>

      <SettingsSection
        title="Access"
        description="Control who can join and what they can do by default."
      >
        <SettingsField
          label="Default member role"
          description="Role assigned to new members when they join via invitation."
        >
          <SettingsSelect
            value={defaultRole}
            onChange={(v) => setDefaultRole(v as 'owner' | 'editor' | 'viewer')}
            options={[
              { value: 'editor', label: 'Editor — can view and edit pages' },
              { value: 'viewer', label: 'Viewer — can only view pages' },
            ]}
          />
        </SettingsField>

        <SettingsField
          label="Public pages"
          description="Allow pages to be shared publicly with a link."
        >
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setAllowPublic((v) => !v)}
              className={`relative w-[40px] h-[22px] rounded-full transition-colors cursor-pointer ${
                allowPublic ? 'bg-accent-blue' : 'bg-bg-hover border border-border-default'
              }`}
            >
              <div
                className={`absolute top-[3px] w-[16px] h-[16px] rounded-full bg-white shadow-sm transition-transform ${
                  allowPublic ? 'translate-x-[19px]' : 'translate-x-[3px]'
                }`}
              />
            </div>
            <span className="text-[13.5px] text-text-secondary">
              {allowPublic ? 'Enabled' : 'Disabled'}
            </span>
          </label>
        </SettingsField>
      </SettingsSection>

      {error && <p className="text-[13px] text-[#E03E3E] mb-4">{error}</p>}

      <SettingsSaveButton
        loading={loading}
        saved={saved}
        onClick={handleSave}
      />

      {onDelete && (
        <div className="mt-10 pt-10 border-t border-border-default">
          <SettingsSection title="Danger zone">
            <DangerZone
              title="Delete workspace"
              description="Permanently delete this workspace, all pages, and all data. This cannot be undone."
              action="Delete workspace"
              onAction={onDelete}
            />
          </SettingsSection>
        </div>
      )}
    </div>
  );
}

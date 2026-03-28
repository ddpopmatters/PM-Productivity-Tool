import React from 'react';
import { User } from 'lucide-react';

export default function ContactsCard({ request }) {
  const contacts = [
    { label: 'Requester', value: request?.requester_email },
    { label: 'Approval owner', value: request?.named_approver },
    { label: 'Copy owner', value: request?.copy_owner },
    { label: 'Asset owner', value: request?.asset_owner },
  ].filter((contact) => contact.value);

  return (
    <div className="rounded-xl border border-graystone-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <h2 className="text-base font-semibold text-ocean-900 dark:text-slate-100">Key contacts</h2>

      {contacts.length === 0 ? (
        <p className="mt-3 text-sm text-graystone-700 dark:text-slate-300">No contacts have been assigned yet.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {contacts.map((contact) => (
            <div
              key={contact.label}
              className="inline-flex items-center gap-2 rounded-full bg-graystone-100 px-3 py-1.5 text-sm dark:bg-slate-800"
            >
              <User className="h-4 w-4 text-aqua-500" />
              <span className="font-medium text-ocean-900 dark:text-slate-100">{contact.label}</span>
              <span className="text-graystone-700 dark:text-slate-300">{contact.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

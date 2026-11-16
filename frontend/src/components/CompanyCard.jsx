import { useState } from 'react';

const FIELDS = [
  ['name', 'Company name'],
  ['industry', 'Industry'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['website', 'Website'],
  ['address', 'Address'],
];

export default function CompanyCard({ company, canEdit, onSave }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(company);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setForm(company);
    setError('');
    setEditing(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card">
      <div className="section-head">
        <h2>Company Details</h2>
        {canEdit && !editing && (
          <button className="btn" onClick={startEdit}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={submit} className="grid-form">
          {error && <div className="alert error span-2">{error}</div>}
          {FIELDS.map(([key, label]) => (
            <label key={key} className={key === 'address' ? 'span-2' : ''}>
              {label}
              <input
                value={form[key] || ''}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={key === 'name'}
              />
            </label>
          ))}
          <div className="span-2 form-actions">
            <button type="button" className="btn" onClick={() => setEditing(false)}>
              Cancel
            </button>
            <button className="btn primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      ) : (
        <dl className="details">
          {FIELDS.map(([key, label]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{company[key] || '—'}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

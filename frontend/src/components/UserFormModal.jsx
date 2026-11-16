import { useState } from 'react';

export default function UserFormModal({ mode, user, isSelf, onSave, onClose }) {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState({
    username: user?.username || '',
    fullName: user?.full_name || '',
    email: user?.email || '',
    role: user?.role || 'Employee',
    isActive: user ? user.is_active : true,
    password: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) =>
    setForm({ ...form, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        role: form.role,
      };
      if (isEdit) {
        payload.isActive = form.isActive;
        if (form.password) payload.password = form.password; // only change if filled in
      } else {
        payload.username = form.username;
        payload.password = form.password;
      }
      await onSave(payload);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="card modal" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <h2>{isEdit ? 'Edit User' : 'Add User'}</h2>
        {error && <div className="alert error">{error}</div>}

        <label>
          Username
          <input
            value={form.username}
            onChange={set('username')}
            disabled={isEdit}
            placeholder="e.g. aurora.john"
            required
          />
          {isEdit && <span className="hint">Username can't be changed</span>}
        </label>

        <label>
          Full name
          <input value={form.fullName} onChange={set('fullName')} required />
        </label>

        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} />
        </label>

        <label>
          Role
          <select value={form.role} onChange={set('role')} disabled={isSelf}>
            <option value="Employee">Employee</option>
            <option value="Admin">Admin</option>
          </select>
        </label>

        <label>
          {isEdit ? 'New password (leave blank to keep current)' : 'Password'}
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            minLength={6}
            required={!isEdit}
            autoComplete="new-password"
          />
        </label>

        {isEdit && (
          <label className="checkbox">
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} disabled={isSelf} />
            Active
          </label>
        )}

        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add user'}
          </button>
        </div>
      </form>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import CompanyCard from '../components/CompanyCard.jsx';
import UserFormModal from '../components/UserFormModal.jsx';

export default function UserPage({ currentUser, onLogout }) {
  const isAdmin = currentUser.role === 'Admin';

  const [company, setCompany] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState(null); // null | { mode: 'add' } | { mode: 'edit', user }

  // Any 401 means the session is no longer valid (expired, deactivated, deleted)
  const handleError = useCallback(
    (err) => {
      if (err.status === 401) onLogout();
      else setError(err.message);
    },
    [onLogout]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [c, u] = await Promise.all([api.getCompany(), api.getUsers()]);
      setCompany(c.company);
      setUsers(u.users);
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  useEffect(() => {
    load();
  }, [load]);

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  };

  const saveUser = async (data) => {
    if (modal.mode === 'add') {
      await api.createUser(data);
      flash('User added');
    } else {
      await api.updateUser(modal.user.id, data);
      flash('User updated');
    }
    setModal(null);
    load();
  };

  const toggleActive = async (u) => {
    try {
      await api.updateUser(u.id, { isActive: !u.is_active });
      flash(u.is_active ? 'User deactivated' : 'User activated');
      load();
    } catch (err) {
      handleError(err);
    }
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`Permanently delete ${u.full_name} (${u.username})?`)) return;
    try {
      await api.deleteUser(u.id);
      flash('User deleted');
      load();
    } catch (err) {
      handleError(err);
    }
  };

  const saveCompany = async (data) => {
    const res = await api.updateCompany(data);
    setCompany(res.company);
    flash('Company details updated');
  };

  return (
    <div className="page">
      <header className="topbar">
        <div>
          <strong>{company?.name || currentUser.companyName || 'Company'}</strong>
          <span className="muted"> · Multi-Company Management</span>
        </div>
        <div className="topbar-right">
          <span>
            {currentUser.fullName} <span className={`badge ${isAdmin ? 'admin' : ''}`}>{currentUser.role}</span>
          </span>
          <button className="btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="content">
        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}

        {loading && !company ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            {company && <CompanyCard company={company} canEdit={isAdmin} onSave={saveCompany} />}

            <section className="card">
              <div className="section-head">
                <h2>Users ({users.length})</h2>
                {isAdmin && (
                  <button className="btn primary" onClick={() => setModal({ mode: 'add' })}>
                    + Add User
                  </button>
                )}
              </div>

              {!isAdmin && (
                <p className="muted small">You have view-only access. Contact an Admin to make changes.</p>
              )}

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Username</th>
                      <th>Full name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      {isAdmin && <th className="right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => {
                      const isSelf = u.id === currentUser.id;
                      return (
                        <tr key={u.id} className={u.is_active ? '' : 'inactive'}>
                          <td>{i + 1}</td>
                          <td>
                            {u.username}
                            {isSelf && <span className="muted small"> (you)</span>}
                          </td>
                          <td>{u.full_name}</td>
                          <td>{u.email || '—'}</td>
                          <td>
                            <span className={`badge ${u.role === 'Admin' ? 'admin' : ''}`}>{u.role}</span>
                          </td>
                          <td>
                            <span className={`status ${u.is_active ? 'on' : 'off'}`}>
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="right">
                              <div className="actions">
                              <button className="btn small" onClick={() => setModal({ mode: 'edit', user: u })}>
                                Edit
                              </button>
                              <button className="btn small" disabled={isSelf} onClick={() => toggleActive(u)}>
                                {u.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button className="btn small danger" disabled={isSelf} onClick={() => deleteUser(u)}>
                                Delete
                              </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="muted center">
                          No users yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      {modal && (
        <UserFormModal
          mode={modal.mode}
          user={modal.user}
          isSelf={modal.user?.id === currentUser.id}
          onSave={saveUser}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

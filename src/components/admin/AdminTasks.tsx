import { useState, useEffect } from 'react';
import AdminTasksBlock from './AdminTasksBlock';

// Читаем auth из sessionStorage
function getAuth() {
  try {
    const raw = sessionStorage.getItem('admin_auth');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { is_admin: false, pages: [] };
}

const AdminTasks = () => {
  const [auth] = useState(getAuth);

  return (
    <div className="p-6 max-w-4xl">
      <AdminTasksBlock auth={auth} fullPage />
    </div>
  );
};

export default AdminTasks;

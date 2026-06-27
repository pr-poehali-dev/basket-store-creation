import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminOrders from '@/components/admin/AdminOrders';
import AdminProducts from '@/components/admin/AdminProducts';
import AdminProduction from '@/components/admin/AdminProduction';
import AdminPainting from '@/components/admin/AdminPainting';
import AdminCalendar from '@/components/admin/AdminCalendar';
import AdminAccess from '@/components/admin/AdminAccess';
import AdminHandbook from '@/components/admin/AdminHandbook';
import AdminWarehouse from '@/components/admin/AdminWarehouse';
import AdminTasks from '@/components/admin/AdminTasks';
import { AdminStaffCabinetPage } from '@/components/admin/AdminStaffCabinet';
import AdminPlaceholder from '@/components/admin/AdminPlaceholder';

const Admin = () => (
  <AdminLayout>
    <Routes>
      <Route index element={<AdminOrders />} />
      <Route path="tasks"        element={<AdminTasks />} />
      <Route path="orders"       element={<AdminOrders />} />
      <Route path="calendar"     element={<AdminCalendar />} />
      <Route path="production"   element={<AdminProduction />} />
      <Route path="painting"     element={<AdminPainting />} />
      <Route path="warehouse"    element={<AdminWarehouse />} />
      <Route path="income"       element={<AdminPlaceholder title="Поступления" />} />
      <Route path="clients"      element={<AdminPlaceholder title="База клиентов" />} />
      <Route path="products"     element={<AdminProducts />} />
      <Route path="salary"       element={<AdminPlaceholder title="Зарплата" />} />
      <Route path="staff-report" element={<AdminPlaceholder title="Сводка по сотрудникам" />} />
      <Route path="handbook"     element={<AdminHandbook />} />
      <Route path="access"       element={<AdminAccess />} />
      <Route path="cabinet"      element={<AdminStaffCabinetPage />} />
      <Route path="*"            element={<Navigate to="/admin/orders" replace />} />
    </Routes>
  </AdminLayout>
);

export default Admin;

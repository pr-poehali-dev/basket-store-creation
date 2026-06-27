import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminOrders from '@/components/admin/AdminOrders';
import AdminProducts from '@/components/admin/AdminProducts';
import AdminProduction from '@/components/admin/AdminProduction';
import AdminPainting from '@/components/admin/AdminPainting';
import AdminCalendar from '@/components/admin/AdminCalendar';
import AdminAccess from '@/components/admin/AdminAccess';
import AdminPlaceholder from '@/components/admin/AdminPlaceholder';

const Admin = () => (
  <AdminLayout>
    <Routes>
      <Route index element={<AdminOrders />} />
      <Route path="orders"       element={<AdminOrders />} />
      <Route path="calendar"     element={<AdminCalendar />} />
      <Route path="production"   element={<AdminProduction />} />
      <Route path="painting"     element={<AdminPainting />} />
      <Route path="warehouse"    element={<AdminPlaceholder title="Склад" />} />
      <Route path="income"       element={<AdminPlaceholder title="Поступления" />} />
      <Route path="clients"      element={<AdminPlaceholder title="База клиентов" />} />
      <Route path="products"     element={<AdminProducts />} />
      <Route path="salary"       element={<AdminPlaceholder title="Зарплата" />} />
      <Route path="staff-report" element={<AdminPlaceholder title="Сводка по сотрудникам" />} />
      <Route path="handbook"     element={<AdminPlaceholder title="Справочник" />} />
      <Route path="access"       element={<AdminAccess />} />
      <Route path="*"            element={<Navigate to="/admin/orders" replace />} />
    </Routes>
  </AdminLayout>
);

export default Admin;

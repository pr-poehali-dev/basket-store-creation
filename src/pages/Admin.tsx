import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminOrders from '@/components/admin/AdminOrders';
import AdminProducts from '@/components/admin/AdminProducts';
import AdminProduction from '@/components/admin/AdminProduction';
import AdminPlaceholder from '@/components/admin/AdminPlaceholder';

const Admin = () => (
  <AdminLayout>
    <Routes>
      <Route index element={<AdminOrders />} />
      <Route path="orders" element={<AdminOrders />} />
      <Route path="products" element={<AdminProducts />} />
      <Route path="calendar" element={<AdminPlaceholder title="Календарь" />} />
      <Route path="production" element={<AdminProduction />} />
      <Route path="painting" element={<AdminPlaceholder title="Малярка" />} />
      <Route path="clients" element={<AdminPlaceholder title="База клиентов" />} />
      <Route path="income" element={<AdminPlaceholder title="Поступления" />} />
      <Route path="*" element={<Navigate to="/admin/orders" replace />} />
    </Routes>
  </AdminLayout>
);

export default Admin;
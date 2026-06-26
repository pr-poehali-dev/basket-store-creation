import Icon from '@/components/ui/icon';

const AdminPlaceholder = ({ title }: { title: string }) => (
  <div className="p-6">
    <h1 className="font-display text-2xl font-semibold text-primary mb-6">{title}</h1>
    <div className="border border-dashed border-primary/30 rounded-2xl p-12 text-center">
      <Icon name="Hammer" size={40} className="mx-auto mb-4 text-primary/40" />
      <p className="text-muted-foreground">Раздел «{title}» в разработке.</p>
    </div>
  </div>
);

export default AdminPlaceholder;

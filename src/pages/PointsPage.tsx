import StaffGate from '../components/StaffGate';
import CreditPanel from '../components/CreditPanel';

export default function PointsPage() {
  return (
    <StaffGate>
      <CreditPanel kind="points" />
    </StaffGate>
  );
}

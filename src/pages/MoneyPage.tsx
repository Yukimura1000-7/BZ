import StaffGate from '../components/StaffGate';
import CreditPanel from '../components/CreditPanel';

export default function MoneyPage() {
  return (
    <StaffGate>
      <CreditPanel kind="money" />
    </StaffGate>
  );
}

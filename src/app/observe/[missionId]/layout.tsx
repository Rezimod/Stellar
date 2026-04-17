import { ObserveFlowProvider } from './ObserveFlowContext';

export default function ObserveLayout({ children }: { children: React.ReactNode }) {
  return <ObserveFlowProvider>{children}</ObserveFlowProvider>;
}

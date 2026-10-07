import { permanentRedirect } from 'next/navigation';

/** The simulator is off the public site until first light; old links land on the telescope's page. */
export default function NodeSimulatorRedirect() {
  permanentRedirect('/node');
}

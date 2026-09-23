import { permanentRedirect } from 'next/navigation';

/** The console moved to /node, the Observatory; old links still land on it. */
export default function TelescopeRedirect() {
  permanentRedirect('/node');
}

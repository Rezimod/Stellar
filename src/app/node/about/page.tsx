import { permanentRedirect } from 'next/navigation';

/** The telescope's page is /node until first light; old links still land on it. */
export default function NodeAboutRedirect() {
  permanentRedirect('/node');
}

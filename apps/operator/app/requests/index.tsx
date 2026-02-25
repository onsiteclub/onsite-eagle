/**
 * Requests Index — redirects to main tab.
 * Kept for deep link compatibility.
 */
import { Redirect } from 'expo-router';

export default function RequestsIndex() {
  return <Redirect href="/(tabs)" />;
}

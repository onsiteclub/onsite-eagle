/**
 * SDK Debug Tools — Native log access, email logs, state verification.
 *
 * Spec: 09-MONITORING.md "SDK Debug Tools"
 */
import BackgroundGeolocation from 'react-native-background-geolocation';
import { logger } from '@onsite/logger';

export async function getSdkLog(): Promise<string> {
  try {
    const log = await BackgroundGeolocation.getLog();
    return log;
  } catch (error) {
    logger.debug('BOOT', 'getSdkLog failed', { error: String(error) });
    return '';
  }
}

export async function emailSdkLog(email: string = 'dev@onsiteclub.com'): Promise<void> {
  try {
    await BackgroundGeolocation.emailLog(email);
  } catch (error) {
    logger.debug('BOOT', 'emailSdkLog failed', { error: String(error) });
  }
}

export async function verifySdkState(): Promise<{
  healthy: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    const state = await BackgroundGeolocation.getState();

    if (!state.enabled) issues.push('SDK is not enabled');
    if (state.stopOnTerminate) issues.push('stopOnTerminate is true');
    if (!state.startOnBoot) issues.push('startOnBoot is false');

    return { healthy: issues.length === 0, issues };
  } catch (error) {
    return { healthy: false, issues: [`SDK state check failed: ${String(error)}`] };
  }
}

export async function toggleDebugSounds(enabled: boolean): Promise<void> {
  try {
    await BackgroundGeolocation.setConfig({ debug: enabled });
    logger.debug('BOOT', `Debug sounds ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    logger.debug('BOOT', 'toggleDebugSounds failed', { error: String(error) });
  }
}

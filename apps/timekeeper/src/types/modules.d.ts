/**
 * Type declarations for third-party modules not installed
 * or lacking type definitions in this project.
 *
 * These allow TypeScript to compile without errors while the
 * actual runtime dependencies may be installed later or
 * resolved via native build plugins.
 */

// ─── react-native-background-geolocation ────────────────────
// Transistorsoft BackgroundGeolocation SDK
// Installed via native plugin at build time, types not bundled.
declare module 'react-native-background-geolocation' {
  export interface Config {
    desiredAccuracy?: number;
    distanceFilter?: number;
    stationaryRadius?: number;
    stopTimeout?: number;
    stopOnTerminate?: boolean;
    startOnBoot?: boolean;
    enableHeadless?: boolean;
    heartbeatInterval?: number;
    preventSuspend?: boolean;
    foregroundService?: boolean;
    notification?: {
      title?: string;
      text?: string;
      channelName?: string;
      smallIcon?: string;
      largeIcon?: string;
    };
    logLevel?: number;
    debug?: boolean;
    license?: string;
    geofenceProximityRadius?: number;
    geofenceInitialTriggerEntry?: boolean;
    [key: string]: unknown;
  }

  export interface Location {
    coords: {
      latitude: number;
      longitude: number;
      accuracy: number;
      altitude: number;
      heading: number;
      speed: number;
    };
    timestamp: string;
    battery: { level: number; is_charging: boolean };
    activity: { type: string; confidence: number };
    is_moving: boolean;
    uuid: string;
  }

  export interface GeofenceEvent {
    action: string;
    identifier: string;
    location: Location;
    extras?: Record<string, unknown>;
  }

  export interface Geofence {
    identifier: string;
    latitude: number;
    longitude: number;
    radius: number;
    notifyOnEntry?: boolean;
    notifyOnExit?: boolean;
    notifyOnDwell?: boolean;
    loiteringDelay?: number;
    extras?: Record<string, unknown>;
  }

  export interface State extends Config {
    enabled: boolean;
    trackingMode: number;
    schedulerEnabled: boolean;
    odometer: number;
    didDeviceReboot: boolean;
    didLaunchInBackground: boolean;
  }

  export interface HeartbeatEvent {
    location: Location;
  }

  export interface Subscription {
    remove(): void;
  }

  export interface ProviderChangeEvent {
    enabled: boolean;
    gps: boolean;
    network: boolean;
    status: number;
  }

  const BackgroundGeolocation: {
    // Constants
    LOG_LEVEL_OFF: number;
    LOG_LEVEL_ERROR: number;
    LOG_LEVEL_WARNING: number;
    LOG_LEVEL_INFO: number;
    LOG_LEVEL_DEBUG: number;
    LOG_LEVEL_VERBOSE: number;
    DESIRED_ACCURACY_NAVIGATION: number;
    DESIRED_ACCURACY_HIGH: number;
    DESIRED_ACCURACY_MEDIUM: number;
    DESIRED_ACCURACY_LOW: number;
    DESIRED_ACCURACY_VERY_LOW: number;

    // Methods
    ready(config: Config): Promise<State>;
    start(): Promise<State>;
    stop(): Promise<State>;
    getCurrentPosition(options?: Record<string, unknown>): Promise<Location>;
    getState(): Promise<State>;
    changePace(isMoving: boolean): Promise<void>;
    addGeofence(geofence: Geofence): Promise<void>;
    addGeofences(geofences: Geofence[]): Promise<void>;
    removeGeofence(identifier: string): Promise<void>;
    removeGeofences(): Promise<void>;
    getGeofences(): Promise<Geofence[]>;
    startGeofences(): Promise<State>;
    setConfig(config: Partial<Config>): Promise<State>;
    destroyLocations(): Promise<void>;
    getLocations(): Promise<Location[]>;
    getCount(): Promise<number>;
    sync(): Promise<Location[]>;
    resetOdometer(): Promise<Location>;
    playSound(soundId: number): void;

    // Events
    onGeofence(callback: (event: GeofenceEvent) => void): Subscription;
    onHeartbeat(callback: (event: HeartbeatEvent) => void): Subscription;
    onLocation(callback: (location: Location) => void): Subscription;
    onProviderChange(callback: (event: ProviderChangeEvent) => void): Subscription;
    onMotionChange(callback: (event: { isMoving: boolean; location: Location }) => void): Subscription;
    onEnabledChange(callback: (enabled: boolean) => void): Subscription;
    onHttp(callback: (response: { status: number; responseText: string }) => void): Subscription;

    // Headless
    registerHeadlessTask(callback: (event: { name: string; params: unknown }) => Promise<void>): void;
  };

  export default BackgroundGeolocation;
}

// ─── @sentry/react-native ───────────────────────────────────
// Sentry crash reporting SDK
declare module '@sentry/react-native' {
  export function init(options: {
    dsn?: string;
    tracesSampleRate?: number;
    debug?: boolean;
    enableNativeFramesTracking?: boolean;
    enableStallTracking?: boolean;
    environment?: string;
    release?: string;
    [key: string]: unknown;
  }): void;

  export function captureException(error: unknown, context?: Record<string, unknown>): string;
  export function captureMessage(message: string, level?: string): string;
  export function setUser(user: { id?: string; email?: string; username?: string } | null): void;
  export function setTag(key: string, value: string): void;
  export function setContext(name: string, context: Record<string, unknown> | null): void;
  export function addBreadcrumb(breadcrumb: {
    category?: string;
    message?: string;
    data?: Record<string, unknown>;
    level?: string;
    timestamp?: number;
  }): void;
  export function startTransaction(context: {
    name: string;
    op?: string;
    data?: Record<string, unknown>;
  }): {
    finish(): void;
    setTag(key: string, value: string): void;
    setData(key: string, value: unknown): void;
  };

  export function wrap<T extends (...args: unknown[]) => unknown>(fn: T): T;
  export function withScope(callback: (scope: {
    setTag(key: string, value: string): void;
    setExtra(key: string, value: unknown): void;
    setContext(name: string, context: Record<string, unknown> | null): void;
    setLevel(level: string): void;
  }) => void): void;

  export const Severity: {
    Fatal: string;
    Error: string;
    Warning: string;
    Log: string;
    Info: string;
    Debug: string;
  };
}

// ─── expo-print ─────────────────────────────────────────────
// Expo print module for HTML to PDF conversion
declare module 'expo-print' {
  export interface PrintOptions {
    html?: string;
    uri?: string;
    width?: number;
    height?: number;
    base64?: boolean;
    useMarkupFormatter?: boolean;
  }

  export interface FilePrintResult {
    uri: string;
    numberOfPages: number;
    base64?: string;
  }

  export function printAsync(options: PrintOptions): Promise<void>;
  export function printToFileAsync(options: PrintOptions): Promise<FilePrintResult>;
  export function selectPrinterAsync(): Promise<{ name: string; url: string }>;
}

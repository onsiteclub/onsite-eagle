export default {
  expo: {
    name: "OnSite Timekeeper",
    slug: "onsite-timekeeper",
    version: "2.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    scheme: "onsite-timekeeper",
    userInterfaceStyle: "light",
    newArchEnabled: false,
    backgroundColor: "#F6F7F9",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#F6F7F9",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.onsiteclub.timekeeper",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "OnSite Timekeeper uses your location to detect your work site.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "OnSite Timekeeper uses your location to automatically track your work hours when you arrive and leave your job site.",
        NSMotionUsageDescription:
          "OnSite Timekeeper uses motion detection to improve location tracking accuracy.",
        UIBackgroundModes: ["location", "fetch", "processing"],
      },
    },
    android: {
      package: "com.onsiteclub.timekeeper",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#F6F7F9",
      },
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "FOREGROUND_SERVICE",
        "FOREGROUND_SERVICE_LOCATION",
        "POST_NOTIFICATIONS",
        "RECEIVE_BOOT_COMPLETED",
        "ACTIVITY_RECOGNITION",
      ],
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      "expo-sqlite",
      [
        "expo-build-properties",
        {
          android: {
            minSdkVersion: 24,
            targetSdkVersion: 34,
            compileSdkVersion: 35,
            kotlinVersion: "1.9.25",
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};

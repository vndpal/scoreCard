const APP_ENVIRONMENT = process.env.APP_ENV;
let AndroidGoogleServicesFile;

if (APP_ENVIRONMENT === "development") {
  AndroidGoogleServicesFile = process.env.GOOGLE_SERVICES_JSON_DEV;
} else if (APP_ENVIRONMENT === "preview") {
  AndroidGoogleServicesFile = process.env.GOOGLE_SERVICES_JSON;
} else if (APP_ENVIRONMENT === "testing") {
  AndroidGoogleServicesFile = process.env.GOOGLE_SERVICES_JSON;
} else {
  AndroidGoogleServicesFile = process.env.GOOGLE_SERVICES_JSON;
}

module.exports = {
  expo: {
    name: "ScoreCard",
    slug: "ScoreCard",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/logo.png",
    scheme: "myapp",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/logo.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/logo.png",
        backgroundColor: "#ffffff",
      },
      googleServicesFile: AndroidGoogleServicesFile,
      package: "com.vndpal.ScoreCard",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/logo.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-build-properties",
        {
          android: {
            buildToolsVersion: "35.0.0",
            compileSdkVersion: 34,
            targetSdkVersion: 35,
            // Ensure compatibility with devices using 16KB memory pages
            // NDK r26+ sets appropriate linker flags for 16KB page support
            ndkVersion: "26.1.10909125",
            // Explicitly set minSdk to 23+ (required by modern NDK/toolchains)
            minSdkVersion: 23,
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: "a1bad669-b66a-4e6d-98e4-e9efd3472523",
      },
    },
  },
};

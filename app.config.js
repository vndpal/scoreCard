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
      image: "./assets/images/splash.png",
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
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON || "./google-services.json",
      package: "com.vndpal.ScoreCard",
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    assetBundlePatterns: ["**/*"],
    plugins: [
      "expo-router",
      "expo-font",
      "@react-native-firebase/app",
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
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

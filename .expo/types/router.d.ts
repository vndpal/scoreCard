/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
      StaticRoutes: `/` | `/(tabs)` | `/(tabs)/` | `/(tabs)/explore` | `/(tabs)/menu` | `/_sitemap` | `/createMatch` | `/createPlayer` | `/createTeam` | `/explore` | `/matchSettings` | `/matchSummary` | `/menu` | `/playerRecords` | `/players` | `/settings` | `/teamLineup` | `/toss`;
      DynamicRoutes: `/player/${Router.SingleRoutePart<T>}`;
      DynamicRouteTemplate: `/player/[id]`;
    }
  }
}

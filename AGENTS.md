# Repository Rules

## Push Notification Safety
- **NEVER send test or manual push notifications** (via FCM API, HTTP endpoints, curl commands, test scripts, or app triggers) without explicit prior confirmation and approval from the user.
- Any action that could broadcast a message to real devices or topics (such as `prayer_updates` or any public notification topic) must ALWAYS be paused to obtain user consent first.

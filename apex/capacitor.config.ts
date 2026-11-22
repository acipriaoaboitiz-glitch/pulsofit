import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.apex.fit',
  appName: 'APEX',
  webDir: 'dist',
  backgroundColor: '#07090E',
  android: {
    // keeps the dark splash instead of a white flash on cold start
    backgroundColor: '#07090E',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#07090E',
  },
}

export default config

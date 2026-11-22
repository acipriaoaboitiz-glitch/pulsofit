import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.pulso.fit',
  appName: 'PULSO',
  webDir: 'dist',
  backgroundColor: '#05070B',
  android: {
    // keeps the dark splash instead of a white flash on cold start
    backgroundColor: '#05070B',
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#05070B',
  },
}

export default config

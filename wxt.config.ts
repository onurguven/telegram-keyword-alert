import { defineConfig } from 'wxt';
import { resolve } from 'path';

export default defineConfig({
  modules: ['@wxt-dev/i18n/module', '@wxt-dev/auto-icons'],
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    permissions: ['storage', 'notifications', 'alarms'],
    host_permissions: ['*://web.telegram.org/*'],
    browser_specific_settings: {
      gecko: {
        id: 'telegram-keyword-alert@example.com',
        strict_min_version: '109.0',
        // Firefox data collection disclosure (Nov 2025+)
        // Type not yet in WXT, using assertion
        ...({ data_collection_permissions: { required: ['none'], optional: [] } } as Record<string, unknown>),
      },
    },
  },
  alias: {
    '@': resolve(__dirname),
    '@components': resolve(__dirname, 'components'),
    '@composables': resolve(__dirname, 'composables'),
    '@utils': resolve(__dirname, 'utils'),
  },
});

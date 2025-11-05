/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom', // Changed to jsdom for React components
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true
      }
    }]
  },
  testMatch: [
    '**/__tests__/**/*.(ts|tsx)',
    '**/*.(test|spec).(ts|tsx)'
  ],
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'], // Test setup file
  moduleNameMapping: {
    // Handle CSS imports (mock them)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Handle dynamic imports that might fail in Jest
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  // Mock import.meta for Vite environment variables
  globals: {
    'import.meta': {
      env: {
        VITE_SUPABASE_URL: 'http://localhost:3000',
        VITE_SUPABASE_ANON_KEY: 'test-key',
        MODE: 'test',
        DEV: false
      }
    }
  },
  // Ignore problematic files from coverage collection
  collectCoverageFrom: [
    'src/**/*.(ts|tsx)',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/infrastructure/database/supabase.ts', // Skip due to import.meta issues
    '!src/presentation/components/DebugPanel.tsx' // Skip debug component
  ]
};
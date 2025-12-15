/** @type {import('jest').Config} */
module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',
  
  // Test environment
  testEnvironment: 'node',
  
  // Root directories for tests
  roots: ['<rootDir>/src'],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: false,
      tsconfig: 'tsconfig.json',
    }],
  },
  
  // Setup files to run after Jest is initialized
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/services/**/*.ts',
    '!src/services/index.ts',
    '!src/**/*.d.ts',
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  
  // Coverage output directory
  coverageDirectory: 'coverage',
  
  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Module path aliases (matching tsconfig paths if any)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks automatically between tests
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Test timeout in milliseconds
  testTimeout: 10000,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Maximum number of workers
  maxWorkers: '50%',
  
  // Global setup/teardown
  // globalSetup: '<rootDir>/src/__tests__/globalSetup.ts',
  // globalTeardown: '<rootDir>/src/__tests__/globalTeardown.ts',
};
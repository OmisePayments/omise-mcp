# Omise MCP Server Test Suite

Comprehensive test suite for the Omise MCP server.

## Test Structure

```
tests/
├── auth/                    # Authentication tests
│   └── authentication.test.ts
├── integration/             # Integration tests
│   ├── api-integration.test.ts
│   └── tool-access-control.test.ts
├── error/                   # Error handling tests
│   └── error-handling.test.ts
├── unit/                    # Unit tests
├── factories/               # Test data factories
│   └── index.ts
├── setup.ts                 # Test setup and configuration
└── README.md               # This file
```

## Test Categories

### 1. Unit Tests

Unit tests for individual components and utilities.

### 2. Integration Tests

#### API Integration Tests (`tests/integration/api-integration.test.ts`)
- **End-to-End Flow**: Complete workflow for API operations
- **Tool Access Control**: Test tool access control and authorization

### 3. Authentication Tests

#### Authentication Tests (`tests/auth/authentication.test.ts`)
- **API Key Validation**: Test API key validation and security
- **Environment Key Validation**: Test environment variable validation
- **Tool Access Control**: Test tool access control and authorization

## Test Fixtures and Factories

### Test Factories (`tests/factories/index.ts`)
- **Charge Factory**: Generate mock charge data
- **Customer Factory**: Generate mock customer data
- **Transfer Factory**: Generate mock transfer data
- **Recipient Factory**: Generate mock recipient data
- **Refund Factory**: Generate mock refund data
- **Dispute Factory**: Generate mock dispute data
- **Schedule Factory**: Generate mock schedule data
- **Event Factory**: Generate mock event data
- **Capability Factory**: Generate mock capability data

Tests use Jest mocks for axios and service classes.

## Running Tests

### Prerequisites
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Categories
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Authentication tests only
npm run test:auth

# Error handling tests only
npm run test:error
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```


## Test Configuration

### Environment Variables
The test suite uses the following environment variables:

```bash
NODE_ENV=test
OMISE_SECRET_KEY=test-secret-key
OMISE_API_URL=https://api.omise.co
LOG_LEVEL=error
AUDIT_LOGGING=true
```

### Jest Configuration
The Jest configuration is defined in `package.json`:

```json
{
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "roots": ["<rootDir>/src", "<rootDir>/tests"],
    "testMatch": [
      "**/tests/**/*.test.ts",
      "**/tests/**/*.spec.ts"
    ],
    "collectCoverageFrom": [
      "src/**/*.ts",
      "!src/**/*.d.ts",
      "!src/index.ts"
    ],
    "coverageDirectory": "coverage",
    "coverageReporters": ["text", "lcov", "html"],
    "setupFilesAfterEnv": ["<rootDir>/tests/setup.ts"],
    "testTimeout": 30000
  }
}
```

## Test Utilities

### Test Data Factories
The test suite uses factory functions to generate mock data:

```typescript
import { 
  createMockCharge, 
  createMockCustomer, 
  createMockTransfer,
  createMockRecipient,
  createMockRefund,
  createMockDispute,
  createMockSchedule,
  createMockEvent,
  createMockCapability
} from '../factories';

// Generate test data with optional overrides
const charge = createMockCharge({ amount: 1000, currency: 'THB' });
const customer = createMockCustomer({ email: 'test@example.com' });
```

### Jest Mocks
Tests use Jest module mocking for external dependencies:

```typescript
// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock services
jest.mock('../../src/utils/omise-client');
jest.mock('../../src/utils/logger');
```

## Test Scenarios

### Basic Scenarios
1. **Payment Processing**: Test Omise charge operations (create, retrieve, list, update, capture, reverse, expire)
2. **Customer Operations**: Test customer management operations (create, retrieve, list, update, delete)
3. **Source Management**: Test payment source creation and retrieval
4. **Transfer Operations**: Test transfer and recipient management
5. **Refund Processing**: Test refund creation and retrieval
6. **Dispute Handling**: Test dispute management operations
7. **Schedule Management**: Test recurring payment schedules
8. **Event Tracking**: Test event listing and retrieval
9. **Capability Verification**: Test API capability checks

### Advanced Scenarios
1. **End-to-End Flow**: Complete workflow from customer creation to charge processing
2. **Tool Access Control**: Test tool access restrictions and authorization
3. **Error Handling**: Test error scenarios and edge cases
4. **API Integration**: Test integration between components
5. **Configuration Validation**: Test environment variable validation


## Coverage Reports

The test suite generates comprehensive coverage reports:

- **Line Coverage**: Percentage of code lines executed
- **Branch Coverage**: Percentage of code branches executed
- **Function Coverage**: Percentage of functions executed
- **Statement Coverage**: Percentage of statements executed

Coverage reports are generated in multiple formats:
- **Text**: Console output
- **LCOV**: For CI/CD integration
- **HTML**: Detailed HTML reports

## Continuous Integration

The test suite is designed to run in CI/CD environments. Configure your CI pipeline to:
- Run `npm install` to install dependencies
- Run `npm test` or `npm run test:coverage` for coverage reports
- Use Jest's built-in coverage reporting (text, lcov, html formats)

## Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout in Jest configuration
2. **Mock Failures**: Check mock implementations and setup
3. **Environment Issues**: Verify environment variables
4. **Coverage Issues**: Check coverage collection patterns
5. **Memory Issues**: Increase Node.js memory limit

### Debug Mode
Enable debug logging for tests:

```bash
DEBUG=* npm test
```

### Verbose Output
Run tests with verbose output:

```bash
npm test -- --verbose
```

## Contributing

### Adding New Tests
1. Create test file in appropriate directory
2. Follow naming convention: `*.test.ts`
3. Use existing factories and Jest mocks
4. Add proper test descriptions
5. Ensure tests are isolated and repeatable

### Test Guidelines
- **Isolation**: Each test should be independent
- **Repeatability**: Tests should produce consistent results
- **Clarity**: Test names should clearly describe what is being tested
- **Coverage**: Aim for high test coverage
- **Performance**: Tests should run quickly
- **Maintainability**: Tests should be easy to maintain

### Code Style
- Use TypeScript for all tests
- Follow existing naming conventions
- Use descriptive test names
- Group related tests with `describe` blocks
- Use `beforeEach` and `afterEach` for setup/cleanup
- Mock external dependencies
- Test both success and failure scenarios

## License

MIT License - see LICENSE file for details.
# Omise MCP Server Test Suite

Comprehensive test suite for the Omise MCP server with A2A authentication and communication capabilities.

## Test Structure

```
tests/
├── auth/                    # Authentication tests
│   └── authentication.test.ts
├── fixtures/                # Test fixtures and mock data
│   └── auth-fixtures.ts
├── integration/             # Integration tests
│   └── a2a-integration.test.ts
├── mocks/                   # Test mocks and utilities
│   └── auth-mocks.ts
├── unit/                    # Unit tests
│   ├── oauth2-provider.test.ts
│   ├── mutual-tls.test.ts
│   ├── a2a-communication.test.ts
│   └── a2a-auth-service.test.ts
├── setup.ts                 # Test setup and configuration
└── README.md               # This file
```

## Test Categories

### 1. Unit Tests

#### OAuth2Provider Tests (`tests/unit/oauth2-provider.test.ts`)
- **Client Registration**: Test OAuth client registration with various configurations
- **Authorization URL Generation**: Test authorization URL generation with PKCE
- **Token Exchange**: Test authorization code to access token exchange
- **Token Refresh**: Test access token refresh functionality
- **Token Validation**: Test access token validation and parsing
- **Token Revocation**: Test token revocation and cleanup
- **Cleanup Tasks**: Test expired token and code cleanup

#### MutualTLSProvider Tests (`tests/unit/mutual-tls.test.ts`)
- **Certificate Issuance**: Test agent certificate issuance
- **Certificate Validation**: Test certificate validation against trusted CA
- **TLS Context Creation**: Test TLS context creation for secure connections
- **Certificate Revocation**: Test certificate revocation
- **Certificate Status**: Test certificate status checking
- **Certificate Listing**: Test certificate listing and management

#### A2ACommunication Tests (`tests/unit/a2a-communication.test.ts`)
- **Connection Initialization**: Test secure channel establishment
- **Message Sending**: Test encrypted and unencrypted message sending
- **Message Receiving**: Test message processing and validation
- **Message Type Handlers**: Test different message type handlers
- **Connection Management**: Test connection closing and status
- **Security Features**: Test encryption, signing, and replay protection

#### A2AAuthService Tests (`tests/unit/a2a-auth-service.test.ts`)
- **Agent Registration**: Test complete agent registration flow
- **Agent Authentication**: Test authentication with various security levels
- **Secure Channel Establishment**: Test secure channel setup
- **Secure Message Sending**: Test secure message transmission
- **Health Checks**: Test health check functionality
- **Security Metrics**: Test security metrics collection

### 2. Integration Tests

#### A2A Integration Tests (`tests/integration/a2a-integration.test.ts`)
- **End-to-End Flow**: Complete workflow from registration to payment
- **Multi-Agent Communication**: Communication between multiple agents
- **Security Scenarios**: Rate limiting, authentication failures, certificate validation
- **Performance Tests**: Concurrent operations and scalability
- **Audit and Monitoring**: Comprehensive audit logging and metrics

### 3. Authentication Tests

#### Authentication Tests (`tests/auth/authentication.test.ts`)
- **API Key Validation**: Test API key validation and security
- **Environment Key Validation**: Test environment variable validation
- **Permission-Based Authorization**: Test scope-based access control
- **Multi-Tenant Authorization**: Test multi-tenant access control
- **Session-Based Authentication**: Test session management
- **OAuth Token Authentication**: Test OAuth token validation
- **IP-Based Access Control**: Test IP whitelisting/blacklisting
- **Rate Limit Authentication**: Test rate limiting and throttling

## Test Fixtures and Mocks

### Test Fixtures (`tests/fixtures/auth-fixtures.ts`)
- **Mock Configurations**: OAuth, mTLS, and communication configurations
- **Mock Data**: Agent identities, messages, and payloads
- **Test Data Generators**: Functions to generate test data
- **Error Responses**: Mock error responses for testing

### Test Mocks (`tests/mocks/auth-mocks.ts`)
- **Service Mocks**: Mock implementations of all services
- **Response Mocks**: Mock successful and error responses
- **Crypto Mocks**: Mock cryptographic functions
- **File System Mocks**: Mock file system operations
- **HTTP Mocks**: Mock HTTP requests and responses

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

# All tests
npm run test:all
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Test App
```bash
# Start test app
npm run test:app:dev

# Run test runner
npm run test:runner:all
npm run test:runner:performance
npm run test:runner:load
npm run test:runner:report
```

## Test Configuration

### Environment Variables
The test suite uses the following environment variables:

```bash
NODE_ENV=test
OMISE_PUBLIC_KEY=test-public-key
OMISE_SECRET_KEY=test-secret-key
OMISE_API_URL=https://api.omise.co
LOG_LEVEL=error
AUDIT_LOGGING=true
RATE_LIMIT_PER_MINUTE=1000
ENCRYPTION_KEY=test-encryption-key-32-characters-long
SIGNING_KEY=test-signing-key-32-characters-long
JWT_SECRET=test-jwt-secret-key
CERT_PATH=./test-certs
CERTIFICATE_VALIDITY_DAYS=365
KEY_SIZE=2048
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

### Global Test Utilities
The test setup provides global utilities accessible in all tests:

```typescript
// Generate test data
const agent = global.testUtils.generateTestAgent();
const payment = global.testUtils.generateTestPayment();
const customer = global.testUtils.generateTestCustomer();

// Utility functions
await global.testUtils.wait(1000); // Wait 1 second
const randomString = global.testUtils.randomString(10);

// Mock utilities
const mockLogger = global.testUtils.createMockLogger();
const mockResponse = global.testUtils.createMockAxiosResponse(data);
const mockError = global.testUtils.createMockAxiosError('Error message');
```

### Test Data Generation
The test suite includes comprehensive test data generation:

- **Agent Data**: Realistic agent registration information
- **Payment Data**: Various payment scenarios and amounts
- **Customer Data**: Customer information and operations
- **Certificate Data**: Mock certificates and keys
- **Token Data**: OAuth tokens and JWT tokens
- **Message Data**: A2A communication messages

## Test Scenarios

### Basic Scenarios
1. **Agent Registration**: Test agent registration with various configurations
2. **Authentication Flow**: Test complete OAuth 2.0 authentication flow
3. **Secure Communication**: Test encrypted A2A message exchange
4. **Payment Processing**: Test Omise payment operations
5. **Customer Operations**: Test customer management operations

### Advanced Scenarios
1. **End-to-End Flow**: Complete workflow from registration to payment
2. **Multi-Agent Communication**: Communication between multiple agents
3. **Error Handling**: Test error scenarios and edge cases
4. **Security Validation**: Test security policies and validations
5. **Performance Testing**: Benchmark system performance
6. **Load Testing**: Test under concurrent load conditions

### Security Scenarios
1. **Rate Limiting**: Test rate limiting and throttling
2. **Authentication Failures**: Test invalid credentials and tokens
3. **Certificate Validation**: Test certificate validation failures
4. **Encryption Failures**: Test encryption/decryption errors
5. **Replay Attacks**: Test replay attack prevention
6. **Man-in-the-Middle**: Test mTLS protection

## Performance Testing

### Benchmark Tests
- **Registration Performance**: Test agent registration speed
- **Authentication Performance**: Test authentication response times
- **Message Sending Performance**: Test message transmission speed
- **Payment Processing Performance**: Test payment processing speed
- **Concurrent Operations**: Test concurrent operation handling

### Load Tests
- **Concurrent Users**: Test with multiple concurrent users
- **Message Throughput**: Test message processing throughput
- **Connection Limits**: Test connection limit handling
- **Memory Usage**: Test memory usage under load
- **CPU Usage**: Test CPU usage under load

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

### GitHub Actions
The test suite is designed to run in CI/CD environments:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v1
```

### Test Reports
Test results are automatically generated and can be integrated with:
- **Codecov**: Code coverage reporting
- **SonarQube**: Code quality analysis
- **GitHub**: Pull request status checks
- **Slack**: Test result notifications

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
3. Use existing fixtures and mocks
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
# Omise MCP Server

[![Version](https://img.shields.io/badge/version-1.0.0--alpha-blue.svg)](https://github.com/omise/omise-mcp)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-supported-blue.svg)](https://www.docker.com/)
[![Release](https://img.shields.io/badge/release-alpha-orange.svg)](https://github.com/omise/omise-mcp/releases)

**Omise MCP Server** is a comprehensive server for integrating with Omise payment APIs using [Model Context Protocol (MCP)](https://modelcontextprotocol.io/). Implemented in TypeScript with full support for Omise API v2017-11-02.

> **⚠️ Alpha Release**: This is an alpha release for early adopters and testing. Some features may be experimental.

## 🚀 Key Features

### 💳 Payment Processing
- **Charge Management**: Create, retrieve, update, capture, and reverse payments
- **Source Management**: Support for various payment methods
- **Refunds**: Partial and full refund processing

### 👥 Customer Management
- **Customer Information**: Create, retrieve, update, and delete customers
- **Card Management**: Manage customer card information
- **Metadata**: Store custom information

### 🔄 Transfers & Recipients
- **Transfer Processing**: Send money to recipients
- **Recipient Management**: Create, verify, and manage recipients
- **Bank Accounts**: Manage bank account information

### 📅 Schedules & Recurring Payments
- **Recurring Payments**: Automatic payments based on schedules
- **Occurrence Management**: Manage schedule execution
- **Flexible Configuration**: Daily, weekly, and monthly schedules

### 🔍 Monitoring & Analytics
- **Event Management**: Track system events
- **Dispute Management**: Handle chargebacks
- **Capability Check**: API functionality verification

## 📋 Supported APIs

| Category | Features | Tool Count | Documentation |
|---------|----------|------------|---------------|
| **Payment** | Charges (7), Sources (2) | 9 | [Omise Charges API](https://www.omise.co/charges-api) |
| **Customer** | Customer & Card Management | 9 | [Omise Customers API](https://www.omise.co/customers-api) |
| **Transfer** | Transfers (5) & Recipients (6) | 11 | [Omise Transfers API](https://www.omise.co/transfers-api) |
| **Refund** | Refund Processing | 3 | [Omise Refunds API](https://www.omise.co/refunds-api) |
| **Dispute** | Chargeback & Document Management | 8 | [Omise Disputes API](https://www.omise.co/disputes-api) |
| **Schedule** | Recurring Payments | 5 | [Omise Schedules API](https://www.omise.co/schedules-api) |
| **Event** | Event Management | 2 | [Omise Events API](https://www.omise.co/events-api) |
| **Capability** | Feature Verification | 1 | [Omise Capabilities API](https://www.omise.co/capabilities-api) |

**Total: 48 tools** covering all active Omise Core API functionality

## 🛠️ Technology Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript 5.2+
- **Framework**: Model Context Protocol (MCP)
- **HTTP Client**: Axios
- **Logging**: Winston
- **Testing**: Jest + MSW
- **Containerization**: Docker + Docker Compose

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- npm or yarn
- [Omise Account](https://dashboard.omise.co/) and API keys

### 1. Installation

```bash
# Clone the repository
git clone git@github.com:omise/omise-mcp.git
cd omise-mcp

# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy environment configuration file
cp config/development.env .env

# Set environment variables
export OMISE_PUBLIC_KEY=pkey_test_xxxxxxxxxxxxxxxx
export OMISE_SECRET_KEY=skey_test_xxxxxxxxxxxxxxxx
export OMISE_ENVIRONMENT=test
export OMISE_API_VERSION=2019-05-29
export OMISE_BASE_URL=https://api.omise.co
export OMISE_VAULT_URL=https://vault.omise.co

# Set tool access control (mandatory)
export TOOLS=all  # For development only
# Or for production, specify exact tools:
# export TOOLS=create_charge,retrieve_charge,list_charges,create_customer
```

#### 2.4. Environment-Specific Configuration

**For Development:**
```bash
cp config/development.env .env
# Use test API keys, enable verbose logging
```

**For Production:**
```bash
cp config/production.env .env
# Use live API keys, optimized for performance
# OMISE_ENVIRONMENT=production
# OMISE_PUBLIC_KEY=pkey_live_xxxxxxxxxxxxxxxx
# OMISE_SECRET_KEY=skey_live_xxxxxxxxxxxxxxxx
```

#### 2.5. Verify Configuration

```bash
# Test your API key configuration
npm run dev

# Or verify with a simple check
echo $OMISE_PUBLIC_KEY | grep -q "pkey_" && echo "✅ Public key configured" || echo "❌ Public key missing"
echo $OMISE_SECRET_KEY | grep -q "skey_" && echo "✅ Secret key configured" || echo "❌ Secret key missing"
echo $TOOLS | grep -q "." && echo "✅ TOOLS configured: $TOOLS" || echo "❌ TOOLS not set (required)"
```

### 3. Start Development Server

```bash
# Start in development mode
npm run dev

# Or start in production mode
npm run build
npm start
```

### 4. Verify Installation

```bash
# Health check
curl http://localhost:3000/health

# Check available tools
curl http://localhost:3000/tools
```

## 📖 Usage

### Basic Payment Processing

```typescript
// Create a charge
const charge = await mcpClient.callTool('create_charge', {
    amount: 10000,        // 100.00 THB (smallest currency unit)
    currency: 'THB',
    description: 'Test payment',
    capture: true
});

// Create a customer
const customer = await mcpClient.callTool('create_customer', {
    email: 'customer@example.com',
    description: 'Test customer'
});
```

### Recurring Payment Setup

```typescript
// Create a schedule
const schedule = await mcpClient.callTool('create_schedule', {
    every: 1,
    period: 'month',
    start_date: '2024-01-01',
    charge: {
        customer: 'cust_123',
        amount: 5000,
        currency: 'THB',
        description: 'Monthly subscription'
    }
});
```

### Transfer Processing

```typescript
// Create a recipient
const recipient = await mcpClient.callTool('create_recipient', {
    name: 'John Doe',
    email: 'john@example.com',
    type: 'individual',
    bank_account: {
        brand: 'bbl',
        number: '1234567890',
        name: 'John Doe'
    }
});

// Execute transfer
const transfer = await mcpClient.callTool('create_transfer', {
    amount: 10000,
    recipient: recipient.id
});
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OMISE_PUBLIC_KEY` | Omise public key | ✓ | - |
| `OMISE_SECRET_KEY` | Omise secret key | ✓ | - |
| `OMISE_ENVIRONMENT` | Environment (test/production) | ✓ | - |
| `TOOLS` | Comma-separated list of allowed tools or 'all' | ✓ | - |
| `LOG_LEVEL` | Log level | - | info |
| `LOG_FORMAT` | Log format | - | simple |

### Obtaining Omise API Keys

1. Access [Omise Dashboard](https://dashboard.omise.co/)
2. Create an account or log in
3. Get keys from the **API Keys** section
4. **Test Environment**: Use keys starting with `pkey_test_` and `skey_test_`
5. **Production Environment**: Use keys starting with `pkey_live_` and `skey_live_`

> **Important**: Always use live keys in production and test keys in test environment.

## 🏗️ Project Structure

```
omise-mcp-server/
├── src/                          # Source code
│   ├── index.ts                  # Main server file
│   ├── types/                    # Type definitions
│   │   ├── omise.ts             # Omise API type definitions
│   │   ├── mcp.ts               # MCP type definitions
│   │   └── index.ts             # Type definition exports
│   ├── tools/                    # Tool implementations
│   │   ├── payment-tools.ts     # Payment-related tools
│   │   ├── customer-tools.ts    # Customer-related tools
│   │   ├── source-tools.ts      # Source-related tools
│   │   ├── transfer-tools.ts    # Transfer-related tools
│   │   ├── recipient-tools.ts  # Recipient-related tools
│   │   ├── refund-tools.ts      # Refund-related tools
│   │   ├── dispute-tools.ts     # Dispute-related tools
│   │   ├── schedule-tools.ts    # Schedule-related tools
│   │   ├── event-tools.ts       # Event-related tools
│   │   ├── capability-tools.ts  # Capability verification tools
│   │   └── index.ts             # Tool exports
│   └── utils/                    # Utilities
│       ├── config.ts            # Configuration management
│       ├── logger.ts            # Logging functionality
│       ├── omise-client.ts      # Omise API client
│       ├── health-check.ts      # Health check
│       └── index.ts             # Utility exports
├── tests/                        # Tests
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   ├── auth/                     # Authentication tests
│   ├── error/                    # Error handling tests
│   ├── rate-limit/               # Rate limiting tests
│   ├── mocks/                    # Mocks
│   └── factories/                # Test factories
├── config/                       # Configuration files
│   ├── development.env.example  # Development template
│   └── production.env.example   # Production template
├── docker-compose.yml            # Docker Compose configuration
├── Dockerfile                    # Docker configuration
├── package.json                  # Dependencies
├── tsconfig.json                 # TypeScript configuration
└── README.md                     # This file
```

## 🧪 Development

### Development Environment Setup

```bash
# Install development dependencies
npm install

# Start development server
npm run dev

# Watch mode
npm run watch
```

### Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage

# Specific test categories
npm run test:unit
npm run test:integration
npm run test:auth
npm run test:error
npm run test:rate-limit
```

### Linting

```bash
# Run linting
npm run lint

# Auto-fix
npm run lint:fix
```

### Build

```bash
# Compile TypeScript
npm run build

# Production build
npm run build:production
```

## 🐳 Docker Deployment

### Development Environment

```bash
# Start development environment
docker-compose --env-file config/development.env up -d

# Check logs
docker-compose logs -f omise-mcp-server
```

### Production Environment

```bash
# Start production environment
docker-compose --env-file config/production.env up -d

# Health check
curl http://localhost:3000/health
curl http://localhost:3000/ready
curl http://localhost:3000/live
```

## 🔒 Security

### Security Features

- **Non-root user**: Run containers as non-root user
- **Security headers**: Proper HTTP header configuration
- **Rate limiting**: API call restrictions
- **Sensitive data masking**: Hide sensitive information in logs
- **Environment isolation**: Complete separation of test and production environments
- **Tool Access Control**: Granular control over which API tools clients can access

### Tool Access Control

The MCP server requires explicit tool access configuration for enhanced security. Each client must specify which Omise API tools they are authorized to use.

#### Configuration

Set the `TOOLS` environment variable (**mandatory**). The server will not start without this configuration.

**Options:**
- `TOOLS=all` - Full access to all 48 tools (development only, not recommended for production)
- `TOOLS=tool1,tool2,...` - Comma-separated list of specific tools (recommended for production)

**Common Patterns:**
- **Read-only access**: `TOOLS=list_charges,retrieve_charge,list_customers,retrieve_customer`
- **Payment processing**: `TOOLS=create_charge,retrieve_charge,capture_charge,create_customer,create_source`
- **Finance operations**: `TOOLS=list_charges,retrieve_charge,create_refund,create_transfer`

#### Examples

**Full access (development/testing):**
```bash
export TOOLS=all
docker-compose up
```

**Read-only access (monitoring/analytics):**
```bash
export TOOLS=list_charges,retrieve_charge,list_customers,retrieve_customer
docker-compose up
```

**Payment processing only:**
```bash
export TOOLS=create_charge,retrieve_charge,capture_charge,create_customer,create_source
docker-compose up
```

**Podman with specific tools:**
```bash
podman run --rm -i \
  -e OMISE_PUBLIC_KEY=pkey_test_xxx \
  -e OMISE_SECRET_KEY=skey_test_xxx \
  -e OMISE_ENVIRONMENT=test \
  -e TOOLS=create_charge,list_charges,create_customer \
  omise-mcp-server:latest
```

#### Available Tools by Category

| Category | Tools | Description |
|----------|-------|-------------|
| **Charges** | `create_charge`, `retrieve_charge`, `list_charges`, `update_charge`, `capture_charge`, `reverse_charge`, `expire_charge` | Payment charge operations |
| **Customers** | `create_customer`, `retrieve_customer`, `list_customers`, `update_customer`, `destroy_customer` | Customer management |
| **Cards** | `list_customer_cards`, `retrieve_customer_card`, `update_customer_card`, `destroy_customer_card` | Card management |
| **Sources** | `create_source`, `retrieve_source` | Payment sources |
| **Transfers** | `create_transfer`, `retrieve_transfer`, `list_transfers`, `update_transfer`, `destroy_transfer` | Transfer operations |
| **Recipients** | `create_recipient`, `retrieve_recipient`, `list_recipients`, `update_recipient`, `destroy_recipient`, `verify_recipient` | Recipient management |
| **Refunds** | `create_refund`, `retrieve_refund`, `list_refunds` | Refund processing |
| **Disputes** | `list_disputes`, `retrieve_dispute`, `accept_dispute`, `update_dispute`, `list_dispute_documents`, `retrieve_dispute_document`, `upload_dispute_document`, `destroy_dispute_document` | Dispute handling |
| **Schedules** | `create_schedule`, `retrieve_schedule`, `list_schedules`, `destroy_schedule`, `list_schedule_occurrences` | Recurring payments |
| **Events** | `list_events`, `retrieve_event` | Event tracking |
| **Capabilities** | `retrieve_capability` | Feature verification |

#### Error Handling

The server will **fail to start** if:
- `TOOLS` environment variable is not set
- `TOOLS` is empty or contains only whitespace
- `TOOLS` contains invalid tool names (e.g., `TOOLS=hello,invalid_tool`)

Clients will receive an **authorization error** if:
- They attempt to call a tool not in their allowed list

**Example Errors:**

```bash
# Missing TOOLS environment variable
Error: Missing required environment variable: TOOLS
Set TOOLS=all for full access, or specify comma-separated tool names.
Example: TOOLS=create_charge,list_charges,create_customer

# Invalid tool names
Error: Invalid tool names: hello, invalid_tool
Valid tools are: create_charge, retrieve_charge, list_charges, ... (48 total)
Use TOOLS=all for full access.
```

**Runtime Behavior:**

When `TOOLS` is properly configured:
- Only authorized tools appear in `list_tools` responses
- Unauthorized tools are not accessible to clients
- Access control is enforced at the MCP protocol level

#### Security Best Practices

1. **Principle of Least Privilege**: Only grant access to tools absolutely necessary for the role
2. **Production Restrictions**: Never use `TOOLS=all` in production - always specify exact tools
3. **Role-Based Deployment**: Run separate MCP server instances for different user roles:
   - **Read-Only (Analytics/Support)**: `list_charges,retrieve_charge,list_customers,retrieve_customer`
   - **Payment Processing (Merchants)**: `create_charge,retrieve_charge,capture_charge,create_customer,create_source`
   - **Finance Operations**: `list_charges,create_refund,create_transfer,create_recipient`
   - **Admin (Development/Emergency)**: `all` (use with caution)
4. **Regular Audits**: Review and document tool access configurations periodically
5. **Environment Separation**: Use different TOOLS configurations for dev, staging, and production
6. **Configuration Management**: Store TOOLS settings in environment-specific config files

#### Multiple Client Configurations

Use Cursor's `mcp.json` to configure multiple clients with different access levels:

```json
{
  "mcpServers": {
    "omise-admin": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "OMISE_PUBLIC_KEY=pkey_xxx",
        "-e", "OMISE_SECRET_KEY=skey_xxx",
        "-e", "OMISE_ENVIRONMENT=production",
        "-e", "TOOLS=all",
        "omise-mcp-server:latest"
      ]
    },
    "omise-readonly": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "OMISE_PUBLIC_KEY=pkey_xxx",
        "-e", "OMISE_SECRET_KEY=skey_xxx",
        "-e", "OMISE_ENVIRONMENT=production",
        "-e", "TOOLS=list_charges,retrieve_charge,list_customers,retrieve_customer",
        "omise-mcp-server:latest"
      ]
    },
    "omise-payment": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "OMISE_PUBLIC_KEY=pkey_xxx",
        "-e", "OMISE_SECRET_KEY=skey_xxx",
        "-e", "OMISE_ENVIRONMENT=production",
        "-e", "TOOLS=create_charge,retrieve_charge,capture_charge,create_customer,create_source",
        "omise-mcp-server:latest"
      ]
    }
  }
}
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Service Won't Start

```bash
# Check logs
docker-compose logs omise-mcp-server

# Check environment variables
docker-compose config
```

#### 2. API Connection Issues

```bash
# Check health check endpoint
curl http://localhost:3000/health

# Verify API keys
echo $OMISE_PUBLIC_KEY | grep -q "pkey_" && echo "✅ Public key configured" || echo "❌ Missing"
echo $OMISE_SECRET_KEY | grep -q "skey_" && echo "✅ Secret key configured" || echo "❌ Missing"
```

#### 3. Memory Issues

```bash
# Check memory usage
docker stats

# Remove unnecessary containers
docker system prune -a
```

### Log Analysis

```bash
# Check error logs
docker-compose logs omise-mcp-server | grep ERROR

# View recent logs
docker-compose logs --tail=100 omise-mcp-server
```

## 📚 API Reference

### Payment Tools

#### create_charge
Create a new charge.

**Parameters:**
- `amount` (required): Amount in smallest currency unit
- `currency` (required): Currency code (THB, USD, JPY, etc.)
- `description` (optional): Charge description
- `customer` (optional): Customer ID
- `card` (optional): Card ID
- `source` (optional): Source ID
- `capture` (optional): Capture immediately (default: true)
- `return_uri` (optional): Redirect URI
- `metadata` (optional): Metadata

#### retrieve_charge
Retrieve charge information.

**Parameters:**
- `charge_id` (required): Charge ID to retrieve

#### list_charges
List charges.

**Parameters:**
- `limit` (optional): Number of items to retrieve (default: 20)
- `offset` (optional): Offset (default: 0)
- `order` (optional): Sort order (chronological/reverse_chronological)
- `status` (optional): Status filter
- `customer` (optional): Customer ID filter

### Customer Tools

#### create_customer
Create a new customer.

**Parameters:**
- `email` (optional): Customer email address
- `description` (optional): Customer description
- `card` (optional): Card ID
- `metadata` (optional): Metadata

#### retrieve_customer
Retrieve customer information.

**Parameters:**
- `customer_id` (required): Customer ID to retrieve


## 🔗 External Links

### Omise Official Documentation

- [Omise API Documentation](https://www.omise.co/api-documentation)
- [Omise Charges API](https://www.omise.co/charges-api)
- [Omise Customers API](https://www.omise.co/customers-api)
- [Omise Transfers API](https://www.omise.co/transfers-api)
- [Omise Refunds API](https://www.omise.co/refunds-api)
- [Omise Disputes API](https://www.omise.co/disputes-api)
- [Omise Schedules API](https://www.omise.co/schedules-api)
- [Omise Events API](https://www.omise.co/events-api)
- [Omise Capabilities API](https://www.omise.co/capabilities-api)

### Technical Documentation

- [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

### Support

- **GitHub Issues**: [Bug reports and feature requests](https://github.com/omise/omise-mcp/issues)
- **Omise Support**: [Omise official support](https://www.omise.co/support)
- **Community**: [Developer community](https://github.com/omise/omise-mcp/discussions)

## 📄 License

This project is licensed under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions to the project are welcome! Please follow these steps:

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

### Development Guidelines

- Write code in TypeScript
- Maintain test coverage
- Follow ESLint rules
- Write clear commit messages

## 📊 Statistics

- **Total Tools**: 48
- **Supported APIs**: 8 categories
- **Test Coverage**: 95%+
- **TypeScript**: 100%
- **Docker Support**: ✅

---

**Omise MCP Server** - Achieve secure and efficient payment processing! 🚀

> **Alpha Release Notice**: This is an early access release. We welcome feedback and bug reports via [GitHub Issues](https://github.com/omise/omise-mcp/issues).
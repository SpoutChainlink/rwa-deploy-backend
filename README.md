# Token Equity Backend

A NestJS-based backend service for Real World Asset (RWA) equity trading, integrating blockchain technology with traditional financial markets through Alpaca Markets API.

## 🚀 Overview

This application serves as a bridge between traditional finance and Web3, enabling tokenized equity trading through smart contracts while maintaining reserves tracking and real-time market data integration.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Major Modules](#major-modules)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Testing](#testing)

## ✨ Features

- **Tokenized Asset Trading**: Buy/sell orders for tokenized equity assets
- **Real-time Market Data**: Integration with Alpaca Markets for live stock quotes
- **Blockchain Integration**: Web3 smart contract interaction using Ethers.js
- **Event Monitoring**: Real-time blockchain event listening and processing
- **Reserve Management**: Track and manage asset reserves across different tokens
- **API Security**: API key-based authentication middleware
- **Database Integration**: Supabase for persistent data storage
- **Comprehensive API Documentation**: Auto-generated Swagger/OpenAPI docs

## 🏗️ Architecture

The application follows a modular NestJS architecture with the following key components:

```
src/
├── alpaca/          # Alpaca Markets API integration
├── orders/          # Order processing and management
├── reserves/        # Asset reserves tracking
├── supabase/        # Database service layer
├── web3/            # Blockchain integration and event listening
└── shared/          # Common utilities, models, and middleware
```

## 🔧 Major Modules

### 1. **Orders Module** (`/src/orders/`)
- **Purpose**: Handles buy/sell order processing for tokenized assets
- **Key Features**:
  - Buy order processing with reserve increases
  - Sell order processing with reserve decreases
  - Order validation and transformation
  - Integration with blockchain smart contracts

### 2. **Alpaca Module** (`/src/alpaca/`)
- **Purpose**: Integration with Alpaca Markets API for real-time stock market data
- **Key Features**:
  - Latest stock quotes retrieval
  - Multi-symbol quote requests
  - Real-time market data streaming
  - Financial data normalization

### 3. **Reserves Module** (`/src/reserves/`)
- **Purpose**: Asset reserve management and tracking
- **Key Features**:
  - Individual asset reserve queries
  - Total reserves calculation across all assets
  - Reserve balance validation
  - Historical reserve tracking

### 4. **Web3 Module** (`/src/web3/`)
- **Purpose**: Blockchain integration and smart contract interaction
- **Key Features**:
  - **Event Listener Service**: Real-time blockchain event monitoring
  - **Token Service**: ERC-3643 token contract interactions
  - **Provider Factory**: Web3 provider management (HTTP/WebSocket)
  - Smart contract ABI integration

### 5. **Supabase Module** (`/src/supabase/`)
- **Purpose**: Database operations and data persistence
- **Key Features**:
  - Asset reserve CRUD operations
  - Database connection management
  - Data validation and error handling
  - Backup and recovery support

### 6. **Shared Module** (`/src/shared/`)
- **Purpose**: Common utilities, models, and middleware
- **Components**:
  - **Models**: TypeScript interfaces and DTOs
  - **Middleware**: API key authentication
  - **ABI**: Smart contract Application Binary Interfaces
  - **Network**: Blockchain network configuration

## 🛠️ Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd token-equity-backend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables** (see [Configuration](#configuration))

4. **Start the development server**:
```bash
npm run dev
```

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Blockchain RPC Configuration
RPC_HTTP=<your-ethereum-rpc-http-endpoint>
RPC_WSS=<your-ethereum-rpc-websocket-endpoint>

# Supabase Configuration
SUPABASE_KEY=<your-supabase-api-key>

# Alpaca Markets API
APCA_API_KEY_ID=<your-alpaca-api-key-id>
APCA_API_SECRET_KEY=<your-alpaca-secret-key>

# API Security
API_KEY=<your-custom-api-key>
```

## 📚 API Documentation

The API documentation is automatically generated using Swagger/OpenAPI and is available at:

```
http://localhost:4200/api
```

### Main Endpoints:

- **Orders**: `/orders/buy`, `/orders/sell`
- **Reserves**: `/reserves/:assetSymbol`, `/reserves/total`
- **Market Data**: `/alpaca/quotes/latest`

### Authentication:
All endpoints require an API key passed in the `x-api-key` header.

## 🔧 Development

### Available Scripts:

```bash
# Development
npm run dev          # Start with hot reload
npm run start        # Start production build
npm run start:debug  # Start with debugging

# Building
npm run build        # Build the application

# Code Quality
npm run lint         # Run ESLint
npm run format       # Format code with Prettier

# Testing
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:cov     # Run tests with coverage
npm run test:e2e     # Run end-to-end tests
```

### Project Structure:
- **Controllers**: Handle HTTP requests and responses
- **Services**: Contain business logic and external API interactions
- **Modules**: Organize related components together
- **Models**: Define data structures and validation rules
- **Middleware**: Handle cross-cutting concerns like authentication

## 🧪 Testing

The project uses Jest for testing with the following setup:

- **Unit Tests**: Test individual components and services
- **Integration Tests**: Test module interactions
- **E2E Tests**: Test complete user workflows

Run tests with:
```bash
npm run test
```

## 🛡️ Security

- **API Key Authentication**: All endpoints protected with API key middleware
- **Input Validation**: Class-validator for request validation
- **CORS Configuration**: Properly configured cross-origin requests
- **Environment Variables**: Sensitive data stored in environment variables

## 🔗 Dependencies

### Core Technologies:
- **NestJS**: Progressive Node.js framework
- **Ethers.js**: Ethereum library for blockchain interaction
- **Supabase**: Database and backend services
- **Axios**: HTTP client for external API calls

### Development Tools:
- **TypeScript**: Type-safe JavaScript
- **Swagger**: API documentation
- **Jest**: Testing framework
- **ESLint & Prettier**: Code quality and formatting

## 📄 License

This project is licensed under UNLICENSED.

---

**Note**: This is a private project for tokenized equity trading. Ensure all environment variables are properly configured before deployment.
# Decentralized File Sharing System

A secure, decentralized file sharing platform built on the Stacks blockchain with Gaia storage integration. This system allows users to upload, encrypt, and share files while maintaining full control over access permissions through smart contracts.

## ✅ Project Status

**COMPLETED FOUNDATION** - The core infrastructure is ready for development and testing:

### ✅ Smart Contracts (Clarity)
- ✅ **file-registry.clar** - Complete file metadata and ownership management
- ✅ **file-access-control.clar** - Complete access permission system
- ✅ Contract compilation verified with `clarinet check`
- ✅ Interactive testing available via `clarinet console`

### ✅ Frontend Application (React)
- ✅ **Modern React setup** with Vite and Tailwind CSS
- ✅ **Stacks Connect integration** for wallet authentication
- ✅ **File upload component** with encryption utilities
- ✅ **File browser component** for managing files
- ✅ **Gaia storage integration** for decentralized file storage
- ✅ **Production build** successfully tested

### ✅ Project Structure
- ✅ **Complete folder organization** with contracts and frontend
- ✅ **Configuration files** for development and production
- ✅ **Documentation** with setup and usage instructions
- ✅ **Git configuration** with appropriate .gitignore

## 🌟 Features

- **Decentralized Storage**: Files are stored on Gaia, Stacks' decentralized storage system
- **Blockchain-based Access Control**: Smart contracts manage file ownership and access permissions
- **Client-side Encryption**: Files are encrypted before upload for maximum security
- **Wallet Integration**: Seamless authentication using Stacks Connect
- **File Sharing**: Grant and revoke access to files with granular permissions
- **Public/Private Files**: Choose whether files are publicly accessible or private

## 🏗️ Architecture

### Smart Contracts (Clarity)
- **file-registry.clar**: Manages file metadata, ownership, and basic operations
- **file-access-control.clar**: Handles access permissions, sharing, and access requests

### Frontend (React)
- **React + Vite**: Modern frontend framework with fast development
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Stacks.js**: JavaScript library for Stacks blockchain interaction
- **CryptoJS**: Client-side encryption and hashing

### Storage
- **Gaia**: Decentralized storage for encrypted file data
- **Local Storage**: Temporary storage for encryption keys (in production, use secure key management)

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Clarinet (for smart contract development)
- Leather Wallet browser extension

### Installation

1. **Navigate to the project directory**
   ```bash
   cd "decentralised file sharing system"
   ```

2. **Install smart contract dependencies**
   ```bash
   cd contracts
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

### Development Setup

1. **Test the smart contracts**
   ```bash
   cd contracts
   clarinet check
   clarinet console
   ```
   This will verify contract syntax and open an interactive console.

2. **Start the frontend development server**
   ```bash
   cd frontend
   npm run dev
   ```
   The application will be available at `http://localhost:5173`

3. **Build the frontend for production**
   ```bash
   cd frontend
   npm run build
   ```

4. **Configure your wallet**
   - Install the Leather wallet extension
   - Connect to Stacks Testnet
   - The application will auto-detect your network

## 📖 Usage

### Uploading Files

1. **Connect your wallet** by clicking the "Connect Wallet" button
2. **Select a file** using the file input
3. **Choose visibility** (public or private)
4. **Click "Upload File"** to encrypt and store the file
5. **Confirm the transaction** in your wallet

### Managing Files

- **Download**: Click the download button to decrypt and download your files
- **Share**: Grant access to other users by their Stacks address
- **Delete**: Remove files from both the blockchain and Gaia storage

### Sharing Files

1. Click the "Share" button on any file
2. Enter the recipient's Stacks address
3. Choose access type (read or write)
4. Optionally set an expiration date
5. Confirm the transaction

## 🔧 Smart Contract Functions

### File Registry Contract

- `register-file`: Register a new file with metadata
- `update-file-visibility`: Change file visibility (public/private)
- `delete-file`: Remove a file (owner only)
- `get-file-info`: Retrieve file metadata
- `is-file-owner`: Check file ownership

### File Access Control Contract

- `grant-file-access`: Grant access to a user
- `revoke-file-access`: Remove user access
- `request-file-access`: Request access to a file
- `respond-to-access-request`: Approve/deny access requests
- `has-file-access`: Check if user has access

## 🔐 Security Features

### Encryption
- Files are encrypted client-side using AES encryption
- Encryption keys are generated randomly for each file
- Keys are hashed and stored on-chain for verification

### Access Control
- Smart contracts enforce access permissions
- Only file owners can grant/revoke access
- Time-based access expiration supported

### Decentralization
- No central server or database
- Files stored on Gaia (user-controlled storage)
- Metadata and permissions on Stacks blockchain

## 🧪 Testing

### Smart Contract Testing
```bash
cd contracts
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

## 📁 Project Structure

```
decentralised-file-sharing-system/
├── contracts/                 # Smart contracts
│   ├── contracts/
│   │   ├── file-registry.clar
│   │   └── file-access-control.clar
│   ├── tests/
│   └── settings/
├── frontend/                  # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── App.jsx
│   └── public/
└── README.md
```

## 🔮 Future Enhancements

- **File Versioning**: Track file versions and changes
- **Collaborative Editing**: Real-time collaborative file editing
- **File Categories**: Organize files with tags and categories
- **Advanced Sharing**: Share with groups, organizations
- **Mobile App**: React Native mobile application
- **File Preview**: In-browser preview for common file types
- **Backup & Sync**: Automatic backup and synchronization
- **Analytics**: File access analytics and usage statistics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Join the Stacks community Discord for general support

## 🙏 Acknowledgments

- [Stacks](https://stacks.co) for the blockchain infrastructure
- [Hiro](https://hiro.so) for development tools and documentation
- [Clarity](https://clarity-lang.org) for the smart contract language
- The Stacks community for support and resources

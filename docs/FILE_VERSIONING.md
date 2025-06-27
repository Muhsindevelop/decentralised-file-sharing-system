# File Versioning System

## Overview

The file versioning system allows users to maintain multiple versions of their files, track changes over time, and rollback to previous versions when needed. This feature provides a comprehensive version control system for decentralized file storage.

## Features

### 🔄 **Version Management**
- **Automatic Versioning**: Each file upload creates a new version automatically
- **Version History**: Complete history of all file versions with metadata
- **Version Notes**: Descriptive notes for each version explaining changes
- **Rollback Capability**: Ability to rollback to any previous version
- **Version Comparison**: View differences between versions

### 📊 **Smart Contract Functions**

#### Core Versioning Functions
- `upload-new-version`: Upload a new version of an existing file
- `rollback-to-version`: Rollback to a specific previous version
- `get-file-version`: Get details of a specific version
- `get-version-history`: Get complete version history for a file
- `version-exists`: Check if a specific version exists

#### Data Structures
```clarity
;; Enhanced file metadata with versioning
{
  owner: principal,
  file-name: (string-utf8 256),
  file-size: uint,
  file-hash: (string-ascii 64),
  gaia-url: (string-utf8 512),
  encryption-key-hash: (string-ascii 64),
  created-at: uint,
  is-public: bool,
  current-version: uint,
  total-versions: uint
}

;; Version-specific data
{
  file-size: uint,
  file-hash: (string-ascii 64),
  gaia-url: (string-utf8 512),
  encryption-key-hash: (string-ascii 64),
  uploaded-at: uint,
  version-notes: (string-utf8 512),
  previous-version: (optional uint)
}
```

### 🎨 **Frontend Components**

#### FileVersions Component
- **Version History Display**: Shows all versions in chronological order
- **Version Details**: File size, upload date, hash, and notes for each version
- **Current Version Indicator**: Clearly marks the currently active version
- **Rollback Interface**: One-click rollback to any previous version
- **Version Navigation**: Easy browsing through version history

#### UploadNewVersion Component
- **File Selection**: Choose new file version to upload
- **Version Notes**: Required field for describing changes
- **Size Comparison**: Shows size differences between versions
- **Upload Progress**: Real-time upload status and progress
- **Validation**: Ensures proper file selection and notes

#### Enhanced FileBrowser
- **Version Indicators**: Shows current version (v2/5) in file listings
- **Version Actions**: Quick access to version history and new version upload
- **Version Status**: Visual indicators for files with multiple versions

## Usage Guide

### 1. Uploading a New Version

```javascript
// Frontend usage
const handleNewVersionUpload = async (fileData) => {
  const result = await uploadNewVersion(
    fileId,
    fileSize,
    fileHash,
    gaiaUrl,
    encryptionKeyHash,
    versionNotes
  )
}
```

```clarity
;; Smart contract call
(contract-call? .file-registry upload-new-version
  "file123"
  u2048
  "newhash456"
  u"https://gaia.example.com/file-v2.txt"
  "newkeyhash789"
  u"Fixed critical bug and improved performance"
)
```

### 2. Rolling Back to Previous Version

```javascript
// Frontend usage
const handleRollback = async (fileId, targetVersion) => {
  const result = await rollbackToVersion(fileId, targetVersion)
}
```

```clarity
;; Smart contract call
(contract-call? .file-registry rollback-to-version
  "file123"
  u1  ;; Rollback to version 1
)
```

### 3. Viewing Version History

```javascript
// Get version details
const versionData = await getFileVersion(fileId, versionNumber)

// Get complete history
const history = await getVersionHistory(fileId)
```

## Security Features

### 🔐 **Access Control**
- **Owner-Only Operations**: Only file owners can upload new versions or rollback
- **Version Integrity**: Each version maintains its own encryption and hash
- **Immutable History**: Previous versions cannot be modified, only accessed

### 🛡️ **Data Protection**
- **Individual Encryption**: Each version has its own encryption key
- **Hash Verification**: File integrity verified through cryptographic hashes
- **Secure Storage**: All versions stored securely on Gaia with encryption

## Technical Implementation

### Smart Contract Architecture
```
file-registry.clar
├── Enhanced file metadata with version tracking
├── Version-specific data storage
├── Version management functions
└── Read-only version query functions
```

### Frontend Architecture
```
src/components/
├── FileVersions.jsx       # Version history viewer
├── UploadNewVersion.jsx   # New version upload interface
└── FileBrowser.jsx        # Enhanced with version controls
```

### Data Flow
1. **Version Upload**: File → Encryption → Gaia → Smart Contract → UI Update
2. **Version Rollback**: UI Request → Smart Contract → Metadata Update → UI Refresh
3. **Version History**: UI Request → Smart Contract Query → Data Display

## Testing

### Smart Contract Tests
- ✅ Version upload functionality
- ✅ Version rollback capability
- ✅ Access control enforcement
- ✅ Version history retrieval
- ✅ Data integrity verification

### Frontend Tests
- ✅ Component rendering
- ✅ User interaction handling
- ✅ Error state management
- ✅ Loading state display
- ✅ Data validation

## Future Enhancements

### 🚀 **Planned Features**
- **Version Comparison**: Side-by-side diff view between versions
- **Branching**: Create branches from specific versions
- **Merge Capability**: Merge changes from different versions
- **Version Tags**: Tag important versions (e.g., "stable", "release")
- **Automated Backups**: Automatic version creation on schedule
- **Version Limits**: Configurable limits on number of versions per file

### 📈 **Performance Optimizations**
- **Lazy Loading**: Load version data on demand
- **Caching**: Cache frequently accessed version data
- **Compression**: Compress version metadata for storage efficiency
- **Batch Operations**: Handle multiple version operations efficiently

## API Reference

### Smart Contract Functions

#### `upload-new-version`
```clarity
(define-public (upload-new-version
  (file-id (string-ascii 64))
  (file-size uint)
  (file-hash (string-ascii 64))
  (gaia-url (string-utf8 512))
  (encryption-key-hash (string-ascii 64))
  (version-notes (string-utf8 512))
) -> (response uint uint))
```

#### `rollback-to-version`
```clarity
(define-public (rollback-to-version
  (file-id (string-ascii 64))
  (target-version uint)
) -> (response uint uint))
```

#### `get-file-version`
```clarity
(define-read-only (get-file-version
  (file-id (string-ascii 64))
  (version uint)
) -> (optional {...}))
```

### Frontend Hooks

#### `useStacks`
```javascript
const {
  uploadNewVersion,
  rollbackToVersion,
  // ... other functions
} = useStacks()
```

## Troubleshooting

### Common Issues
1. **Version Upload Fails**: Check file size limits and network connection
2. **Rollback Not Working**: Verify user ownership and version existence
3. **Version History Empty**: Ensure proper smart contract deployment
4. **UI Not Updating**: Check for proper state management and re-rendering

### Error Codes
- `ERR_NOT_AUTHORIZED (100)`: User not authorized for operation
- `ERR_FILE_NOT_FOUND (101)`: File or version does not exist
- `ERR_INVALID_INPUT (103)`: Invalid input parameters provided

This versioning system provides a robust foundation for file version management in the decentralized file sharing platform, ensuring data integrity, user control, and seamless version tracking.

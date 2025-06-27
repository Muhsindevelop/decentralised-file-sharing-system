
;; title: file-registry
;; version: 1.0.0
;; summary: A smart contract for managing file metadata and ownership in a decentralized file sharing system
;; description: This contract handles file registration, ownership tracking, and basic file operations

;; constants
(define-constant ERR_NOT_AUTHORIZED (err u100))
(define-constant ERR_FILE_NOT_FOUND (err u101))
(define-constant ERR_FILE_ALREADY_EXISTS (err u102))
(define-constant ERR_INVALID_INPUT (err u103))

;; data vars
;; Counter for generating unique file IDs
(define-data-var file-counter uint u0)

;; data maps
;; Map to store file metadata
(define-map files
  { file-id: (string-ascii 64) }
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
)

;; Map to store file versions
(define-map file-versions
  { file-id: (string-ascii 64), version: uint }
  {
    file-size: uint,
    file-hash: (string-ascii 64),
    gaia-url: (string-utf8 512),
    encryption-key-hash: (string-ascii 64),
    uploaded-at: uint,
    version-notes: (string-utf8 512),
    previous-version: (optional uint)
  }
)

;; Map to track file ownership
(define-map user-files
  { user: principal, file-id: (string-ascii 64) }
  { exists: bool }
)

;; private functions
(define-private (generate-file-id)
  (let ((counter (var-get file-counter)))
    (var-set file-counter (+ counter u1))
    (int-to-ascii counter)
  )
)

;; public functions
;; Register a new file
(define-public (register-file
  (file-name (string-utf8 256))
  (file-size uint)
  (file-hash (string-ascii 64))
  (gaia-url (string-utf8 512))
  (encryption-key-hash (string-ascii 64))
  (is-public bool)
)
  (let ((file-id (generate-file-id))
        (caller tx-sender))
    ;; Validate inputs
    (asserts! (> (len file-name) u0) ERR_INVALID_INPUT)
    (asserts! (> file-size u0) ERR_INVALID_INPUT)
    (asserts! (> (len file-hash) u0) ERR_INVALID_INPUT)
    (asserts! (> (len gaia-url) u0) ERR_INVALID_INPUT)

    ;; Check if file already exists
    (asserts! (is-none (map-get? files { file-id: file-id })) ERR_FILE_ALREADY_EXISTS)

    ;; Store file metadata with versioning
    (map-set files
      { file-id: file-id }
      {
        owner: caller,
        file-name: file-name,
        file-size: file-size,
        file-hash: file-hash,
        gaia-url: gaia-url,
        encryption-key-hash: encryption-key-hash,
        created-at: stacks-block-height,
        is-public: is-public,
        current-version: u1,
        total-versions: u1
      }
    )

    ;; Store initial version
    (map-set file-versions
      { file-id: file-id, version: u1 }
      {
        file-size: file-size,
        file-hash: file-hash,
        gaia-url: gaia-url,
        encryption-key-hash: encryption-key-hash,
        uploaded-at: stacks-block-height,
        version-notes: u"Initial version",
        previous-version: none
      }
    )

    ;; Track user ownership
    (map-set user-files
      { user: caller, file-id: file-id }
      { exists: true }
    )

    (ok file-id)
  )
)

;; Upload a new version of an existing file
(define-public (upload-new-version
  (file-id (string-ascii 64))
  (file-size uint)
  (file-hash (string-ascii 64))
  (gaia-url (string-utf8 512))
  (encryption-key-hash (string-ascii 64))
  (version-notes (string-utf8 512))
)
  (let ((file-data (unwrap! (map-get? files { file-id: file-id }) ERR_FILE_NOT_FOUND))
        (current-version (get current-version file-data))
        (new-version (+ current-version u1)))
    ;; Check if caller is the owner
    (asserts! (is-eq tx-sender (get owner file-data)) ERR_NOT_AUTHORIZED)

    ;; Validate inputs
    (asserts! (> file-size u0) ERR_INVALID_INPUT)
    (asserts! (> (len file-hash) u0) ERR_INVALID_INPUT)
    (asserts! (> (len gaia-url) u0) ERR_INVALID_INPUT)

    ;; Update file metadata
    (map-set files
      { file-id: file-id }
      (merge file-data {
        file-size: file-size,
        file-hash: file-hash,
        gaia-url: gaia-url,
        encryption-key-hash: encryption-key-hash,
        current-version: new-version,
        total-versions: new-version
      })
    )

    ;; Store new version
    (map-set file-versions
      { file-id: file-id, version: new-version }
      {
        file-size: file-size,
        file-hash: file-hash,
        gaia-url: gaia-url,
        encryption-key-hash: encryption-key-hash,
        uploaded-at: stacks-block-height,
        version-notes: version-notes,
        previous-version: (some current-version)
      }
    )

    (ok new-version)
  )
)

;; Rollback to a previous version
(define-public (rollback-to-version (file-id (string-ascii 64)) (target-version uint))
  (let ((file-data (unwrap! (map-get? files { file-id: file-id }) ERR_FILE_NOT_FOUND))
        (version-data (unwrap! (map-get? file-versions { file-id: file-id, version: target-version }) ERR_FILE_NOT_FOUND)))
    ;; Check if caller is the owner
    (asserts! (is-eq tx-sender (get owner file-data)) ERR_NOT_AUTHORIZED)

    ;; Check if target version exists and is valid
    (asserts! (<= target-version (get total-versions file-data)) ERR_INVALID_INPUT)
    (asserts! (> target-version u0) ERR_INVALID_INPUT)

    ;; Update file metadata to point to the target version
    (map-set files
      { file-id: file-id }
      (merge file-data {
        file-size: (get file-size version-data),
        file-hash: (get file-hash version-data),
        gaia-url: (get gaia-url version-data),
        encryption-key-hash: (get encryption-key-hash version-data),
        current-version: target-version
      })
    )

    (ok target-version)
  )
)

;; Update file visibility
(define-public (update-file-visibility (file-id (string-ascii 64)) (is-public bool))
  (let ((file-data (unwrap! (map-get? files { file-id: file-id }) ERR_FILE_NOT_FOUND)))
    ;; Check if caller is the owner
    (asserts! (is-eq tx-sender (get owner file-data)) ERR_NOT_AUTHORIZED)

    ;; Update the file
    (map-set files
      { file-id: file-id }
      (merge file-data { is-public: is-public })
    )

    (ok true)
  )
)

;; Delete a file (only owner can delete)
(define-public (delete-file (file-id (string-ascii 64)))
  (let ((file-data (unwrap! (map-get? files { file-id: file-id }) ERR_FILE_NOT_FOUND)))
    ;; Check if caller is the owner
    (asserts! (is-eq tx-sender (get owner file-data)) ERR_NOT_AUTHORIZED)

    ;; Remove file metadata
    (map-delete files { file-id: file-id })

    ;; Remove from user files
    (map-delete user-files { user: tx-sender, file-id: file-id })

    (ok true)
  )
)

;; read only functions
;; Get file metadata
(define-read-only (get-file-info (file-id (string-ascii 64)))
  (map-get? files { file-id: file-id })
)

;; Check if user owns a file
(define-read-only (is-file-owner (user principal) (file-id (string-ascii 64)))
  (match (map-get? files { file-id: file-id })
    file-data (is-eq (get owner file-data) user)
    false
  )
)

;; Get file owner
(define-read-only (get-file-owner (file-id (string-ascii 64)))
  (match (map-get? files { file-id: file-id })
    file-data (some (get owner file-data))
    none
  )
)

;; Get file version details
(define-read-only (get-file-version (file-id (string-ascii 64)) (version uint))
  (map-get? file-versions { file-id: file-id, version: version })
)

;; Get all versions for a file (returns list of version numbers)
(define-read-only (get-file-version-list (file-id (string-ascii 64)))
  (match (map-get? files { file-id: file-id })
    file-data
      (let ((total-versions (get total-versions file-data)))
        (map + (list u1 u2 u3 u4 u5 u6 u7 u8 u9 u10) (list u0 u0 u0 u0 u0 u0 u0 u0 u0 u0))
      )
    (list)
  )
)

;; Get version history for a file
(define-read-only (get-version-history (file-id (string-ascii 64)))
  (match (map-get? files { file-id: file-id })
    file-data
      (some {
        current-version: (get current-version file-data),
        total-versions: (get total-versions file-data),
        file-name: (get file-name file-data),
        owner: (get owner file-data)
      })
    none
  )
)

;; Check if a specific version exists
(define-read-only (version-exists (file-id (string-ascii 64)) (version uint))
  (is-some (map-get? file-versions { file-id: file-id, version: version }))
)

;; Get current file counter
(define-read-only (get-file-counter)
  (var-get file-counter)
)

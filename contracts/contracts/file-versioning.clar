;; title: file-versioning
;; version: 1.0.0
;; summary: A smart contract for managing file versions in a decentralized file sharing system
;; description: This contract handles file version control, tracking changes, and version history management

;; constants
(define-constant ERR_NOT_AUTHORIZED (err u300))
(define-constant ERR_FILE_NOT_FOUND (err u301))
(define-constant ERR_VERSION_NOT_FOUND (err u302))
(define-constant ERR_INVALID_INPUT (err u303))
(define-constant ERR_VERSION_ALREADY_EXISTS (err u304))
(define-constant ERR_CANNOT_VERSION_NON_EXISTENT_FILE (err u305))

;; data vars
;; Counter for generating unique version IDs
(define-data-var version-counter uint u0)

;; data maps
;; Map to store file version metadata
(define-map file-versions
  { file-id: (string-ascii 64), version-number: uint }
  {
    version-id: (string-ascii 64),
    creator: principal,
    created-at: uint,
    file-hash: (string-ascii 64),
    gaia-url: (string-utf8 512),
    encryption-key-hash: (string-ascii 64),
    file-size: uint,
    changes-description: (string-utf8 512),
    is-current: bool
  }
)

;; Map to track the latest version number for each file
(define-map file-latest-version
  { file-id: (string-ascii 64) }
  { latest-version: uint, total-versions: uint }
)

;; Map to track all versions of a file for a user
(define-map user-file-versions
  { user: principal, file-id: (string-ascii 64), version-number: uint }
  { exists: bool }
)

;; private functions
;; Generate a unique version ID
(define-private (generate-version-id)
  (let ((counter (var-get version-counter)))
    (var-set version-counter (+ counter u1))
    (concat "v" (int-to-ascii counter))
  )
)

;; Check if a file exists (this would normally call file-registry contract)
(define-private (file-exists (file-id (string-ascii 64)))
  ;; In a real implementation, this would call the file-registry contract
  ;; For now, we'll assume the file exists if there's at least one version
  (is-some (map-get? file-latest-version { file-id: file-id }))
)

;; public functions
;; Create a new version of a file
(define-public (create-file-version
  (file-id (string-ascii 64))
  (file-hash (string-ascii 64))
  (gaia-url (string-utf8 512))
  (encryption-key-hash (string-ascii 64))
  (file-size uint)
  (changes-description (string-utf8 512))
)
  (let ((caller tx-sender)
        (version-id (generate-version-id))
        (current-version-info (default-to { latest-version: u0, total-versions: u0 }
                                          (map-get? file-latest-version { file-id: file-id })))
        (new-version-number (+ (get latest-version current-version-info) u1)))

    ;; Validate inputs
    (asserts! (> (len file-id) u0) ERR_INVALID_INPUT)
    (asserts! (> (len file-hash) u0) ERR_INVALID_INPUT)
    (asserts! (> (len gaia-url) u0) ERR_INVALID_INPUT)
    (asserts! (> file-size u0) ERR_INVALID_INPUT)

    ;; Note: In a real implementation, we would check if caller owns the file
    ;; by calling the file-registry contract. For simplicity, we assume authorization.

    ;; Check if this version already exists
    (asserts! (is-none (map-get? file-versions { file-id: file-id, version-number: new-version-number }))
              ERR_VERSION_ALREADY_EXISTS)

    ;; Mark previous version as not current if it exists
    (if (> (get latest-version current-version-info) u0)
      (let ((prev-version (unwrap-panic (map-get? file-versions
                                                  { file-id: file-id,
                                                    version-number: (get latest-version current-version-info) }))))
        (map-set file-versions
          { file-id: file-id, version-number: (get latest-version current-version-info) }
          (merge prev-version { is-current: false })))
      true)

    ;; Create new version
    (map-set file-versions
      { file-id: file-id, version-number: new-version-number }
      {
        version-id: version-id,
        creator: caller,
        created-at: stacks-block-height,
        file-hash: file-hash,
        gaia-url: gaia-url,
        encryption-key-hash: encryption-key-hash,
        file-size: file-size,
        changes-description: changes-description,
        is-current: true
      }
    )

    ;; Update latest version tracking
    (map-set file-latest-version
      { file-id: file-id }
      {
        latest-version: new-version-number,
        total-versions: (+ (get total-versions current-version-info) u1)
      }
    )

    ;; Track user's version
    (map-set user-file-versions
      { user: caller, file-id: file-id, version-number: new-version-number }
      { exists: true }
    )

    (ok { version-id: version-id, version-number: new-version-number })
  )
)

;; Revert to a specific version (makes it the current version)
(define-public (revert-to-version
  (file-id (string-ascii 64))
  (version-number uint)
)
  (let ((caller tx-sender)
        (version-data (unwrap! (map-get? file-versions { file-id: file-id, version-number: version-number })
                               ERR_VERSION_NOT_FOUND))
        (latest-info (unwrap! (map-get? file-latest-version { file-id: file-id }) ERR_FILE_NOT_FOUND)))

    ;; Note: In a real implementation, we would check if caller owns the file

    ;; Mark current version as not current
    (let ((current-version (unwrap-panic (map-get? file-versions
                                                   { file-id: file-id,
                                                     version-number: (get latest-version latest-info) }))))
      (map-set file-versions
        { file-id: file-id, version-number: (get latest-version latest-info) }
        (merge current-version { is-current: false })))

    ;; Mark selected version as current
    (map-set file-versions
      { file-id: file-id, version-number: version-number }
      (merge version-data { is-current: true })
    )

    ;; Update latest version pointer
    (map-set file-latest-version
      { file-id: file-id }
      (merge latest-info { latest-version: version-number })
    )

    (ok true)
  )
)

;; read only functions
;; Get specific version information
(define-read-only (get-file-version (file-id (string-ascii 64)) (version-number uint))
  (map-get? file-versions { file-id: file-id, version-number: version-number })
)

;; Get current version of a file
(define-read-only (get-current-version (file-id (string-ascii 64)))
  (match (map-get? file-latest-version { file-id: file-id })
    latest-info (map-get? file-versions { file-id: file-id, version-number: (get latest-version latest-info) })
    none
  )
)

;; Get version history summary for a file
(define-read-only (get-version-history (file-id (string-ascii 64)))
  (map-get? file-latest-version { file-id: file-id })
)

;; Check if a specific version exists
(define-read-only (version-exists (file-id (string-ascii 64)) (version-number uint))
  (is-some (map-get? file-versions { file-id: file-id, version-number: version-number }))
)

;; Get the latest version number for a file
(define-read-only (get-latest-version-number (file-id (string-ascii 64)))
  (match (map-get? file-latest-version { file-id: file-id })
    latest-info (some (get latest-version latest-info))
    none
  )
)

;; Get total number of versions for a file
(define-read-only (get-total-versions (file-id (string-ascii 64)))
  (match (map-get? file-latest-version { file-id: file-id })
    latest-info (some (get total-versions latest-info))
    none
  )
)


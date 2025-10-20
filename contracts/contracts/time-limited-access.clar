;; title: time-limited-access
;; version: 1.0.0
;; summary: A smart contract for managing time-limited file access in a decentralized file sharing system
;; description: This contract handles temporary access grants with automatic expiration and time-based access patterns

;; constants
(define-constant ERR_NOT_AUTHORIZED (err u400))
(define-constant ERR_FILE_NOT_FOUND (err u401))
(define-constant ERR_ACCESS_NOT_FOUND (err u402))
(define-constant ERR_ACCESS_EXPIRED (err u403))
(define-constant ERR_INVALID_INPUT (err u404))
(define-constant ERR_INVALID_DURATION (err u405))
(define-constant ERR_ACCESS_ALREADY_GRANTED (err u406))
(define-constant ERR_CANNOT_GRANT_TO_SELF (err u407))

;; Maximum access duration in blocks (approximately 30 days at 10 min/block)
(define-constant MAX_ACCESS_DURATION u4320)

;; data vars
;; Counter for generating unique access grant IDs
(define-data-var access-grant-counter uint u0)

;; data maps
;; Map to store time-limited access grants
(define-map time-limited-access
  { file-id: (string-ascii 64), user: principal }
  {
    grant-id: (string-ascii 64),
    granted-by: principal,
    granted-at: uint,
    expires-at: uint,
    access-type: (string-ascii 10), ;; "read" or "write"
    auto-renew: bool,
    renewal-duration: uint,
    max-renewals: uint,
    current-renewals: uint,
    is-active: bool
  }
)

;; Map to track access grants by grant ID for easy lookup
(define-map access-grants-by-id
  { grant-id: (string-ascii 64) }
  {
    file-id: (string-ascii 64),
    user: principal,
    granted-by: principal,
    granted-at: uint,
    expires-at: uint,
    access-type: (string-ascii 10),
    auto-renew: bool,
    is-active: bool
  }
)

;; Map to track all active grants for a user
(define-map user-active-grants
  { user: principal, grant-id: (string-ascii 64) }
  { exists: bool }
)

;; Map to track access history for auditing
(define-map access-history
  { file-id: (string-ascii 64), user: principal, timestamp: uint }
  {
    action: (string-ascii 20), ;; "granted", "expired", "revoked", "renewed"
    grant-id: (string-ascii 64),
    performed-by: principal
  }
)

;; private functions
;; Generate a unique access grant ID
(define-private (generate-grant-id)
  (let ((counter (var-get access-grant-counter)))
    (var-set access-grant-counter (+ counter u1))
    (concat "grant" (int-to-ascii counter))
  )
)

;; Check if access has expired
(define-private (is-access-expired (expires-at uint))
  (>= stacks-block-height expires-at)
)

;; Log access action for auditing
(define-private (log-access-action
  (file-id (string-ascii 64))
  (user principal)
  (action (string-ascii 20))
  (grant-id (string-ascii 64))
  (performed-by principal)
)
  (map-set access-history
    { file-id: file-id, user: user, timestamp: stacks-block-height }
    {
      action: action,
      grant-id: grant-id,
      performed-by: performed-by
    }
  )
)

;; public functions
;; Grant time-limited access to a file
(define-public (grant-time-limited-access
  (file-id (string-ascii 64))
  (user principal)
  (access-type (string-ascii 10))
  (duration-blocks uint)
  (auto-renew bool)
  (renewal-duration uint)
  (max-renewals uint)
)
  (let ((caller tx-sender)
        (grant-id (generate-grant-id))
        (expires-at (+ stacks-block-height duration-blocks)))

    ;; Validate inputs
    (asserts! (> (len file-id) u0) ERR_INVALID_INPUT)
    (asserts! (not (is-eq caller user)) ERR_CANNOT_GRANT_TO_SELF)
    (asserts! (or (is-eq access-type "read") (is-eq access-type "write")) ERR_INVALID_INPUT)
    (asserts! (and (> duration-blocks u0) (<= duration-blocks MAX_ACCESS_DURATION)) ERR_INVALID_DURATION)

    ;; Check if access already granted and active
    (asserts! (is-none (map-get? time-limited-access { file-id: file-id, user: user }))
              ERR_ACCESS_ALREADY_GRANTED)

    ;; Note: In a real implementation, we would check if caller owns the file

    ;; Grant time-limited access
    (map-set time-limited-access
      { file-id: file-id, user: user }
      {
        grant-id: grant-id,
        granted-by: caller,
        granted-at: stacks-block-height,
        expires-at: expires-at,
        access-type: access-type,
        auto-renew: auto-renew,
        renewal-duration: renewal-duration,
        max-renewals: max-renewals,
        current-renewals: u0,
        is-active: true
      }
    )

    ;; Store grant by ID for easy lookup
    (map-set access-grants-by-id
      { grant-id: grant-id }
      {
        file-id: file-id,
        user: user,
        granted-by: caller,
        granted-at: stacks-block-height,
        expires-at: expires-at,
        access-type: access-type,
        auto-renew: auto-renew,
        is-active: true
      }
    )

    ;; Track user's active grants
    (map-set user-active-grants
      { user: user, grant-id: grant-id }
      { exists: true }
    )

    ;; Log the action
    (log-access-action file-id user "granted" grant-id caller)

    (ok grant-id)
  )
)

;; Revoke time-limited access
(define-public (revoke-time-limited-access
  (file-id (string-ascii 64))
  (user principal)
)
  (let ((caller tx-sender)
        (access-data (unwrap! (map-get? time-limited-access { file-id: file-id, user: user })
                              ERR_ACCESS_NOT_FOUND)))

    ;; Check if caller is the one who granted access
    (asserts! (is-eq caller (get granted-by access-data)) ERR_NOT_AUTHORIZED)

    ;; Mark access as inactive
    (map-set time-limited-access
      { file-id: file-id, user: user }
      (merge access-data { is-active: false })
    )

    ;; Update grant by ID
    (map-set access-grants-by-id
      { grant-id: (get grant-id access-data) }
      {
        file-id: file-id,
        user: user,
        granted-by: (get granted-by access-data),
        granted-at: (get granted-at access-data),
        expires-at: (get expires-at access-data),
        access-type: (get access-type access-data),
        auto-renew: (get auto-renew access-data),
        is-active: false
      }
    )

    ;; Remove from user's active grants
    (map-delete user-active-grants { user: user, grant-id: (get grant-id access-data) })

    ;; Log the action
    (log-access-action file-id user "revoked" (get grant-id access-data) caller)

    (ok true)
  )
)

;; Renew access (manual renewal)
(define-public (renew-access
  (file-id (string-ascii 64))
  (user principal)
  (additional-duration uint)
)
  (let ((caller tx-sender)
        (access-data (unwrap! (map-get? time-limited-access { file-id: file-id, user: user })
                              ERR_ACCESS_NOT_FOUND)))

    ;; Check if caller is the one who granted access
    (asserts! (is-eq caller (get granted-by access-data)) ERR_NOT_AUTHORIZED)

    ;; Check if access is still active
    (asserts! (get is-active access-data) ERR_ACCESS_EXPIRED)

    ;; Check if renewals are allowed
    (asserts! (< (get current-renewals access-data) (get max-renewals access-data)) ERR_NOT_AUTHORIZED)

    ;; Validate duration
    (asserts! (and (> additional-duration u0) (<= additional-duration MAX_ACCESS_DURATION))
              ERR_INVALID_DURATION)

    ;; Calculate new expiration
    (let ((new-expires-at (+ (get expires-at access-data) additional-duration)))

      ;; Update access data
      (map-set time-limited-access
        { file-id: file-id, user: user }
        (merge access-data {
          expires-at: new-expires-at,
          current-renewals: (+ (get current-renewals access-data) u1)
        })
      )

      ;; Update grant by ID
      (map-set access-grants-by-id
        { grant-id: (get grant-id access-data) }
        {
          file-id: file-id,
          user: user,
          granted-by: (get granted-by access-data),
          granted-at: (get granted-at access-data),
          expires-at: new-expires-at,
          access-type: (get access-type access-data),
          auto-renew: (get auto-renew access-data),
          is-active: true
        }
      )

      ;; Log the action
      (log-access-action file-id user "renewed" (get grant-id access-data) caller)

      (ok new-expires-at)
    )
  )
)

;; Extend access duration (only by original granter)
(define-public (extend-access-duration
  (grant-id (string-ascii 64))
  (additional-blocks uint)
)
  (let ((caller tx-sender)
        (grant-data (unwrap! (map-get? access-grants-by-id { grant-id: grant-id })
                             ERR_ACCESS_NOT_FOUND)))

    ;; Check if caller is the one who granted access
    (asserts! (is-eq caller (get granted-by grant-data)) ERR_NOT_AUTHORIZED)

    ;; Check if access is still active
    (asserts! (get is-active grant-data) ERR_ACCESS_EXPIRED)

    ;; Validate duration
    (asserts! (and (> additional-blocks u0) (<= additional-blocks MAX_ACCESS_DURATION))
              ERR_INVALID_DURATION)

    ;; Calculate new expiration
    (let ((new-expires-at (+ (get expires-at grant-data) additional-blocks))
          (file-id (get file-id grant-data))
          (user (get user grant-data)))

      ;; Update time-limited-access map
      (let ((access-data (unwrap-panic (map-get? time-limited-access { file-id: file-id, user: user }))))
        (map-set time-limited-access
          { file-id: file-id, user: user }
          (merge access-data { expires-at: new-expires-at })
        )
      )

      ;; Update grant by ID
      (map-set access-grants-by-id
        { grant-id: grant-id }
        (merge grant-data { expires-at: new-expires-at })
      )

      ;; Log the action
      (log-access-action file-id user "extended" grant-id caller)

      (ok new-expires-at)
    )
  )
)

;; read only functions
;; Check if user has valid (non-expired) access to a file
(define-read-only (has-valid-access (file-id (string-ascii 64)) (user principal))
  (match (map-get? time-limited-access { file-id: file-id, user: user })
    access-data
      (and
        (get is-active access-data)
        (not (is-access-expired (get expires-at access-data)))
      )
    false
  )
)

;; Get time-limited access details
(define-read-only (get-access-details (file-id (string-ascii 64)) (user principal))
  (map-get? time-limited-access { file-id: file-id, user: user })
)

;; Get access grant by ID
(define-read-only (get-grant-by-id (grant-id (string-ascii 64)))
  (map-get? access-grants-by-id { grant-id: grant-id })
)

;; Check if access has expired
(define-read-only (is-access-expired-check (file-id (string-ascii 64)) (user principal))
  (match (map-get? time-limited-access { file-id: file-id, user: user })
    access-data (is-access-expired (get expires-at access-data))
    true
  )
)

;; Get remaining access time in blocks
(define-read-only (get-remaining-access-time (file-id (string-ascii 64)) (user principal))
  (match (map-get? time-limited-access { file-id: file-id, user: user })
    access-data
      (if (and (get is-active access-data) (not (is-access-expired (get expires-at access-data))))
        (some (- (get expires-at access-data) stacks-block-height))
        none
      )
    none
  )
)

;; Get access history for a file and user
(define-read-only (get-access-history
  (file-id (string-ascii 64))
  (user principal)
  (timestamp uint)
)
  (map-get? access-history { file-id: file-id, user: user, timestamp: timestamp })
)

;; Check if user can renew access
(define-read-only (can-renew-access (file-id (string-ascii 64)) (user principal))
  (match (map-get? time-limited-access { file-id: file-id, user: user })
    access-data
      (and
        (get is-active access-data)
        (< (get current-renewals access-data) (get max-renewals access-data))
      )
    false
  )
)

;; Get access type for a user
(define-read-only (get-access-type (file-id (string-ascii 64)) (user principal))
  (match (map-get? time-limited-access { file-id: file-id, user: user })
    access-data
      (if (and (get is-active access-data) (not (is-access-expired (get expires-at access-data))))
        (some (get access-type access-data))
        none
      )
    none
  )
)

;; Get total active grants for a user
(define-read-only (get-user-active-grant-count (user principal))
  ;; This is a simplified version - in a real implementation,
  ;; we would iterate through all grants to count active ones
  ;; For now, we return a placeholder
  (some u0)
)


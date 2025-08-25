;; title: file-audit-analytics
;; version: 1.0.0
;; summary: Comprehensive audit trail and analytics for decentralized file sharing system
;; description: Tracks all file operations, provides security monitoring, and generates usage analytics

;; constants
(define-constant ERR_NOT_AUTHORIZED (err u300))
(define-constant ERR_INVALID_INPUT (err u301))
(define-constant ERR_EVENT_NOT_FOUND (err u302))
(define-constant ERR_RATE_LIMIT_EXCEEDED (err u303))

;; data vars
(define-data-var audit-counter uint u0)
(define-data-var analytics-enabled bool true)

;; Event types
(define-constant EVENT_FILE_UPLOADED "file_uploaded")
(define-constant EVENT_FILE_DOWNLOADED "file_downloaded")
(define-constant EVENT_FILE_SHARED "file_shared")
(define-constant EVENT_FILE_DELETED "file_deleted")
(define-constant EVENT_ACCESS_GRANTED "access_granted")
(define-constant EVENT_ACCESS_REVOKED "access_revoked")
(define-constant EVENT_ACCESS_REQUESTED "access_requested")
(define-constant EVENT_LOGIN "user_login")
(define-constant EVENT_SUSPICIOUS_ACTIVITY "suspicious_activity")

;; Risk levels
(define-constant RISK_LOW u1)
(define-constant RISK_MEDIUM u2)
(define-constant RISK_HIGH u3)
(define-constant RISK_CRITICAL u4)

;; data maps
;; Comprehensive audit log
(define-map audit-events
  { event-id: uint }
  {
    user: principal,
    event-type: (string-ascii 20),
    file-id: (optional (string-ascii 64)),
    target-user: (optional principal),
    timestamp: uint,
    block-height: uint,
    ip-hash: (optional (string-ascii 64)),
    user-agent-hash: (optional (string-ascii 64)),
    risk-level: uint,
    metadata: (string-utf8 512)
  }
)

;; User activity analytics
(define-map user-analytics
  { user: principal }
  {
    total-files-uploaded: uint,
    total-files-downloaded: uint,
    total-files-shared: uint,
    total-logins: uint,
    first-activity: uint,
    last-activity: uint,
    risk-score: uint,
    is-flagged: bool
  }
)

;; File analytics
(define-map file-analytics
  { file-id: (string-ascii 64) }
  {
    download-count: uint,
    share-count: uint,
    access-request-count: uint,
    last-accessed: uint,
    unique-accessors: uint,
    risk-events: uint
  }
)

;; Daily usage statistics
(define-map daily-stats
  { date: uint }
  {
    total-uploads: uint,
    total-downloads: uint,
    total-shares: uint,
    unique-users: uint,
    total-events: uint
  }
)

;; Rate limiting for security
(define-map user-rate-limits
  { user: principal, window: uint }
  {
    upload-count: uint,
    download-count: uint,
    share-count: uint
  }
)

;; Security monitoring
(define-map security-alerts
  { alert-id: uint }
  {
    user: principal,
    alert-type: (string-ascii 30),
    severity: uint,
    description: (string-utf8 256),
    timestamp: uint,
    auto-resolved: bool
  }
)

;; private functions
(define-private (get-current-day)
  (/ stacks-block-height u144)
)

(define-private (get-current-hour)
  (/ stacks-block-height u6)
)

(define-private (increment-audit-counter)
  (let ((current (var-get audit-counter)))
    (var-set audit-counter (+ current u1))
    current
  )
)

(define-private (update-daily-stats (event-type (string-ascii 20)))
  (let ((day (get-current-day))
        (current-stats (default-to 
          { total-uploads: u0, total-downloads: u0, total-shares: u0, unique-users: u0, total-events: u0 }
          (map-get? daily-stats { date: day }))))
    
    (map-set daily-stats
      { date: day }
      {
        total-uploads: (if (is-eq event-type EVENT_FILE_UPLOADED) 
                         (+ (get total-uploads current-stats) u1)
                         (get total-uploads current-stats)),
        total-downloads: (if (is-eq event-type EVENT_FILE_DOWNLOADED)
                           (+ (get total-downloads current-stats) u1)
                           (get total-downloads current-stats)),
        total-shares: (if (is-eq event-type EVENT_FILE_SHARED)
                        (+ (get total-shares current-stats) u1)
                        (get total-shares current-stats)),
        unique-users: (get unique-users current-stats),
        total-events: (+ (get total-events current-stats) u1)
      }
    )
  )
)

(define-private (check-rate-limits (user principal) (event-type (string-ascii 20)))
  (let ((hour (get-current-hour))
        (current-limits (default-to 
          { upload-count: u0, download-count: u0, share-count: u0 }
          (map-get? user-rate-limits { user: user, window: hour }))))
    
    (if (is-eq event-type EVENT_FILE_UPLOADED)
      (< (get upload-count current-limits) u50)
      (if (is-eq event-type EVENT_FILE_DOWNLOADED)
        (< (get download-count current-limits) u200)
        (if (is-eq event-type EVENT_FILE_SHARED)
          (< (get share-count current-limits) u100)
          true
        )
      )
    )
  )
)

(define-private (update-rate-limits (user principal) (event-type (string-ascii 20)))
  (let ((hour (get-current-hour))
        (current-limits (default-to 
          { upload-count: u0, download-count: u0, share-count: u0 }
          (map-get? user-rate-limits { user: user, window: hour }))))
    
    (map-set user-rate-limits
      { user: user, window: hour }
      {
        upload-count: (if (is-eq event-type EVENT_FILE_UPLOADED)
                        (+ (get upload-count current-limits) u1)
                        (get upload-count current-limits)),
        download-count: (if (is-eq event-type EVENT_FILE_DOWNLOADED)
                          (+ (get download-count current-limits) u1)
                          (get download-count current-limits)),
        share-count: (if (is-eq event-type EVENT_FILE_SHARED)
                       (+ (get share-count current-limits) u1)
                       (get share-count current-limits))
      }
    )
  )
)

(define-private (update-user-analytics (user principal) (event-type (string-ascii 20)))
  (let ((current-analytics (default-to
          {
            total-files-uploaded: u0,
            total-files-downloaded: u0,
            total-files-shared: u0,
            total-logins: u0,
            first-activity: stacks-block-height,
            last-activity: stacks-block-height,
            risk-score: u0,
            is-flagged: false
          }
          (map-get? user-analytics { user: user }))))
    
    (map-set user-analytics
      { user: user }
      {
        total-files-uploaded: (if (is-eq event-type EVENT_FILE_UPLOADED)
                                (+ (get total-files-uploaded current-analytics) u1)
                                (get total-files-uploaded current-analytics)),
        total-files-downloaded: (if (is-eq event-type EVENT_FILE_DOWNLOADED)
                                  (+ (get total-files-downloaded current-analytics) u1)
                                  (get total-files-downloaded current-analytics)),
        total-files-shared: (if (is-eq event-type EVENT_FILE_SHARED)
                              (+ (get total-files-shared current-analytics) u1)
                              (get total-files-shared current-analytics)),
        total-logins: (if (is-eq event-type EVENT_LOGIN)
                        (+ (get total-logins current-analytics) u1)
                        (get total-logins current-analytics)),
        first-activity: (get first-activity current-analytics),
        last-activity: stacks-block-height,
        risk-score: (get risk-score current-analytics),
        is-flagged: (get is-flagged current-analytics)
      }
    )
  )
)

(define-private (update-file-analytics (file-id (string-ascii 64)) (event-type (string-ascii 20)))
  (let ((current-analytics (default-to
          {
            download-count: u0,
            share-count: u0,
            access-request-count: u0,
            last-accessed: stacks-block-height,
            unique-accessors: u0,
            risk-events: u0
          }
          (map-get? file-analytics { file-id: file-id }))))
    
    (map-set file-analytics
      { file-id: file-id }
      {
        download-count: (if (is-eq event-type EVENT_FILE_DOWNLOADED)
                          (+ (get download-count current-analytics) u1)
                          (get download-count current-analytics)),
        share-count: (if (is-eq event-type EVENT_FILE_SHARED)
                       (+ (get share-count current-analytics) u1)
                       (get share-count current-analytics)),
        access-request-count: (if (is-eq event-type EVENT_ACCESS_REQUESTED)
                                (+ (get access-request-count current-analytics) u1)
                                (get access-request-count current-analytics)),
        last-accessed: stacks-block-height,
        unique-accessors: (get unique-accessors current-analytics),
        risk-events: (get risk-events current-analytics)
      }
    )
  )
)

(define-private (create-security-alert 
  (user principal)
  (event-type (string-ascii 20))
  (severity uint)
  (description (string-utf8 256))
)
  (let ((alert-id (var-get audit-counter)))
    (map-set security-alerts
      { alert-id: alert-id }
      {
        user: user,
        alert-type: event-type,
        severity: severity,
        description: description,
        timestamp: stacks-block-height,
        auto-resolved: false
      }
    )
  )
)

;; public functions
(define-public (log-audit-event
  (event-type (string-ascii 20))
  (file-id (optional (string-ascii 64)))
  (target-user (optional principal))
  (ip-hash (optional (string-ascii 64)))
  (user-agent-hash (optional (string-ascii 64)))
  (risk-level uint)
  (metadata (string-utf8 512))
)
  (let ((event-id (increment-audit-counter))
        (user tx-sender))
    
    (asserts! (and (>= risk-level RISK_LOW) (<= risk-level RISK_CRITICAL)) ERR_INVALID_INPUT)
    (asserts! (check-rate-limits user event-type) ERR_RATE_LIMIT_EXCEEDED)
    
    (map-set audit-events
      { event-id: event-id }
      {
        user: user,
        event-type: event-type,
        file-id: file-id,
        target-user: target-user,
        timestamp: stacks-block-height,
        block-height: stacks-block-height,
        ip-hash: ip-hash,
        user-agent-hash: user-agent-hash,
        risk-level: risk-level,
        metadata: metadata
      }
    )
    
    (update-user-analytics user event-type)
    
    (match file-id
      fid (update-file-analytics fid event-type)
      true
    )
    
    (update-daily-stats event-type)
    (update-rate-limits user event-type)
    
    (if (>= risk-level RISK_HIGH)
      (create-security-alert user event-type risk-level (unwrap-panic (as-max-len? metadata u256)))
      true
    )
    
    (ok event-id)
  )
)

;; Read-only functions
(define-read-only (get-audit-event (event-id uint))
  (map-get? audit-events { event-id: event-id })
)

(define-read-only (get-user-analytics (user principal))
  (map-get? user-analytics { user: user })
)

(define-read-only (get-file-analytics (file-id (string-ascii 64)))
  (map-get? file-analytics { file-id: file-id })
)

(define-read-only (get-daily-stats (date uint))
  (map-get? daily-stats { date: date })
)

(define-read-only (get-user-rate-limits (user principal))
  (map-get? user-rate-limits { user: user, window: (get-current-hour) })
)

(define-read-only (get-security-alert (alert-id uint))
  (map-get? security-alerts { alert-id: alert-id })
)

(define-read-only (is-analytics-enabled)
  (var-get analytics-enabled)
)

(define-read-only (get-audit-counter)
  (var-get audit-counter)
)

;; Administrative functions
(define-public (toggle-analytics)
  (begin
    (var-set analytics-enabled (not (var-get analytics-enabled)))
    (ok (var-get analytics-enabled))
  )
)

(define-public (flag-user (user principal) (reason (string-utf8 256)))
  (let ((current-analytics (unwrap! (map-get? user-analytics { user: user }) ERR_INVALID_INPUT)))
    (map-set user-analytics
      { user: user }
      (merge current-analytics { is-flagged: true })
    )
    (ok true)
  )
)

(define-public (unflag-user (user principal))
  (let ((current-analytics (unwrap! (map-get? user-analytics { user: user }) ERR_INVALID_INPUT)))
    (map-set user-analytics
      { user: user }
      (merge current-analytics { is-flagged: false })
    )
    (ok true)
  )
)

(define-public (resolve-security-alert (alert-id uint))
  (let ((alert-data (unwrap! (map-get? security-alerts { alert-id: alert-id }) ERR_EVENT_NOT_FOUND)))
    (map-set security-alerts
      { alert-id: alert-id }
      (merge alert-data { auto-resolved: true })
    )
    (ok true)
  )
)

(define-read-only (get-user-activity-summary (user principal))
  (let ((analytics (map-get? user-analytics { user: user }))
        (current-limits (map-get? user-rate-limits { user: user, window: (get-current-hour) })))
    {
      analytics: analytics,
      current-limits: current-limits,
      is-rate-limited: (match current-limits
        limits (or 
                 (>= (get upload-count limits) u50)
                 (>= (get download-count limits) u200)
                 (>= (get share-count limits) u100))
        false)
    }
  )
)

(define-read-only (get-system-health)
  (let ((current-day (get-current-day))
        (today-stats (map-get? daily-stats { date: current-day })))
    {
      current-block: stacks-block-height,
      audit-events-count: (var-get audit-counter),
      analytics-enabled: (var-get analytics-enabled),
      today-stats: today-stats
    }
  )
)
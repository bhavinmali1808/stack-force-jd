# Complete Mail Infrastructure Deployment Guide

Production deployment guide for running a dedicated Mail Server setup with Postfix (SMTP), Dovecot (IMAP/POP3), OpenDKIM, and Rspamd/SpamAssassin on Ubuntu/Debian Linux.

---

## 1. Postfix Setup (`/etc/postfix/main.cf`)

```ini
# Basic settings
myhostname = mail.resuming.io
mydomain = resuming.io
myorigin = $mydomain
inet_interfaces = all
inet_protocols = ipv4

# TLS configuration
smtpd_tls_cert_file=/etc/letsencrypt/live/mail.resuming.io/fullchain.pem
smtpd_tls_key_file=/etc/letsencrypt/live/mail.resuming.io/privkey.pem
smtpd_use_tls=yes
smtpd_tls_security_level = may
smtp_tls_security_level = may

# DKIM & Milter Integration (OpenDKIM / Rspamd)
smtpd_milters = inet:127.0.0.1:8891, inet:127.0.0.1:11332
non_smtpd_milters = inet:127.0.0.1:8891, inet:127.0.0.1:11332
milter_default_action = accept

# Bounce & DSN Configuration
soft_bounce = no
bounce_queue_lifetime = 5d
maximal_queue_lifetime = 5d
```

---

## 2. Dovecot IMAP/POP3 Setup (`/etc/dovecot/dovecot.conf`)

```ini
protocols = imap pop3 lmtp

# SSL/TLS
ssl = required
ssl_cert = </etc/letsencrypt/live/mail.resuming.io/fullchain.pem
ssl_key = </etc/letsencrypt/live/mail.resuming.io/privkey.pem

# Mailbox storage
mail_location = maildir:~/Maildir

passdb {
  driver = pam
}

userdb {
  driver = passwd
}
```

---

## 3. Required DNS Records Setup

| Type | Name | Value / Target | Description |
|---|---|---|---|
| **A** | `mail.resuming.io` | `YOUR_SERVER_IPV4` | Primary Mail Host IP |
| **MX** | `@` | `mail.resuming.io` (Priority 10) | Mail Exchange Server |
| **TXT** | `@` | `v=spf1 mx ip4:YOUR_SERVER_IPV4 ~all` | SPF Authentication |
| **TXT** | `default._domainkey` | `v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY` | DKIM Public Key Signature |
| **TXT** | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@resuming.io` | DMARC Enforcement Policy |
| **PTR** | `YOUR_SERVER_IPV4` | `mail.resuming.io` | Reverse DNS PTR Record |

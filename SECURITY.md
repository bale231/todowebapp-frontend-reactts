# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Security Features

### Authentication & Authorization
- **JWT Authentication**: Secure token-based authentication with access and refresh tokens
- **Session Management**: Tokens stored securely with automatic refresh mechanism
- **Protected Routes**: All sensitive routes require valid authentication

### Data Protection
- **HTTPS Only**: All API communications are encrypted via HTTPS
- **Input Validation**: Client-side validation to prevent malformed data
- **XSS Prevention**: React's built-in escaping and sanitization

### Privacy
- **Minimal Data Collection**: Only essential user data is collected
- **Secure Sharing**: List and category sharing requires explicit user consent
- **No Third-Party Tracking**: No analytics or tracking scripts included

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

**Email**: [luigibalestrucci52@gmail.com](mailto:luigibalestrucci52@gmail.com)

**Subject Line**: `[SECURITY] TodoWebApp - Brief Description`

### What to Include

1. **Description**: Clear explanation of the vulnerability
2. **Steps to Reproduce**: Detailed steps to replicate the issue
3. **Impact Assessment**: Potential impact if exploited
4. **Suggested Fix** (optional): If you have a potential solution

### Response Timeline

| Action | Timeframe |
| ------ | --------- |
| Initial Response | 48 hours |
| Status Update | 7 days |
| Resolution Target | 30 days |

### What to Expect

- **Acknowledgment**: You will receive confirmation of your report within 48 hours
- **Updates**: Regular updates on the investigation progress
- **Credit**: Public acknowledgment (if desired) after the fix is deployed
- **No Legal Action**: We will not pursue legal action against researchers who follow responsible disclosure

## Security Best Practices for Users

1. **Strong Passwords**: Use unique, complex passwords for your account
2. **Logout on Shared Devices**: Always logout when using public or shared computers
3. **Keep Browser Updated**: Use the latest version of your browser
4. **Verify Sharing**: Double-check before sharing lists with other users

## Known Limitations

- This is a personal project and may not meet enterprise security standards
- Security updates are provided on a best-effort basis
- The application relies on third-party hosting (PythonAnywhere) for backend services

## Contact

For general security questions or concerns:
- **Email**: [luigibalestrucci52@gmail.com](mailto:luigibalestrucci52@gmail.com)
- **GitHub Issues**: For non-sensitive security discussions

---

*Last updated: February 2026*

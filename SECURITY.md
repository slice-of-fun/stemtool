# Security Policy

## Reporting a Vulnerability

Please **do not open a public issue** for security problems.

Report vulnerabilities privately via GitHub's [private vulnerability reporting](https://github.com/slice-of-fun/stemtool/security/advisories/new) (Security → Report a vulnerability). That keeps the issue hidden until it is fixed.

When reporting, include:

- what you found and why it is a problem
- steps to reproduce (or a minimal proof of concept)
- affected version(s) and platform(s)
- contact info if you want a direct reply

Reports are reviewed promptly and you will be kept updated as the issue is triaged and fixed.

## Supported Versions

Only the **latest release** is supported. Users are expected to update through the in-app updater (or re-download from [Releases](https://github.com/slice-of-fun/stemtool/releases)).

| Version | Supported |
| ------- | --------- |
| latest  | ✅        |
| older   | ❌        |

## Scope

The following are in scope:

- the Electron app (main, preload, renderer) in `src/`
- the Python sidecar and scripts in `python/`
- the Premiere Pro plugin in `premiere-plugin/`

### Known considerations

- On first launch the app downloads third-party components and installs them: a Python runtime, pip packages, and model weights (fetched over HTTPS from Hugging Face). Treat your network and the first-run downloads accordingly.
- The app shells out to `yt-dlp` and a bundled `ffmpeg` binary.

## Coordinated Disclosure

Details of a reported issue will not be published without agreement. Please provide a reasonable window (default 30 days) to fix and release before public disclosure.
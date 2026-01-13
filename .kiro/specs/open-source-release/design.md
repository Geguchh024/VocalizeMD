# Design Document: Open Source Release Preparation

## Overview

This design document outlines the approach for preparing the Vocalize MD VS Code extension for open-source release. The extension converts Markdown files to speech using Deepgram TTS and Gemini AI (via OpenRouter) for intelligent text processing. The preparation involves code optimization, documentation creation, licensing, and marketplace readiness.

## Architecture

The project follows a standard VS Code extension architecture with the following structure:

```
vocalize-md/
├── src/
│   ├── extension.ts      # Main extension entry point
│   ├── config.ts         # Configuration management
│   ├── api/
│   │   ├── deepgram.ts   # Deepgram TTS client
│   │   └── openrouter.ts # OpenRouter/Gemini client
│   └── utils/
│       └── text.ts       # Text processing utilities
├── media/
│   ├── panel.html        # Webview UI
│   └── panel.css         # Webview styles
├── README.md             # Main documentation
├── CONTRIBUTING.md       # Contribution guidelines
├── CHANGELOG.md          # Version history
├── LICENSE               # MIT license
├── .gitignore            # Git ignore rules
├── .vscodeignore         # VS Code package ignore rules
├── package.json          # Extension manifest
├── tsconfig.json         # TypeScript configuration
└── Vocalize_MD_Logo.png  # Extension icon
```

## Components and Interfaces

### 1. Configuration Module (`src/config.ts`)

Handles all extension configuration with type safety.

```typescript
/**
 * Extension configuration interface
 */
export interface VocalizeMdConfig {
  deepgramApiKey: string;
  openrouterApiKey: string;
  voice: VoiceModel;
}

/**
 * Available voice models for Deepgram TTS
 */
export type VoiceModel = 
  | 'aura-asteria-en'
  | 'aura-luna-en'
  | 'aura-stella-en'
  | 'aura-orion-en'
  | 'aura-arcas-en'
  | 'aura-perseus-en';

/**
 * Retrieves the current extension configuration from VS Code settings
 * @returns The current configuration object
 */
export function getConfig(): VocalizeMdConfig;

/**
 * Validates that required API keys are configured
 * @param config - The configuration to validate
 * @returns Validation result with missing keys if any
 */
export function validateConfig(config: VocalizeMdConfig): ValidationResult;
```

### 2. Deepgram API Client (`src/api/deepgram.ts`)

Handles text-to-speech conversion with chunking support.

```typescript
/**
 * Word timing information from Deepgram response
 */
export interface WordTiming {
  word: string;
  start: number;
  end: number;
}

/**
 * Speech generation result
 */
export interface SpeechResult {
  audio: string;  // Base64 encoded audio
  words: WordTiming[];
}

/**
 * Generates speech from text using Deepgram TTS API
 * @param text - The text to convert to speech
 * @param apiKey - Deepgram API key
 * @param voice - Voice model to use
 * @returns Speech result with audio and word timings
 * @throws Error if API request fails
 */
export async function generateSpeech(
  text: string, 
  apiKey: string, 
  voice: string
): Promise<SpeechResult>;
```

### 3. OpenRouter API Client (`src/api/openrouter.ts`)

Handles Markdown to readable text conversion via Gemini.

```typescript
/**
 * Converts Markdown to readable plain text using Gemini via OpenRouter
 * @param markdown - The Markdown content to convert
 * @param apiKey - OpenRouter API key
 * @returns Cleaned plain text suitable for TTS
 * @throws Error if API request fails or rate limited
 */
export async function convertMarkdownToText(
  markdown: string, 
  apiKey: string
): Promise<string>;
```

### 4. Text Utilities (`src/utils/text.ts`)

Text processing helpers.

```typescript
/**
 * Splits text into chunks suitable for TTS processing
 * @param text - The text to split
 * @param maxLength - Maximum chunk length (default: 1800)
 * @returns Array of text chunks
 */
export function splitIntoChunks(text: string, maxLength?: number): string[];
```

## Data Models

### Package.json Schema Extensions

```json
{
  "icon": "Vocalize_MD_Logo.png",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/USERNAME/vocalize-md"
  },
  "homepage": "https://github.com/USERNAME/vocalize-md#readme",
  "bugs": {
    "url": "https://github.com/USERNAME/vocalize-md/issues"
  },
  "keywords": [
    "markdown",
    "text-to-speech",
    "tts",
    "accessibility",
    "deepgram",
    "audio",
    "read-aloud"
  ],
  "publisher": "YOUR_PUBLISHER_ID",
  "galleryBanner": {
    "color": "#0d1117",
    "theme": "dark"
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: API Keys Not Hardcoded

*For any* source file in the project, the file content SHALL NOT contain patterns matching API key formats (long alphanumeric strings that could be secrets).

**Validates: Requirements 5.5, 9.1**

### Property 2: Error Messages Are User-Friendly

*For any* error thrown by API client functions, the error message SHALL contain actionable guidance (not just technical error codes).

**Validates: Requirements 4.5, 5.3**

### Property 3: Configuration Reads From VS Code Settings

*For any* configuration value used in the extension, the value SHALL be retrieved from `vscode.workspace.getConfiguration()` and not from hardcoded values.

**Validates: Requirements 9.1**

### Property 4: Public Functions Have Documentation

*For any* exported function in the codebase, the function SHALL have a JSDoc comment describing its purpose.

**Validates: Requirements 5.2**

## Error Handling

### API Error Handling Strategy

1. **Missing API Keys**: Show warning message with "Open Settings" action button
2. **Rate Limiting (429)**: Implement exponential backoff with up to 3 retries
3. **Network Errors**: Display user-friendly message with retry suggestion
4. **Invalid Response**: Log error details and show generic error to user

### Error Message Format

```typescript
// Good: Actionable error message
"Deepgram API key required. Click 'Open Settings' to configure."

// Bad: Technical error only
"401 Unauthorized"
```

## Testing Strategy

### Unit Tests

Unit tests verify specific examples and edge cases:

- Configuration validation with missing keys
- Text chunking with various input sizes
- Error message formatting

### Property-Based Tests

Property tests verify universal properties across all inputs using a property-based testing library (fast-check for TypeScript):

- **Property 1**: Scan all source files for potential hardcoded secrets
- **Property 2**: Verify error messages contain guidance keywords
- **Property 3**: Verify configuration access patterns
- **Property 4**: Verify JSDoc presence on exports

Each property test should run minimum 100 iterations and be tagged with:
- **Feature: open-source-release, Property {number}: {property_text}**

### Test Configuration

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "fast-check": "^3.0.0"
  }
}
```

## File Deliverables

### LICENSE (MIT)

Standard MIT license with current year and copyright holder.

### README.md Structure

1. Logo and title
2. Badges (version, license, VS Code version)
3. Description
4. Features list
5. Installation (marketplace + manual)
6. API Setup (Deepgram + OpenRouter)
7. Usage guide
8. Configuration options
9. Troubleshooting
10. Contributing link
11. License

### CONTRIBUTING.md Structure

1. Code of Conduct reference
2. Development setup
3. Project structure
4. Coding standards
5. Pull request process
6. Bug reporting
7. Feature requests

### CHANGELOG.md Structure

Following Keep a Changelog format:
- [Unreleased]
- [0.1.0] - Initial release

### .gitignore

```
node_modules/
out/
*.vsix
.vscode-test/
.env
*.log
```

### .vscodeignore

```
.vscode/**
.vscode-test/**
src/**
.gitignore
.git/**
*.map
node_modules/**
tsconfig.json
CONTRIBUTING.md
.github/**
```

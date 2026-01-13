# Contributing to Vocalize MD

Thank you for your interest in contributing to Vocalize MD! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Development Environment Setup

### Prerequisites

- **Node.js**: Version 22.x or higher
- **VS Code**: Version 1.103.0 or higher
- **Git**: For version control
- **TypeScript**: Installed via npm (included in devDependencies)

### Setup Steps

1. **Fork and Clone the Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/vocalize-md.git
   cd vocalize-md
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure API Keys for Testing**
   
   Create a VS Code settings file (`.vscode/settings.json`) with your test API keys:
   ```json
   {
     "vocalizeMd.deepgramApiKey": "your-test-deepgram-key",
     "vocalizeMd.openrouterApiKey": "your-test-openrouter-key"
   }
   ```
   
   **Important**: Never commit API keys to the repository. The `.gitignore` file should exclude `.vscode/settings.json`.

4. **Compile the Extension**
   ```bash
   npm run compile
   ```

5. **Run the Extension in Development Mode**
   - Press `F5` in VS Code to open a new Extension Development Host window
   - Open a Markdown file and test the "Vocalize MD: Read Aloud" command

## Project Structure

```
vocalize-md/
├── src/
│   └── extension.ts          # Main extension entry point with all logic
├── media/
│   ├── panel.html            # Webview UI for audio playback
│   └── panel.css             # Webview styles
├── out/                      # Compiled JavaScript output (generated)
├── node_modules/             # Dependencies (generated)
├── package.json              # Extension manifest and configuration
├── tsconfig.json             # TypeScript compiler configuration
├── README.md                 # User documentation
├── CONTRIBUTING.md           # This file
├── CHANGELOG.md              # Version history
├── LICENSE                   # MIT license
├── .gitignore                # Git ignore rules
├── .vscodeignore             # VS Code package ignore rules
└── Vocalize_MD_Logo.png      # Extension icon
```

### Key Components

- **`src/extension.ts`**: Contains all extension logic including:
  - Command registration (`vocalizeMd.speak`)
  - Configuration management
  - OpenRouter/Gemini API integration for Markdown conversion
  - Deepgram API integration for text-to-speech
  - Webview panel management
  - Text chunking and processing utilities

- **`media/panel.html`**: Webview interface for audio playback with word highlighting

- **`package.json`**: Defines extension metadata, commands, configuration options, and dependencies

## Coding Standards

### TypeScript Guidelines

1. **Type Safety**
   - Use explicit types for function parameters and return values
   - Avoid `any` type unless absolutely necessary
   - Define interfaces for complex data structures

   ```typescript
   // Good
   function getConfig(): Config {
     const cfg = vscode.workspace.getConfiguration('vocalizeMd');
     return {
       deepgramApiKey: cfg.get('deepgramApiKey') || '',
       openrouterApiKey: cfg.get('openrouterApiKey') || '',
       voice: cfg.get('voice') || 'aura-asteria-en'
     };
   }

   // Bad
   function getConfig(): any {
     return vscode.workspace.getConfiguration('vocalizeMd');
   }
   ```

2. **JSDoc Comments**
   - Add JSDoc comments to all exported functions
   - Document parameters, return values, and thrown errors
   - Include usage examples for complex functions

   ```typescript
   /**
    * Splits text into chunks suitable for TTS processing
    * @param text - The text to split
    * @param maxLen - Maximum chunk length (default: 1800)
    * @returns Array of text chunks
    */
   function splitIntoChunks(text: string, maxLen: number): string[] {
     // implementation
   }
   ```

3. **Error Handling**
   - Use try-catch blocks for async operations
   - Provide user-friendly error messages
   - Include actionable guidance in error messages

   ```typescript
   // Good
   if (!config.deepgramApiKey) {
     const action = await vscode.window.showWarningMessage(
       'Deepgram API key required',
       'Open Settings'
     );
     if (action) {
       vscode.commands.executeCommand(
         'workbench.action.openSettings',
         'vocalizeMd.deepgramApiKey'
       );
     }
     return;
   }
   ```

4. **Naming Conventions**
   - Use camelCase for variables and functions
   - Use PascalCase for interfaces and types
   - Use UPPER_CASE for constants
   - Use descriptive names that convey purpose

5. **Code Organization**
   - Keep functions focused on a single responsibility
   - Extract reusable logic into separate functions
   - Group related functionality together

### Formatting

- **Indentation**: 4 spaces (configured in `tsconfig.json`)
- **Line Length**: Aim for 100 characters maximum
- **Semicolons**: Required at end of statements
- **Quotes**: Single quotes for strings (except JSON)
- **Trailing Commas**: Use in multi-line arrays and objects

### Security Best Practices

1. **Never hardcode API keys or secrets** in source code
2. **Always retrieve configuration** from VS Code settings
3. **Validate user input** before processing
4. **Do not log sensitive information** (API keys, tokens)
5. **Use HTTPS** for all API requests

## Pull Request Process

### Before Submitting

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the coding standards

3. **Test your changes**:
   - Compile the extension: `npm run compile`
   - Test in Extension Development Host (F5)
   - Verify all existing functionality still works

4. **Update documentation** if needed:
   - Update README.md for user-facing changes
   - Update CHANGELOG.md with your changes
   - Add JSDoc comments to new functions

5. **Commit your changes** with clear messages:
   ```bash
   git commit -m "Add feature: description of what you added"
   ```

### Submitting the Pull Request

1. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub with:
   - Clear title describing the change
   - Description of what changed and why
   - Reference to any related issues
   - Screenshots/GIFs for UI changes

3. **PR Description Template**:
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation update
   - [ ] Code refactoring

   ## Testing
   How you tested the changes

   ## Related Issues
   Fixes #issue_number
   ```

### Review Process

- Maintainers will review your PR and may request changes
- Address feedback by pushing new commits to your branch
- Once approved, a maintainer will merge your PR

## Bug Reporting Guidelines

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Test with the latest version** of the extension
3. **Verify your API keys** are configured correctly

### Creating a Bug Report

Use the following template when reporting bugs:

```markdown
## Bug Description
Clear description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. Step three

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- VS Code Version: [e.g., 1.103.0]
- Extension Version: [e.g., 0.1.0]
- Operating System: [e.g., Windows 11, macOS 14]

## Additional Context
- Error messages from Developer Console (Help > Toggle Developer Tools)
- Screenshots if applicable
- Markdown file content (if relevant and not sensitive)
```

### Security Issues

**Do not report security vulnerabilities in public issues.** Instead, email the maintainers directly with details.

## Feature Request Process

### Suggesting Features

1. **Check existing issues** for similar requests
2. **Open a new issue** with the "Feature Request" label
3. **Provide context**:
   - What problem does this solve?
   - How would you use this feature?
   - Are there alternative solutions?

### Feature Request Template

```markdown
## Feature Description
Clear description of the proposed feature

## Use Case
Why is this feature needed? What problem does it solve?

## Proposed Solution
How you envision this working

## Alternatives Considered
Other approaches you've thought about

## Additional Context
Mockups, examples, or references
```

## Development Tips

### Debugging

1. **Use VS Code's debugger**:
   - Set breakpoints in `src/extension.ts`
   - Press F5 to start debugging
   - Use Debug Console to inspect variables

2. **Check Developer Tools**:
   - In Extension Development Host: Help > Toggle Developer Tools
   - View console logs and network requests

3. **Test API calls separately**:
   - Use tools like Postman to verify API responses
   - Check API documentation for Deepgram and OpenRouter

### Common Issues

- **"Command not found"**: Ensure extension is activated (open a Markdown file)
- **API errors**: Verify API keys are correct and have sufficient credits
- **Compilation errors**: Run `npm install` to ensure dependencies are up to date
- **Webview not loading**: Check that `media/` files exist and paths are correct

## Questions?

If you have questions about contributing, feel free to:
- Open a discussion on GitHub
- Comment on relevant issues
- Reach out to maintainers

Thank you for contributing to Vocalize MD! 🎉

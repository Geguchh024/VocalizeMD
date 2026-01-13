# Implementation Plan: Open Source Release Preparation

## Overview

This plan transforms the Vocalize MD VS Code extension into a production-ready open-source project with proper documentation, licensing, and code organization.

## Tasks

- [x] 1. Add project icon and update package.json metadata
  - [x] 1.1 Update package.json with icon field pointing to Vocalize_MD_Logo.png
    - Add `"icon": "Vocalize_MD_Logo.png"` to package.json
    - Add `"license": "MIT"` field
    - Add `"publisher"` field (placeholder for user to fill)
    - Add `"repository"`, `"homepage"`, `"bugs"` URL fields
    - Add `"keywords"` array for marketplace discoverability
    - Add `"galleryBanner"` configuration
    - _Requirements: 1.1, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 2. Create LICENSE file
  - [x] 2.1 Create MIT LICENSE file in project root
    - Include current year (2026) and copyright holder placeholder
    - Standard MIT license text
    - _Requirements: 2.1, 2.2_

- [x] 3. Create comprehensive README.md
  - [x] 3.1 Create README.md with full documentation
    - Project logo and title
    - Description of the extension
    - Features list
    - Installation instructions (marketplace + manual)
    - API setup for Deepgram (step-by-step with links)
    - API setup for OpenRouter (step-by-step with links)
    - Usage guide with screenshots placeholder
    - Configuration options table
    - Troubleshooting section
    - Contributing section with link
    - License badge and reference
    - Security warning about API keys
    - _Requirements: 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.1, 4.2, 4.3, 4.4, 9.3_

- [x] 4. Create CONTRIBUTING.md
  - [x] 4.1 Create CONTRIBUTING.md with contribution guidelines
    - Development environment setup
    - Project structure explanation
    - Coding standards (TypeScript, formatting)
    - Pull request process
    - Bug reporting guidelines
    - Feature request process
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5. Create CHANGELOG.md
  - [x] 5.1 Create CHANGELOG.md following Keep a Changelog format
    - Header with format explanation link
    - [Unreleased] section
    - [0.1.0] initial release with features
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 6. Create .gitignore file
  - [x] 6.1 Create comprehensive .gitignore
    - Node modules
    - Build output
    - VS Code test files
    - Environment files
    - Log files
    - VSIX packages
    - _Requirements: 9.2_

- [x] 7. Create .vscodeignore file
  - [x] 7.1 Create .vscodeignore for lean extension package
    - Exclude source files (only ship compiled)
    - Exclude development configs
    - Exclude test files
    - Keep media folder and icon
    - _Requirements: 10.1_

- [x] 8. Optimize extension code with JSDoc comments
  - [x] 8.1 Add JSDoc comments to src/extension.ts
    - Document all exported functions
    - Document interfaces and types
    - Add parameter and return descriptions
    - _Requirements: 5.2, 5.4_

- [x] 9. Checkpoint - Review all documentation
  - Ensure all files are created correctly
  - Verify package.json has all required fields
  - Ask the user if questions arise

- [ ]* 10. Write property tests for code quality
  - [ ]* 10.1 Write property test for no hardcoded secrets
    - **Property 1: API Keys Not Hardcoded**
    - **Validates: Requirements 5.5, 9.1**
  - [ ]* 10.2 Write property test for JSDoc coverage
    - **Property 4: Public Functions Have Documentation**
    - **Validates: Requirements 5.2**

- [ ] 11. Final checkpoint - Verify marketplace readiness
  - Run `npm run compile` to verify build
  - Verify all documentation files exist
  - Ensure icon displays correctly
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The publisher field in package.json needs to be filled by the user with their VS Code marketplace publisher ID
- Repository URLs should be updated by the user with their actual GitHub repository
- The icon file (Vocalize_MD_Logo.png) is located in the assets folder

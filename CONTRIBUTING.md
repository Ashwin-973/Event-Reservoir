# Contributing to Event Reservoir

Thank you for considering contributing to Event Reservoir! This document outlines the process for contributing to the project and provides guidelines to make the contribution process smooth for all involved.

## Code of Conduct

By participating in this project, you agree to abide by the following conduct guidelines:

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list to see if someone else has already reported the issue. When you are creating a bug report, please include as many details as possible:

- **Use a clear and descriptive title** for the issue
- **Describe the exact steps to reproduce the problem** in as much detail as possible
- **Provide specific examples** to demonstrate the steps
- **Describe the behavior you observed after following the steps**
- **Explain the behavior you expected to see instead and why**
- **Include screenshots and videos** if possible
- **Include details about your environment** (OS, browser, Node.js version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Use a clear and descriptive title** for the issue
- **Provide a step-by-step description** of the suggested enhancement
- **Describe the current behavior** and **explain the behavior you'd like to see**
- **Explain why this enhancement would be useful** to most Event Reservoir users

### Pull Requests

- Fill in the required template
- Do not include issue numbers in the PR title
- Follow the coding conventions used throughout the project
- Include appropriate test cases
- Document new code
- End all files with a newline

## Development Setup

### Prerequisites

- Node.js v14 or higher
- npm or yarn
- PostgreSQL database (or Neon PostgreSQL)

### Setup

1. Fork the repository
2. Clone your fork:
```bash
git clone https://github.com/your-username/event-reservoir.git
cd event-reservoir
```

3. Add the original repository as a remote:
```bash
git remote add upstream https://github.com/original-owner/event-reservoir.git
```

4. Install dependencies:
```bash
# For backend
cd backend
npm install

# For frontend
cd ../frontend
npm install
```

5. Create your feature branch:
```bash
git checkout -b feature/your-feature-name
```

### Development Workflow

1. Make your changes in your feature branch
2. Run tests to ensure your changes don't break existing functionality:
```bash
# In backend directory
npm test

# In frontend directory
npm test
```

3. Ensure your code follows the project's style guidelines:
```bash
# In frontend directory
npm run lint
```

4. Commit your changes with a descriptive commit message:
```bash
git commit -m "Add feature: description of changes"
```

5. Push to your fork:
```bash
git push origin feature/your-feature-name
```

6. Create a Pull Request from your fork to the main repository

## Coding Guidelines

### JavaScript / React

- Use functional components with hooks in React
- Use ES6+ features
- Add proper JSDoc comments for functions and components
- Follow the existing project structure

### Backend

- Follow RESTful principles for API endpoints
- Properly validate inputs
- Include error handling
- Document API endpoints

### Database

- Follow the established schema design
- Write reversible migrations
- Include indexes for frequently queried fields

## Testing

- Write unit tests for services and components
- Include integration tests for API endpoints
- Test offline functionality with network disconnection scenarios

## Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests after the first line

## License

By contributing to Event Reservoir, you agree that your contributions will be licensed under the same license as the project (MIT License). 
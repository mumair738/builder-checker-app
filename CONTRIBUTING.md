# Contributing to Builder Score App

Thank you for your interest in contributing to Builder Score App! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in the Issues section
2. If not, create a new issue with:
   - A clear, descriptive title
   - Steps to reproduce the bug
   - Expected vs actual behavior
   - Environment details (OS, Node version, etc.)
   - Screenshots if applicable

### Suggesting Features

1. Check if the feature has already been suggested
2. Create a new issue with:
   - A clear description of the feature
   - Use cases and benefits
   - Any implementation ideas you have

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes following the coding standards
4. Write or update tests if applicable
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to your branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/builder-score-app.git
cd builder-score-app
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment variables:
```bash
cp .env.local.example .env.local
```

4. Update `.env.local` with your API keys

5. Run the development server:
```bash
npm run dev
```

## Coding Standards

- Follow TypeScript best practices
- Use Tailwind CSS for styling
- Keep files under 500 lines when possible
- Write clear, self-documenting code
- Add comments for complex logic
- Follow the existing code style

## File Structure Guidelines

- Aim for 200-400 lines per file
- Keep files under 500 lines
- Never exceed 800-1000 lines unless exceptions (config/generated files)

## Testing

- Test your changes locally before submitting
- Ensure the build passes: `npm run build`
- Check for linting errors: `npm run lint`

## Commit Messages

Use clear, descriptive commit messages:
- `feat: Add leaderboard component`
- `fix: Resolve wallet connection issue`
- `docs: Update README with new API info`
- `style: Format code with prettier`
- `refactor: Simplify API client logic`

## Questions?

Feel free to open an issue for any questions or concerns.

Thank you for contributing! 🚀


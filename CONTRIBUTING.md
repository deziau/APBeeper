
# Contributing to APBeeper Bot

Thank you for your interest in contributing to APBeeper Bot! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

### Reporting Bugs

1. **Check existing issues** first to avoid duplicates
2. **Use the bug report template** when creating new issues
3. **Provide detailed information**:
   - Bot version
   - Node.js version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages/logs

### Suggesting Features

1. **Check existing feature requests** to avoid duplicates
2. **Use the feature request template**
3. **Provide clear use cases** and benefits
4. **Consider implementation complexity**

### Code Contributions

#### Getting Started

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/yourusername/apbeeper_bot.git
   cd apbeeper_bot
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up environment**:
   ```bash
   cp .env.example .env
   # Configure your .env file
   npm run setup
   ```

#### Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Make your changes**
3. **Test your changes**:
   ```bash
   npm run dev
   npm run test-env
   ```
4. **Commit with clear messages**:
   ```bash
   git commit -m "feat: add new command for server statistics"
   ```
5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Create a Pull Request**

## 📋 Code Standards

### JavaScript Style Guide

- **Use ES6+ features** where appropriate
- **Follow consistent naming conventions**:
  - camelCase for variables and functions
  - PascalCase for classes
  - UPPER_SNAKE_CASE for constants
- **Add JSDoc comments** for functions and classes
- **Use async/await** instead of callbacks where possible

### File Organization

- **Commands**: Place in `src/commands/`
- **Services**: Place in `src/services/`
- **Utilities**: Place in `src/utils/`
- **Tests**: Place in `tests/` (when implemented)

### Commit Message Format

Use conventional commits format:
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

Examples:
```
feat(commands): add server status command
fix(database): resolve connection timeout issue
docs(readme): update installation instructions
```

## 🧪 Testing

### Manual Testing

1. **Test all commands** in a development Discord server
2. **Verify database operations** work correctly
3. **Check error handling** for edge cases
4. **Test environment variable validation**

### Automated Testing (Future)

- Unit tests for utility functions
- Integration tests for database operations
- Command testing framework
- CI/CD pipeline validation

## 🔒 Security Guidelines

### Environment Variables

- **Never commit** `.env` files
- **Use `.env.example`** for documentation
- **Validate all inputs** from Discord commands
- **Sanitize database queries**

### API Keys

- **Rotate keys regularly**
- **Use least privilege principle**
- **Store securely** in production

## 📚 Documentation

### Code Documentation

- **Add JSDoc comments** for all public functions
- **Document complex algorithms**
- **Explain non-obvious code sections**
- **Update README** for new features

### User Documentation

- **Update command documentation**
- **Add troubleshooting guides**
- **Create setup tutorials**
- **Maintain changelog**

## 🚀 Deployment

### Testing Deployments

1. **Test locally** first
2. **Deploy to staging** environment
3. **Verify all functionality**
4. **Check logs** for errors

### Production Deployments

- **Use Railway** for production hosting
- **Monitor deployment** logs
- **Test critical functionality** post-deployment
- **Have rollback plan** ready

## 🆘 Getting Help

### Community Support

- **GitHub Discussions** for general questions
- **GitHub Issues** for bugs and feature requests
- **Discord Server** for real-time help (if available)

### Maintainer Contact

- Create an issue for bugs or features
- Tag maintainers in discussions
- Be patient and respectful

## 📋 Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Code follows style guidelines
- [ ] All tests pass (when implemented)
- [ ] Documentation is updated
- [ ] Commit messages follow convention
- [ ] PR description explains changes
- [ ] No sensitive information is committed
- [ ] Feature works in development environment

## 🎯 Priority Areas

We especially welcome contributions in:

- **Testing framework** implementation
- **Performance optimizations**
- **New Discord commands**
- **Database improvements**
- **Documentation enhancements**
- **Error handling improvements**

## 📄 License

By contributing to APBeeper Bot, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to APBeeper Bot! 🎮

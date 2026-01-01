# Contributing to Audial

Thank you for pushing forward the future of AI-powered music creation. You are making history. Let's build something wonderful.

---

## Quick Start

```bash
git clone https://github.com/DorsaRoh/audial.git
cd audial
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), add your API key in settings, and you're ready.

---

## Prerequisites

- **Node.js** 18+
- **pnpm** (or npm/yarn)
- **API key** from [Anthropic](https://console.anthropic.com/) or [OpenAI](https://platform.openai.com/)

---

## Development Workflow

### Before Submitting a PR

```bash
pnpm check
```

This runs typecheck, tests, and build, showing a summary:

```
━━━ Running checks ━━━

typecheck... ✓ pass
test... ✓ pass
build... ✓ pass

━━━ Summary ━━━
3/3 passed, 0 failed
```

All checks must pass.

---

## Project Structure

```
audial/
├── app/                  # Next.js app directory
│   ├── api/claude/       # LLM API endpoint
│   └── page.tsx          # Main page
├── components/           # React components
├── lib/                  # Utilities and business logic
│   ├── ai/               # System prompts, taste framework
│   ├── dataset/          # Song retrieval system
│   └── *.ts              # Parsing, validation
├── public/assets/        # Static assets, song dataset
└── docs/                 # Documentation
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/systemPrompt.ts` | Main AI system prompt |
| `lib/ai/musicalTaste.ts` | Musical taste framework |
| `lib/ai/claudeStrudelSpec.ts` | Strudel syntax rules for AI |
| `lib/creativeDirectives.ts` | Creative directives for generation |
| `components/ClaudePanel.tsx` | Chat interface |
| `components/SettingsModal.tsx` | Settings modal for API keys |
| `components/StrudelHost.tsx` | Strudel player component |
| `app/api/claude/route.ts` | Streaming API endpoint |

---

## Making Changes

### Branching

```bash
git checkout -b your-branch
```

Branch from `main`. Keep branches focused.

### Commit Messages

Write clear, descriptive commits:

```
Add quick action for tempo changes
Fix parsing error with backticks in code
Update system prompt for better drum patterns
```

### Code Style

- **TypeScript** for all new code
- Keep functions small and focused
- Prefer clarity over cleverness

---

## Testing

### Unit Tests

```bash
pnpm test           # Run all tests
pnpm test:watch     # Watch mode
```

Tests live in `lib/__tests__/` covering parsing, validation, and retrieval.

### Manual Testing

1. `pnpm dev`
2. Open [http://localhost:3000](http://localhost:3000)
3. Add API key in settings
4. Test with various prompts

---

## Submitting a Pull Request

1. Push your branch
2. Open a PR on GitHub
3. Describe what the change does and how you tested it

### PR Checklist

- [ ] Code follows existing style
- [ ] All checks pass (`pnpm check`)

---

## Reporting Bugs

Open an issue with:

- What you expected vs what happened
- Steps to reproduce
- The prompt you used

---

## Proposing Features

Open an issue with:

- The problem you're solving
- Your proposed solution


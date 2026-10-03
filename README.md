# Recall

Turn a lecture into something you can study from. Recall is a free, open-source study app that runs on your own computer: give it a PDF, some pasted text, a link or just a topic, and it produces notes, a guided lesson with questions, flashcards and quizzes, with a tutor chat that stays on that material.

![Notes view](docs/screenshots/notes.png)

## Status

This is an early build.

- **Working now:** the full interface, running on built-in sample lessons. Library and folders, new lesson flow, streamed notes with math, tables and code, the guided lesson reader, flashcards, quizzes, the source view, chat panel, settings, light and dark themes, and a phone layout.
- **Not built yet:** the backend. Files are not read, nothing is sent to a model, and sign-in is a placeholder. Every lesson you create shows the same sample content.

The plan for the backend is in [docs/architecture.md](docs/architecture.md): SQLite storage, PDF text extraction, Sign in with ChatGPT so the app can use your own ChatGPT plan, and streamed generation.

## Run it

Needs Node.js 22 or later.

```bash
npm install
npm run dev
```

Then open http://127.0.0.1:4517. The sample library is at `/app` and the design system is at `/design`.

Sample data lives in your browser's local storage. Settings has a reset button.

## How it is put together

- **Next.js (App Router) and TypeScript.**
- **Tailwind CSS 4** driven by design tokens. `docs/design/tokens.json` is the source; `npm run tokens` regenerates the CSS in `src/styles/`. Components use role names such as `bg-surface` and `text-muted`, never raw colours.
- **One data interface.** Screens only talk to `DataLayer` in `src/lib/data/types.ts`. Today it is implemented by a browser-side sample layer (`src/lib/data/fake.ts`); the real backend will implement the same interface.
- **Accessible primitives** in `src/components/ui/`, built on Radix where it helps. Text and UI colours meet WCAG AA in both themes.

More detail:

- [docs/architecture.md](docs/architecture.md): run modes, stack, API and build order
- [docs/schema.sql](docs/schema.sql): the planned database schema
- [docs/design/components.md](docs/design/components.md): component specs
- [docs/screenshots](docs/screenshots): every screen

## Keyboard

| Where | Keys |
| --- | --- |
| Lesson reader | Enter to continue, 1-4 to pick an answer |
| Quiz | 1-4 to pick, Enter to check |
| Flashcards | Space to turn the card, 1 still learning, 2 got it |

## Licence

MIT. See [LICENSE](LICENSE).

Recall is a personal, non-commercial project and is not affiliated with OpenAI.

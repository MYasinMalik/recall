# Recall components

The system is "paper and ink": warm paper background, ink text, one deep green accent, serif headings (Newsreader), sans interface text (Inter), mono labels (IBM Plex Mono), hairline borders instead of heavy shadows, small radii. Icons are Lucide (ISC licence). All three fonts are under the SIL Open Font Licence. No mascot, no illustrations.

Tokens: `tokens.json` is the source. `npm run tokens` writes `tokens.css` and `tailwind-theme.css` into `src/styles/`. Components use role classes (`bg-surface`, `text-muted`, `border-border-input`), never raw hex. Light and dark are both defined; dark follows the system unless `data-theme` is set on `<html>`.

Built primitives live in `src/components/ui/` and are shown in every state at `/design`. Screenshots: `design-light.png`, `design-dark.png`.

## Layout rules

Layout decisions:

- **Library-first home.** A persistent left sidebar (264px) holds folders and lessons; the main pane opens on the library with a "New lesson" strip at the top.
- **Lesson views are tabs across the top** of the lesson (Lesson, Notes, Cards, Quiz, Source), underlined, not an icon rail down the side.
- **Reading column.** Lesson and note text sits in a 680px column at 18/30. Workspace max width is 1240px.
- **Chat is a side panel** that can dock beside Notes or Source, and collapses to a button below 900px.
- **Header** is 56px: lesson title on the left, save state and actions on the right.
- Breakpoints: 640 (single column, sidebar becomes a drawer), 900 (chat panel docks), 1200 (full workspace).
- Spacing scale: 0, 4, 8, 12, 16, 24, 32, 48, 64, 96. Radius: 4, 8, 12. Motion: 120ms and 200ms, and all motion is removed under `prefers-reduced-motion`.

## Built

```
Button
  variants  primary, secondary, ghost, danger
  sizes     sm 32px, md 40px, lg 48px
  states    default, hover, active, focus-visible (2px accent outline, 2px offset), disabled, loading
  tokens    primary: bg accent, text on-accent; secondary: border border-input, bg surface;
            danger: border and text danger, hover bg danger-soft; radius md; font sm/500
  a11y      real <button>; loading sets aria-busy, disables, keeps the label; optional Kbd hint inside
  used on   all

IconButton
  sizes     40px default, 32px compact
  states    default, hover, focus-visible, disabled
  a11y      label is required and becomes aria-label and title
  used on   library, notes, chat, dialogs

Input / Textarea
  states    default, hover, focus-visible, filled, disabled, invalid
  tokens    border border-input (3.85:1 on bg), bg surface, placeholder text-muted, invalid border danger
  a11y      visible <label>; hint or error linked with aria-describedby; error has role=alert and aria-invalid
  used on   new lesson, topic lesson, settings, dialogs

Dropzone
  states    idle, hover, drag-over (accent border, accent-soft fill), invalid (danger border and message)
  a11y      a real button that opens the file picker, so it works by keyboard; hidden <input type=file>;
            error announced with role=alert
  used on   new lesson

Card
  tokens    bg surface, border border, radius lg, shadow card
  used on   library, flashcards, quiz, lesson overview

Badge
  tones     neutral, accent, success, warning, danger
  tokens    soft background with matching text role, mono xs, radius sm
  a11y      colour is never the only signal; every badge carries text
  used on   library (status), flashcards (new / learning / known), quiz (topic)

Banner
  tones     info, success, warning, danger
  slots     icon, title, body, optional action
  a11y      warning and danger use role=alert; info and success use role=status
  used on   generating, chat (usage limit), new lesson (bad file), lesson section (section result)

Progress
  tokens    track sunken, fill accent, height 6px, radius pill
  a11y      role=progressbar with label, min, max and current value
  used on   generating, flashcards, quiz, lesson overview, lesson section

Skeleton
  states    shimmering; static under reduced motion
  a11y      aria-hidden; the region it stands in for carries aria-busy
  used on   library, notes, lesson overview

StreamCaret
  purpose   a blinking accent caret at the end of text the model is still writing
  a11y      aria-hidden; the streaming container is aria-live=polite
  used on   generating, notes, chat

Tabs (lesson views)
  items     Lesson, Notes, Cards, Quiz, Source
  states    default, hover, active (2px accent underline, weight 600), focus-visible, pending dot (not generated yet)
  a11y      Radix Tabs: arrow keys move, Home and End jump, roving tabindex
  used on   notes, flashcards, quiz, lesson overview, source viewer

Dialog
  variants  confirm, form
  tokens    bg surface, border border, radius lg, shadow pop, scrim text at 40%
  a11y      Radix Dialog: focus trap, Escape closes, focus returns to the trigger, title and description linked
  used on   delete lesson, delete folder, move to folder, credential import

Toast
  tones     neutral, danger
  a11y      Radix Toast: announced politely, swipe or button to dismiss, 5s default, pauses on hover and focus
  used on   all

EmptyState
  slots     title, one sentence, one action
  tokens    dashed border border-input, radius lg
  used on   library, flashcards, quiz, chat, folder

ChoiceOption
  states    idle, hover, selected, correct, wrong, dimmed (other options after checking), disabled
  tokens    selected: border accent, bg accent-soft; correct: success pair; wrong: danger pair
  a11y      role=radio inside a radiogroup; correct and wrong also get an icon and screen-reader text,
            so the result never depends on colour; letter key A-D or 1-4 selects, Enter checks
  used on   quiz, lesson section

Flashcard
  states    prompt side, answer side, hover, focus-visible
  tokens    bg surface, border border, radius lg; prompt in serif xl, answer in read
  a11y      a button with aria-pressed; label says which side is showing; Space or Enter turns it
  used on   flashcards

GradeButtons
  items     "Still learning" (1), "Got it" (2)
  a11y      two real buttons with visible key hints; undo is a separate control
  used on   flashcards

ChatMessage
  variants  user (sunken bubble, right), assistant (accent rule on the left, no bubble)
  states    complete, streaming (caret), failed (Banner with retry underneath)
  used on   chat, setup chat, source viewer

Composer
  states    empty (send disabled), typing, sending, disabled
  a11y      labelled textarea; Enter sends, Shift+Enter adds a line; send is an icon button with a label
  used on   chat, topic lesson, setup chat, source viewer
```

## Specified, not yet built

These depend on data or libraries that arrive with the screens, so they are built alongside those screens.

```
Sidebar (library navigation)
  parts     folder tree, lesson list, search field, "New lesson" button, account row
  states    expanded, collapsed to drawer under 640px, folder open or closed, drop target while dragging a lesson
  a11y      <nav> landmark; tree uses arrow keys; drawer traps focus and closes on Escape
  used on   library, folder

LessonRow
  parts     title, source kind, status badge, last opened, overflow menu
  states    default, hover, selected, generating (progress under the title), failed
  used on   library, folder

SourcePicker
  options   File, Text, Link, Topic (segmented control)
  a11y      radio group; arrow keys move
  used on   new lesson

NoteEditor
  base      Tiptap; toolbar: heading, bold, italic, list, table, equation, code, highlight
  states    read, editing, saving ("Saved" / "Saving" in the header), conflict (reload prompt on a revision mismatch)
  a11y      toolbar is role=toolbar with roving focus; shortcuts shown in tooltips
  used on   notes

SectionReader
  parts     header (close, "Section 3 · 2 of 6", progress), stacked blocks, Continue button with Enter hint
  blocks    text, multiple choice, fill-in-the-blank, survey
  states    reading, question unanswered, answered (Banner with explanation), section complete (score and next)
  a11y      a new block receives focus when revealed; Enter continues; 1-4 answers
  used on   lesson section

FillBlank
  parts     sentence with a gap, word chips below
  states    empty, filled, correct, wrong
  a11y      chips are buttons; the gap is announced as "blank"; result announced politely
  used on   lesson section

SectionList
  parts     numbered sections with a connecting rule, status per section (done, current, generating, locked)
  used on   lesson overview

PdfViewer
  parts     page canvas, zoom out, fit width, zoom in, previous and next page, page count
  a11y      controls are labelled buttons; PageUp and PageDown move pages; text layer stays selectable
  used on   source viewer

ModelPicker
  states    loading, list, selected, unavailable
  used on   settings

UsageLimitBanner
  built from Banner (warning) with Retry
  used on   generating, chat

SignInButton
  uses OpenAI's approved "Sign in with ChatGPT" asset and wording, unmodified
  used on   sign-in
```

## Copy rules

- Every label is written fresh. Lesson views are named Lesson, Notes, Cards, Quiz, Source. The assistant is "Tutor", with no character or mascot.
- Flashcard grades are "Still learning" and "Got it"; counts are "new", "learning", "known".
- Empty states say what the screen is for and offer one action.
- Errors say what happened and what to do next, in one or two sentences.

## Contrast

WCAG contrast check of every text and background pair in `tokens.json`: 46 pairs (23 light, 23 dark), 0 failing AA. Lowest text pair is success on success-soft at 5.24:1; lowest UI pair is border-input on bg at 3.85:1.

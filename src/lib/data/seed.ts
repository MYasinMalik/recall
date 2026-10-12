// Sample content written for Recall. It stands in for model output until the AI layer exists.

export const seedSourceText = `Lecture 8: Functions

A function f from X to Y assigns to every element of X exactly one element of Y.
X is the domain, Y is the codomain. The image of f is the set of outputs actually reached.

A function can be seen as a relation that is total (every input is related to something)
and single-valued (no input is related to two things).

Composition: (g after f)(x) = g(f(x)). The identity function sends every x to itself.

Injective: different inputs give different outputs.
Surjective: every element of the codomain is an output.
Bijective: both. A bijection has an inverse.

If there is an injection from X to Y then X is no bigger than Y. If there is a bijection,
X and Y have the same size. A set is countable if it can be put in bijection with a subset
of the natural numbers.`;

export const seedNotes = `# Functions, injections and bijections

A function is a rule that gives **every** input **exactly one** output. Most of this lecture is about what that rule is allowed to do, and what it tells you about the sizes of sets.

## What counts as a function

Write $f : X \\to Y$. The set $X$ is the **domain**, $Y$ is the **codomain**, and the **image** is the set of outputs that are actually reached.

Two conditions must hold:

- **Total**: every $x \\in X$ has an output.
- **Single-valued**: no $x$ has two outputs.

> A rule can fail to be a function by leaving an input out, or by giving one input two answers. Repeating an output is fine.

## Composition and identity

Given $f : X \\to Y$ and $g : Y \\to Z$, the composite is

$$ (g \\circ f)(x) = g(f(x)). $$

The identity $\\mathrm{id}_X$ sends each $x$ to itself, and $f \\circ \\mathrm{id}_X = f$.

## Three properties

| Property | Meaning | Arrow picture |
| --- | --- | --- |
| Injective | different inputs, different outputs | no two arrows land on the same point |
| Surjective | every element of $Y$ is hit | no point of $Y$ is left without an arrow |
| Bijective | both of the above | arrows pair the two sets off exactly |

A bijection has an **inverse** $f^{-1} : Y \\to X$ that undoes it.

## Comparing sizes

- An injection $X \\to Y$ shows $|X| \\le |Y|$.
- A surjection $X \\to Y$ shows $|X| \\ge |Y|$.
- A bijection shows $|X| = |Y|$.

A set is **countable** when it can be paired off with a subset of $\\mathbb{N}$.

## In code

\`\`\`python
def is_injective(f, domain):
    seen = set()
    for x in domain:
        if f(x) in seen:
            return False
        seen.add(f(x))
    return True
\`\`\`
`;

export const shortNotes = `# Reading a proof by induction

Induction proves a statement for every natural number in two moves.

## The two steps

1. **Base case**: show the statement holds for the first value, usually $n = 0$ or $n = 1$.
2. **Inductive step**: assume it holds for $n = k$ and show it then holds for $n = k + 1$.

## A worked example

Claim: $1 + 2 + \\dots + n = \\frac{n(n+1)}{2}$.

The base case $n = 1$ gives $1 = 1$. For the step, add $k + 1$ to both sides of the assumed formula and simplify.
`;

export interface SeedBlock {
  kind: "text" | "mcq" | "fill";
  body: string;
  options?: string[];
  answerIndex?: number;
  explanation?: string;
}

export interface SeedSection {
  kind: "intro" | "content" | "checkpoint" | "final";
  title: string;
  blocks: SeedBlock[];
}

export const seedSections: SeedSection[] = [
  {
    kind: "intro",
    title: "Before you start",
    blocks: [
      {
        kind: "text",
        body: "Functions are the plain idea behind a lot of mathematics and programming: put something in, get one thing out. This lesson pins down what that means and then uses it to compare the sizes of sets.",
      },
      {
        kind: "text",
        body: "**You will cover**\n\n- what makes a rule a function\n- composing functions\n- injective, surjective and bijective\n- what these say about size",
      },
      {
        kind: "mcq",
        body: "A quick guess before the lesson. Which of these must be true of any function?",
        options: [
          "It is given by a formula.",
          "Each input has exactly one output.",
          "Each output comes from exactly one input.",
          "Its outputs are numbers.",
        ],
        answerIndex: 1,
        explanation:
          "A function only promises one output per input. It need not have a formula, and two inputs may share an output.",
      },
    ],
  },
  {
    kind: "content",
    title: "What counts as a function",
    blocks: [
      {
        kind: "text",
        body: "Write $f : X \\to Y$. Every element of the **domain** $X$ is sent to one element of the **codomain** $Y$. Two things can go wrong: an input is left out, or an input gets two outputs.",
      },
      {
        kind: "text",
        body: "Squaring on $\\{-2, -1, 0, 1, 2\\}$ is a function even though $-2$ and $2$ both go to $4$. Sharing an output is allowed. The **image** here is $\\{0, 1, 4\\}$.",
      },
      {
        kind: "fill",
        body: "The set of outputs a function actually reaches is called its ____.",
        options: ["domain", "image", "codomain", "inverse"],
        answerIndex: 1,
        explanation: "The codomain is where outputs are allowed to land; the image is where they do land.",
      },
      {
        kind: "mcq",
        body: "The rule sends each person to a phone number they own. Why might this fail to be a function?",
        options: [
          "Two people might share a number.",
          "Someone might own two numbers, or none.",
          "Phone numbers are not real numbers.",
          "The set of people is too large.",
        ],
        answerIndex: 1,
        explanation:
          "Owning none breaks totality and owning two breaks single-valuedness. Sharing a number would be fine.",
      },
    ],
  },
  {
    kind: "content",
    title: "Injective, surjective, bijective",
    blocks: [
      {
        kind: "text",
        body: "A function is **injective** when different inputs always give different outputs. It is **surjective** when every element of the codomain is reached. It is **bijective** when it is both.",
      },
      {
        kind: "text",
        body: "Only a bijection can be undone. Its **inverse** $f^{-1}$ sends each output back to the single input it came from.",
      },
      {
        kind: "fill",
        body: "A function that reaches every element of its codomain is ____.",
        options: ["injective", "constant", "surjective", "total"],
        answerIndex: 2,
        explanation: "Surjective means nothing in the codomain is missed.",
      },
      {
        kind: "mcq",
        body: "$f : \\{1,2,3\\} \\to \\{a,b\\}$ with $f(1)=a$, $f(2)=b$, $f(3)=b$. Which is true?",
        options: ["f is injective", "f is surjective", "f is bijective", "f is not a function"],
        answerIndex: 1,
        explanation: "Both $a$ and $b$ are reached, so it is surjective. It is not injective because 2 and 3 share an output.",
      },
    ],
  },
  {
    kind: "final",
    title: "Final check",
    blocks: [
      {
        kind: "mcq",
        body: "There is an injection from $X$ to $Y$. What follows?",
        options: ["|X| = |Y|", "|X| ≤ |Y|", "|X| ≥ |Y|", "Nothing about size"],
        answerIndex: 1,
        explanation: "Each element of $X$ takes up its own element of $Y$, so $Y$ has at least as many.",
      },
      {
        kind: "mcq",
        body: "Which function on the integers has an inverse?",
        options: ["x ↦ x²", "x ↦ x + 3", "x ↦ 0", "x ↦ |x|"],
        answerIndex: 1,
        explanation: "Adding 3 is undone by subtracting 3. The others send different inputs to the same output.",
      },
    ],
  },
];

export const seedCards: { front: string; back: string }[] = [
  { front: "Domain", back: "The set of inputs a function is defined on." },
  { front: "Codomain", back: "The set that outputs are allowed to land in." },
  { front: "Image", back: "The set of outputs a function actually reaches." },
  { front: "Total", back: "Every input has an output." },
  { front: "Single-valued", back: "No input has more than one output." },
  { front: "Injective", back: "Different inputs always give different outputs." },
  { front: "Surjective", back: "Every element of the codomain is an output." },
  { front: "Bijective", back: "Injective and surjective at once; the sets are paired off exactly." },
  { front: "Inverse function", back: "The function that undoes a bijection, sending each output back to its input." },
  { front: "Composition g ∘ f", back: "Apply f first, then g: (g ∘ f)(x) = g(f(x))." },
  { front: "Identity function", back: "Sends every element to itself." },
  { front: "Countable set", back: "A set that can be paired off with a subset of the natural numbers." },
];

export const seedQuestions: {
  topic: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  hint: string;
  explanation: string;
}[] = [
  {
    topic: "Definition",
    prompt: "Which rule on the real numbers is **not** a function?",
    options: ["x ↦ x²", "x ↦ a number whose square is x", "x ↦ 7", "x ↦ x + 1"],
    answerIndex: 1,
    hint: "Check that every input has exactly one output.",
    explanation: "Negative x has no real square root and positive x has two, so the rule is neither total nor single-valued.",
  },
  {
    topic: "Definition",
    prompt: "For $f(x) = x^2$ on $\\{-1, 0, 1\\}$, what is the image?",
    options: ["{-1, 0, 1}", "{0, 1}", "{1}", "{0, 1, 2}"],
    answerIndex: 1,
    hint: "Compute each output and collect the distinct values.",
    explanation: "The outputs are 1, 0 and 1, so the image is {0, 1}.",
  },
  {
    topic: "Composition",
    prompt: "If $f(x) = x + 1$ and $g(x) = 2x$, what is $(g \\circ f)(3)$?",
    options: ["7", "8", "6", "9"],
    answerIndex: 1,
    hint: "Apply f first.",
    explanation: "f(3) = 4, then g(4) = 8.",
  },
  {
    topic: "Composition",
    prompt: "Composing any function $f$ with the identity gives",
    options: ["the identity", "f", "the inverse of f", "a constant function"],
    answerIndex: 1,
    hint: "The identity changes nothing.",
    explanation: "The identity leaves every element alone, so the composite is f itself.",
  },
  {
    topic: "Injections and surjections",
    prompt: "A function from a 4-element set to a 3-element set can never be",
    options: ["surjective", "injective", "total", "single-valued"],
    answerIndex: 1,
    hint: "Four inputs, three places to land.",
    explanation: "With more inputs than outputs, two inputs must share an output.",
  },
  {
    topic: "Injections and surjections",
    prompt: "A bijection between two finite sets shows that they",
    options: ["are equal", "have the same number of elements", "are both empty", "are both countable only"],
    answerIndex: 1,
    hint: "Think of pairing elements off.",
    explanation: "A bijection pairs every element of one set with exactly one of the other.",
  },
];

export const seedReplies = [
  "Going by this lesson: a function needs every input to have exactly one output. Two inputs can share an output, which is why squaring is still a function.",
  "The short version is that injective is about inputs not colliding, and surjective is about nothing in the codomain being missed.",
  "This is sample text. Once sign-in is connected, answers here will come from the model and be based on your source.",
];

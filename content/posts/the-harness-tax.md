+++
title = "The Harness Tax"
date = 2026-11-09T03:00:00Z
draft = false
description = "Same model, same six coding jobs, two agent harnesses: pi's median run cost 29% less, Claude Code's code graded slightly better, and none of the gaps met our bar."
tags = ["agents", "llm", "evals"]
categories = ["research"]
images = ["/harness-tax/hook.png"]
+++

_Updated Nov 10, 2026: the changes since launch are listed at the end._

We ran Claude Code and pi, a minimal open-source coding agent, on the same model and the same six coding jobs.
pi's median run cost 29% less and was a bit faster.
Claude Code's code graded slightly better.
None of these gaps met the bar we set before running.

The two differ only in the harness: the system prompt, the tools and the loop around the model.
On a typical run, Claude Code's first model call sends about 27k tokens, and pi's sends about 3k.
We call the cost of resending a harness's setup text on every step the harness tax.
Claude Code's is far bigger than pi's.
A prompt cache cuts the price of rereading that text to a twentieth.
But an agent takes many steps.
We ran each harness three times on every task, to see how big the tax is.
Three of the six tasks are real bug fixes from open-source projects.
The other three are synthetic: a Claude agent wrote them for this study.

[![Three-panel comic: two stick figures run the same model on the same coding job. Claude Code carries a 27k-token backpack of prompt, tools and task, and pi a 3k one. A toll booth makes them reread the whole bag on every step, but cached rereads are 95% off.](/harness-tax/hook.png)](/harness-tax/)

Every one of the 36 runs passed every hidden test, tests the agents never saw.
So the tests couldn't pick a winner.
Claude Code's code got slightly better blind grades: 9.6 against 9.0 out of 10.
The graders, fresh Claude Opus 5.5 sessions, didn't know which harness wrote each diff.
Our bar for cost and speed: a side had to be at least 15% lower on the median run.
It also had to be lower on at least 5 of the 6 tasks.
On cost, pi was lower on only 4. On speed, it was faster on only 3.

The main graders were the same model as the agents.
So two other models re-graded the 18 diffs we still had, half of the total.
We lost the other run folders.
GPT-6.1 Sol Pro also put Claude Code slightly ahead, and Gemini 4 Argon called it a tie.
The small quality lead depends on which model grades.

One caveat on cost: the runs shared a prompt cache.
So most Claude Code runs started with their big prompt already cached.
Suppose instead every run had a cold start, with nothing cached on its first call.
Then pi's median run would have cost about a third less. pi would also have been cheaper on 5 of 6 tasks.
That clears our bar.
We still score what the runs actually paid, so the official result stays a miss.

After launch, Gagan ([@gagu_sh](https://x.com/gagu_sh/status/2119899741223842074)) suggested two checks that cost less than a model grader, and we ran both.
On two tasks, we ran property tests, which throw thousands of random inputs at the code.
The graders had marked down 5 diffs on those tasks for correctness. 4 of them failed the property tests, and the tests found no bug the graders had missed.
We wrote the tests after reading the graders' notes, so they looked where the graders had looked.
A count of lines changed beyond the project's own fix found nothing the graders missed either.
We expected straying from the fix to signal a worse diff. It went the other way: the diffs that went furthest beyond the fix were among the best graded.

Others got there first. [HarnessTax](https://harnesstax.github.io/), from UC Berkeley and Arena, is a much bigger study that found the same cost pattern.
[@sambharia's](https://x.com/sambharia/status/2043703343453987133) April post of the same name traces where Claude Code's tokens go.
What this one adds is a blind grade of the code itself, not just of whether the tests pass.
It also lets you replay every run.

[Read the full write-up and replay every run →](/harness-tax/)

**Changes since launch**

- Nov 9, 2026: GPT-6.1 Sol Pro re-graded the diffs we still had.
- Nov 9: credited earlier work on the same question.
- Nov 9: made the page easier to read. Credited Gagan, who suggested two checks that cost less than a model grader.
- Nov 9: added Gemini 4 Argon as a third grader.
- Nov 10: ran both of Gagan's checks, property tests and a count of lines changed beyond the project's own fix.
- Nov 10: saved the smallest failing inputs as plain tests, as Gagan suggested next.
- Nov 10: a second review found we had overstated how well the property tests matched the graders. We had also left out that runs shared a prompt cache. Both are fixed. We also made the post easier to read and gave the comic a real punch line.

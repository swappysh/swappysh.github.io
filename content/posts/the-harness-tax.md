+++
title = "The Harness Tax"
date = 2026-11-09T03:00:00Z
draft = false
description = "Same model, same coding jobs, two agent harnesses: what Claude Code and pi cost, how fast they ran, and how good the code was."
tags = ["agents", "llm", "evals"]
categories = ["research"]
images = ["/harness-tax/hook.png"]
+++

_Updated Nov 10, 2026: the changes since launch are listed at the end._

Claude Code and pi can run the same model on the same coding job.
What differs is the harness: the system prompt, the tools and the loop around the model.
On a typical run, Claude Code's first model call sends about 27k tokens, and pi's sends about 3k.
The harness resends that text on every step, and we call the extra cost the harness tax.
A prompt cache makes each resend cost a twentieth of the normal price, but an agent takes many steps.
We ran both on six Python tasks, three times each, to see how big the tax is.
Three tasks are real bug fixes from open-source projects, and three are synthetic.

[![Three-panel comic: two stick figures run the same model on the same coding job. Claude Code carries a 27k-token backpack of prompt, tools and task, and pi a 3k one. A toll booth makes them reread the whole bag on every step, but rereads are 95% off.](/harness-tax/hook.png)](/harness-tax/)

The short version: every one of the 36 runs passed every hidden test, so the tests couldn't pick a winner.
pi's median run cost 29% less, and it was a bit faster.
Claude Code's code got slightly better blind grades (graders scored the code without knowing which harness wrote it): 9.6 against 9.0 out of 10.
None of these gaps met the bar we set before running.
For cost and speed, a side had to be at least 15% lower on the median run and lower on at least 5 of the 6 tasks.
On cost, pi was lower on only 4.

The main graders were Claude Opus 5.5, the same model as the agents.
So two other models re-graded the half of the diffs we still had.
GPT-6.1 Sol Pro also put Claude Code slightly ahead, and Gemini 4 Argon called it a tie.
The small quality lead depends on which model grades.

One caveat on cost: the runs shared a prompt cache, so most Claude Code runs started with their big prompt already cached.
If every run had started with an empty cache, pi's median run would have cost about a third less, and pi would have been cheaper on 5 of 6 tasks.
That clears our bar.

After launch, Gagan ([@gagu_sh](https://x.com/gagu_sh/status/2119899741223842074)) suggested two cheaper checks, and we ran both.
On the two tasks we could test, we ran property tests, which throw thousands of random inputs at the code.
They failed 4 of the 5 diffs the graders had marked down for correctness, and found no bug the graders had missed.
We wrote them after reading the graders' notes, so they looked where the graders had looked.
A count of lines changed beyond the project's own fix found nothing the graders missed either.
We expected straying from the fix to signal a worse diff. It went the other way: the diffs that went furthest beyond the fix were among the best graded.

Others got there first. [HarnessTax](https://harnesstax.github.io/), from UC Berkeley and Arena, is a much bigger study that found the same cost pattern, and [@sambharia's](https://x.com/sambharia/status/2043703343453987133) April post of the same name traces where Claude Code's tokens go.
What this one adds is a blind grade of the code itself, not just whether the tests pass, and a replay of every run.

[Read the full write-up and replay every run →](/harness-tax/)

**Changes since launch**

- Nov 9, 2026: GPT-6.1 Sol Pro re-graded the diffs we still had.
- Nov 9: credited earlier work on the same question.
- Nov 9: made the page easier to read, and credited Gagan, who suggested two checks that cost less than a model grader.
- Nov 9: added Gemini 4 Argon as a third grader.
- Nov 10: ran both of Gagan's checks, property tests and a count of lines changed beyond the project's own fix.
- Nov 10: a second review found we had overstated how well the property tests matched the graders, and had left out that runs shared a prompt cache. Both are fixed. We also made the post easier to read and gave the comic a real punch line.

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
We ran both on six Python tasks, three times each, to see what that costs.

[![Three-panel comic: two stick figures run the same model on the same coding job. Claude Code carries a 27k-token backpack of prompt, tools and task, and pi a 3k one, and a toll charges for rereading the bag on every step.](/harness-tax/hook.png)](/harness-tax/)

The short version: pi's median run cost 29% less, and Claude Code's code got slightly better blind grades (graders scored the code without seeing which harness wrote it).
Neither lead met the bar we set before running: pi was cheaper on only 4 of 6 tasks, and the grade gap was 0.6 points, short of a full point.
The blind graders were Claude Opus 5.5, so a non-Claude model, GPT-6.1 Sol Pro, later re-graded the half of the diffs we could still recover. It graded harder but also put Claude Code slightly ahead (8.6 vs 8.3). Averaged with Opus on those same diffs, the score is 8.9 vs 8.6.
A second outside grader, Gemini 4 Argon, called those diffs a tie (9.1 each). Averaged over all three graders, the score is 9.0 vs 8.8.
pi was also a bit faster, again short of the bar.
Every one of the 36 runs passed every hidden test.
After launch, Gagan ([@gagu_sh](https://x.com/gagu_sh/status/2119899741223842074)) suggested two cheaper checks, and we ran both.
Hypothesis property tests failed the same four diffs the graders had marked down, and found nothing new.
A count of lines changed outside the task pointed the wrong way: the diffs that changed the most outside the upstream fix were the most correct.

Bigger studies came first and found the same cost pattern: [HarnessTax](https://harnesstax.github.io/) from UC Berkeley and Arena, and [@sambharia's](https://x.com/sambharia/status/2043703343453987133) April post of the same name.
What this one adds is a blind grade of the code itself, not just whether the tests pass, and a replay of every run.

[Read the full write-up and replay every run →](/harness-tax/)

**Changes since launch**

- Nov 9, 2026: GPT-6.1 Sol Pro re-graded the diffs we could still recover.
- Nov 9: credited earlier work on the same question.
- Nov 9: made the page easier to read, and credited Gagan for suggesting structural signals.
- Nov 9: added Gemini 4 Argon as a third grader.
- Nov 10: ran Gagan's two suggestions, property tests and a count of lines changed outside the task.

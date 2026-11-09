+++
title = "The Harness Tax"
date = 2026-11-09T03:00:00Z
draft = false
description = "Same model, same coding jobs, two agent harnesses: what Claude Code and pi cost, how fast they ran, and how good the code was."
tags = ["agents", "llm", "evals"]
categories = ["research"]
+++

Claude Code and pi can run the same model on the same coding job. What differs is the harness: the
system prompt, the tools and the loop around the model. Claude Code sends about 27k tokens of
instructions with every step, and pi sends about 3k. We ran both on six Python tasks, three times
each, to see what that costs.

The short version: pi's median run cost 29% less and Claude Code's code got slightly better blind
grades, but neither gap cleared the bar we set before running. Every one of the 36 runs passed every
hidden test.

[Read the full write-up and replay every run →](/harness-tax/)

![The Harness Tax comic: same model, different backpacks](/harness-tax/hook.png)
